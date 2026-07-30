// tests.js — unit tests for the scoring utility, schema validation, and label
// parsing. Runs in the browser: open tests/tests.html from a local server.

import { scoreProduct, nutrientLevel, labelForScore, BASE_SCORE } from '../js/scoring.js';
import { validateAnalysis, emptyAnalysis } from '../js/schema.js';
import { splitIngredients, parseNutrition, detectAllergens, analyzeProduct, analyzeIngredient, dietFlags, wholeGrainFirst } from '../js/analyzer.js';
import { lookupIngredient } from '../js/ingredients-db.js';
import { DEMO_PRODUCTS } from '../js/demo-data.js';
import { monthKey, getScanUsage, incrementScanUsage, FREE_SCANS_PER_MONTH } from '../js/store.js';
import { buildShareText } from '../js/views/report.js';

const results = [];
function test(name, fn) {
  try {
    fn();
    results.push({ name, ok: true });
  } catch (err) {
    results.push({ name, ok: false, error: err.message });
  }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }
function assertEq(actual, expected, msg) {
  if (actual !== expected) throw new Error(`${msg || 'assertEq'}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

// ——— scoring ———

test('score starts at BASE_SCORE with no data', () => {
  const r = scoreProduct({}, []);
  assertEq(r.score, BASE_SCORE, 'score');
  assertEq(r.confidence, 'low', 'confidence with no data');
});

test('high added sugar subtracts 1.5', () => {
  const r = scoreProduct({ addedSugarGrams: 14 }, []);
  const adj = r.adjustments.find((a) => a.reason.includes('added sugar'));
  assert(adj, 'has sugar adjustment');
  assertEq(adj.delta, -1.5, 'sugar delta');
});

test('good fiber adds points', () => {
  const r = scoreProduct({ fiberGrams: 5 }, []);
  const adj = r.adjustments.find((a) => a.reason.toLowerCase().includes('fiber'));
  assert(adj && adj.delta > 0, 'fiber adjustment positive');
});

test('score is clamped to [1,10]', () => {
  const bad = scoreProduct({ addedSugarGrams: 30, sodiumMg: 900, saturatedFatGrams: 10, calories: 600 },
    Array.from({ length: 20 }, (_, i) => ({ name: `x${i}`, category: 'Preservative', concernLevel: 'high' })));
  assert(bad.score >= 1, `lower clamp (got ${bad.score})`);
  const good = scoreProduct({ addedSugarGrams: 0, sodiumMg: 10, fiberGrams: 9, proteinGrams: 15 }, []);
  assert(good.score <= 10, `upper clamp (got ${good.score})`);
});

test('preference adjustments are marked personalized', () => {
  const r = scoreProduct({ addedSugarGrams: 14 }, [], { lowerSugar: true });
  const pers = r.adjustments.filter((a) => a.personalized);
  assert(pers.length === 1, 'exactly one personalized adjustment');
});

test('missing nutrition lowers confidence, unknown ≠ zero', () => {
  const partial = scoreProduct({ calories: 150, addedSugarGrams: null, sodiumMg: null, saturatedFatGrams: null, fiberGrams: null, proteinGrams: null }, [{ name: 'Oats', category: 'Common food ingredient', concernLevel: 'low' }]);
  assert(partial.confidence !== 'high', 'confidence reduced');
  assert(!partial.adjustments.some((a) => a.reason.includes('null')), 'no null-based adjustments');
});

test('nutrientLevel thresholds', () => {
  assertEq(nutrientLevel('addedSugarGrams', 14), 'high');
  assertEq(nutrientLevel('addedSugarGrams', 8), 'moderate');
  assertEq(nutrientLevel('addedSugarGrams', 2), 'low');
  assertEq(nutrientLevel('sodiumMg', 480), 'high');
  assertEq(nutrientLevel('fiberGrams', 5), 'high');
  assertEq(nutrientLevel('fiberGrams', null), 'unknown');
});

test('labelForScore bands', () => {
  assertEq(labelForScore(8.5), 'Strong choice');
  assertEq(labelForScore(6.2), 'Reasonable choice');
  assertEq(labelForScore(4.9), 'Consider occasionally');
  assertEq(labelForScore(2), 'Compare alternatives');
});

// ——— schema ———

test('emptyAnalysis validates', () => {
  const r = validateAnalysis(emptyAnalysis());
  assert(r.ok, `should validate: ${r.errors.join('; ')}`);
});

test('rejects non-object', () => {
  assert(!validateAnalysis(null).ok, 'null');
  assert(!validateAnalysis([]).ok, 'array');
  assert(!validateAnalysis('x').ok, 'string');
});

test('rejects out-of-range score and confidence', () => {
  const bad = { ...emptyAnalysis(), overallScore: 12 };
  assert(!validateAnalysis(bad).ok, 'score 12 rejected');
  const bad2 = { ...emptyAnalysis(), confidence: 2 };
  assert(!validateAnalysis(bad2).ok, 'confidence 2 rejected');
});

test('rejects bad ingredient category and concern level', () => {
  const base = emptyAnalysis();
  const ing = {
    name: 'X', category: 'Scary chemical', purpose: '', plainLanguageExplanation: '',
    evidenceSummary: '', whoShouldPayAttention: '', concernLevel: 'low',
  };
  assert(!validateAnalysis({ ...base, ingredients: [ing] }).ok, 'bad category rejected');
  assert(!validateAnalysis({ ...base, ingredients: [{ ...ing, category: 'Other', concernLevel: 'terrifying' }] }).ok, 'bad concernLevel rejected');
});

test('rejects more than 5 key findings', () => {
  const bad = { ...emptyAnalysis(), keyFindings: ['a', 'b', 'c', 'd', 'e', 'f'] };
  assert(!validateAnalysis(bad).ok, '6 findings rejected');
});

test('rejects fabricated non-numeric nutrition', () => {
  const bad = { ...emptyAnalysis(), nutrition: { ...emptyAnalysis().nutrition, sodiumMg: 'lots' } };
  assert(!validateAnalysis(bad).ok, 'string sodium rejected');
});

// ——— parsing ———

test('splitIngredients respects parentheses', () => {
  const items = splitIngredients('Ingredients: whole grain oats, sugar, BHT (to preserve freshness), salt.');
  assertEq(items.length, 4, 'item count');
  assert(items[2].toLowerCase().startsWith('bht'), 'parenthetical kept with its item');
});

test('splitIngredients strips Contains statement', () => {
  const items = splitIngredients('Ingredients: oats, honey. Contains: Tree nuts.');
  assert(!items.some((i) => /contains/i.test(i)), 'contains statement removed');
});

test('splitIngredients drops allergen advisory statements mid-text', () => {
  const items = splitIngredients('Ingredients: oats, honey. Contains: Tree nuts. May contain peanuts.');
  assertEq(items.length, 2, `only real ingredients (got ${JSON.stringify(items)})`);
});

test('parseNutrition serving size stops at sentence end', () => {
  const n = parseNutrition('Serving size: 1 cup (39 g). Calories 150.');
  assertEq(n.servingSize, '1 cup (39 g)', 'serving size trimmed');
});

test('parseNutrition reads the demo cereal label', () => {
  const n = parseNutrition(DEMO_PRODUCTS[0].nutritionText);
  assertEq(n.calories, 150, 'calories');
  assertEq(n.addedSugarGrams, 14, 'added sugar');
  assertEq(n.sodiumMg, 190, 'sodium');
  assertEq(n.fiberGrams, 1, 'fiber');
  assertEq(n.proteinGrams, 2, 'protein');
  assertEq(n.saturatedFatGrams, 0.5, 'sat fat');
});

test('parseNutrition leaves unreadable fields null', () => {
  const n = parseNutrition('Calories 100. Protein 3 g.');
  assertEq(n.addedSugarGrams, null, 'sugar null');
  assertEq(n.sodiumMg, null, 'sodium null');
});

test('detectAllergens finds tree nuts and wheat, not false positives', () => {
  const found = detectAllergens('whole grain oats, almonds, wheat flour');
  assert(found.includes('Tree nuts'), 'tree nuts');
  assert(found.includes('Wheat'), 'wheat');
  assert(!found.includes('Fish'), 'no fish');
});

test('detectAllergens does not flag "eggplant" as containing eggs', () => {
  const found = detectAllergens('eggplant, olive oil, garlic');
  assert(!found.includes('Eggs'), 'eggplant should not trigger Eggs');
});

test('detectAllergens does not flag dairy-free "butter" compounds as milk', () => {
  const found = detectAllergens('cocoa butter, peanut butter, shea butter');
  assert(!found.includes('Milk'), 'cocoa/peanut/shea butter should not trigger Milk');
  assert(found.includes('Peanuts'), 'peanut butter should still trigger Peanuts');
});

test('detectAllergens does not flag plant milks as dairy', () => {
  const found = detectAllergens('oat milk, almond milk, coconut milk');
  assert(!found.includes('Milk'), 'plant milks should not trigger Milk');
  assert(found.includes('Tree nuts'), 'almond/coconut milk should still trigger Tree nuts');
});

test('detectAllergens still finds real dairy milk', () => {
  const found = detectAllergens('whole milk, cream, butter');
  assert(found.includes('Milk'), 'real dairy should trigger Milk');
});

// ——— ingredient lookup precision ———

test('lookupIngredient uses word boundaries (graham ≠ ham, collard ≠ lard)', () => {
  const graham = lookupIngredient('graham cracker crumbs');
  assert(!graham || graham.name !== 'Meat / poultry ingredient', 'graham not meat');
  const collard = lookupIngredient('collard greens');
  assert(!collard || collard.name !== 'Meat / poultry ingredient', 'collard not lard');
  assertEq(lookupIngredient('chicken broth').name, 'Meat / poultry ingredient', 'chicken broth is meat');
});

test('cocoa butter is a plant fat, not dairy', () => {
  const entry = lookupIngredient('cocoa butter');
  assertEq(entry.name, 'Plant butter (cocoa/shea)', 'cocoa butter entry');
  assert(!entry.allergen, 'no milk allergen');
  const dairy = lookupIngredient('butter');
  assertEq(dairy.name, 'Butter / dairy fat', 'plain butter still dairy');
});

test('longer alias still wins with boundary matching', () => {
  assertEq(lookupIngredient('corn syrup').name, 'Syrup / refined sweetener', 'corn syrup');
  assertEq(lookupIngredient('milled corn').name, 'Corn', 'plain corn');
});

// ——— diet flags ———

test('dietFlags detects vegetarian/vegan/gluten conflicts', () => {
  const ings = ['gelatin', 'honey', 'barley malt extract', 'whole grain oats'].map(analyzeIngredient);
  const flags = dietFlags(ings);
  assert(flags.nonVegetarian.includes('Gelatin'), 'gelatin non-vegetarian');
  assert(flags.nonVegan.includes('Honey'), 'honey non-vegan');
  assert(flags.nonVegan.includes('Gelatin'), 'non-veg implies non-vegan');
  assert(!flags.nonVegetarian.includes('Honey'), 'honey is vegetarian');
  assert(flags.glutenSources.includes('Barley / malt'), 'malt is a gluten source');
});

test('vegan preference penalizes animal ingredients (personalized)', () => {
  const ings = ['gelatin', 'sugar'].map(analyzeIngredient);
  const r = scoreProduct({}, ings, { vegan: true });
  const adj = r.adjustments.find((a) => a.reason.includes('vegan'));
  assert(adj && adj.personalized && adj.delta < 0, 'personalized vegan penalty');
});

// ——— label-trick heuristics ———

test('scoring flags multiple sweetener names and top-3 sweetener', () => {
  const ings = ['sugar', 'corn syrup', 'oats', 'honey', 'salt'].map(analyzeIngredient);
  const r = scoreProduct({}, ings, {});
  assert(r.adjustments.some((a) => a.reason.includes('first three')), 'top-3 sweetener penalty');
  assert(r.adjustments.some((a) => a.reason.includes('different names')), 'multi-name sweetener penalty');
});

test('whole grain first ingredient earns a bonus and a finding', () => {
  assert(wholeGrainFirst([analyzeIngredient('whole grain oats')]), 'detects whole grain');
  assert(!wholeGrainFirst([analyzeIngredient('sugar')]), 'sugar is not a whole grain');
  const r = scoreProduct({}, ['whole grain oats', 'honey'].map(analyzeIngredient), {});
  assert(r.adjustments.some((a) => a.reason.includes('Whole grain')), 'whole-grain bonus applied');
});

// ——— free-plan scan usage ———

test('monthKey formats as YYYY-MM', () => {
  assertEq(monthKey(new Date(2026, 6, 29)), '2026-07', 'july');
  assertEq(monthKey(new Date(2026, 11, 1)), '2026-12', 'december');
});

test('scan usage increments and resets across months', () => {
  const saved = localStorage.getItem('scanwise.usage.v1');
  try {
    localStorage.removeItem('scanwise.usage.v1');
    const july = new Date(2026, 6, 15);
    assertEq(getScanUsage(july).count, 0, 'starts at 0');
    incrementScanUsage(july);
    incrementScanUsage(july);
    assertEq(getScanUsage(july).count, 2, 'counts scans');
    assertEq(getScanUsage(july).remaining, FREE_SCANS_PER_MONTH - 2, 'remaining');
    const august = new Date(2026, 7, 1);
    assertEq(getScanUsage(august).count, 0, 'new month resets');
  } finally {
    if (saved === null) localStorage.removeItem('scanwise.usage.v1');
    else localStorage.setItem('scanwise.usage.v1', saved);
  }
});

// ——— share text ———

test('buildShareText includes score, findings, and disclaimer', () => {
  const { analysis, scoreDetail } = analyzeProduct(DEMO_PRODUCTS[0]);
  const text = buildShareText({ analysis, scoreDetail, productName: analysis.productName, demo: true });
  assert(text.includes('Morning Crunch Cereal'), 'product name');
  assert(text.includes(`${analysis.overallScore}/10`), 'score');
  assert(text.includes('not medical advice'), 'disclaimer');
  assert(text.includes('[fictional demo]'), 'demo marker');
});

test('buildShareText marks missing nutrition as n/a', () => {
  const { analysis } = analyzeProduct({ productName: 'X', ingredientsText: 'Ingredients: oats.' });
  const text = buildShareText({ analysis, productName: 'X' });
  assert(text.includes('added sugar n/a'), 'missing sugar shown as n/a, not invented');
});

// ——— end-to-end analyzer ———

for (const demo of DEMO_PRODUCTS) {
  test(`analyzeProduct(${demo.productName}) produces schema-valid output`, () => {
    const { analysis } = analyzeProduct(demo);
    const r = validateAnalysis(analysis);
    assert(r.ok, r.errors.join('; '));
    assert(analysis.keyFindings.length <= 5, 'max 5 findings');
  });
}

test('demo cereal scores below demo oat bar', () => {
  const cereal = analyzeProduct(DEMO_PRODUCTS[0]).analysis.overallScore;
  const bar = analyzeProduct(DEMO_PRODUCTS[1]).analysis.overallScore;
  assert(cereal < bar, `cereal ${cereal} should score below oat bar ${bar}`);
});

test('no fear-based language in analyzer output', () => {
  for (const demo of DEMO_PRODUCTS) {
    const { analysis } = analyzeProduct(demo);
    const blob = JSON.stringify(analysis).toLowerCase();
    for (const word of ['toxic', 'poison', 'dangerous']) {
      assert(!blob.includes(word), `"${word}" found in ${demo.productName} output`);
    }
  }
});

// ——— render ———

const passed = results.filter((r) => r.ok).length;
document.getElementById('summary').textContent = `${passed}/${results.length} tests passed`;
document.getElementById('summary').className = passed === results.length ? 'pass' : 'fail';
document.getElementById('results').innerHTML = results.map((r) =>
  `<li class="${r.ok ? 'pass' : 'fail'}">${r.ok ? '✓' : '✗'} ${r.name}${r.error ? ` — ${r.error}` : ''}</li>`).join('');
window.__testResults = { passed, total: results.length, failures: results.filter((r) => !r.ok) };
