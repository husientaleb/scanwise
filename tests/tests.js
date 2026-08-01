// tests.js — unit tests for the scoring utility, schema validation, and label
// parsing. Runs in the browser: open tests/tests.html from a local server.

import { scoreProduct, nutrientLevel, labelForScore, BASE_SCORE } from '../js/scoring.js';
import { validateAnalysis, emptyAnalysis } from '../js/schema.js';
import { splitIngredients, parseNutrition, detectAllergens, analyzeProduct, analyzeIngredient, dietFlags, wholeGrainFirst } from '../js/analyzer.js';
import { lookupIngredient } from '../js/ingredients-db.js';
import { normalizeBarcode, checkDigitValid, computeCheckDigit, expandUpcE } from '../js/barcode.js';
import { parseIngredientTree, flattenIngredientTree } from '../js/ingredient-parser.js';
import { normalizeIngredientName } from '../js/normalize.js';
import { scoreProductMatch } from '../js/matching.js';
import { statusForScore } from '../js/match-config.js';
import { reconcileFields, meaningfulConflicts } from '../js/reconcile.js';
import { calculateNutrition, percentDV, parseServingsPerContainer } from '../js/nutrition-calc.js';
import { mapOffProduct } from '../js/product-db.js';
import { detectCategory, thresholdsForCategory, CATEGORIES } from '../js/categories.js';
import { THRESHOLDS } from '../js/scoring.js';
import { analyzeClaims } from '../js/claims.js';
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

// ——— barcode engine ———

test('barcode check digits validate correctly', () => {
  assert(checkDigitValid('036000291452'), 'valid UPC-A accepted');
  assert(!checkDigitValid('036000291453'), 'wrong check digit rejected');
  assert(checkDigitValid('4006381333931'), 'valid EAN-13 accepted');
  assert(!checkDigitValid('4006381333932'), 'invalid EAN-13 rejected');
  assert(checkDigitValid('96385074'), 'valid EAN-8 accepted');
  assertEq(computeCheckDigit('03600029145'), 2, 'computed UPC-A check digit');
});

test('normalizeBarcode strips noise and reports format', () => {
  const r = normalizeBarcode(' 0 3600-029145 2 ');
  assertEq(r.normalized, '036000291452', 'digits only');
  assertEq(r.format, 'UPC-A', 'format');
  assert(r.valid, 'valid');
  assertEq(normalizeBarcode('12345').format, null, 'unsupported length flagged');
});

test('UPC-E expands to a valid UPC-A', () => {
  assertEq(expandUpcE('04252614'), '042100005264', 'zero-suppression expansion');
  assertEq(expandUpcE('99999999'), null, 'implausible UPC-E rejected');
});

// ——— hierarchical ingredient parser ———

test('nested sub-ingredients get their own records with parent links', () => {
  const { ingredients } = parseIngredientTree(
    'Whole grain oats, chocolate chips (cane sugar, chocolate liquor, cocoa butter, soy lecithin, vanilla extract), almonds, sea salt.');
  assertEq(ingredients.length, 4, 'four top-level ingredients');
  assertEq(ingredients[1].children.length, 5, 'five sub-ingredients');
  const flat = flattenIngredientTree(ingredients);
  assertEq(flat.length, 9, 'nine total records');
  const cocoaButter = flat.find((n) => n.labelName.toLowerCase() === 'cocoa butter');
  assertEq(cocoaButter.depth, 1, 'sub-ingredient depth');
  assertEq(flat[cocoaButter.parentIndex].labelName.toLowerCase(), 'chocolate chips', 'parent link');
});

test('parser handles double-nested parentheses', () => {
  const { ingredients } = parseIngredientTree('Filling (fruit paste (apples, pears), sugar), salt');
  const flat = flattenIngredientTree(ingredients);
  assert(flat.some((n) => n.labelName.toLowerCase() === 'apples' && n.depth === 2), 'depth-2 ingredient found');
});

test('"contains 2% or less" marks trailing ingredients', () => {
  const { ingredients } = parseIngredientTree('Oats, sugar. Contains 2% or less of: salt, natural flavor, BHT.');
  const flat = flattenIngredientTree(ingredients);
  const salt = flat.find((n) => n.labelName.toLowerCase() === 'salt');
  assert(salt && salt.twoPercentOrLess, '2%-or-less marker set');
  const oats = flat.find((n) => n.labelName.toLowerCase() === 'oats');
  assert(oats && !oats.twoPercentOrLess, 'earlier ingredients unmarked');
});

test('advisory statements are separated, not treated as ingredients', () => {
  const { ingredients, advisories } = parseIngredientTree(
    'Oats, honey. Contains: Tree nuts. May contain peanuts. Processed in a facility that also handles wheat.');
  assertEq(flattenIngredientTree(ingredients).length, 2, 'only real ingredients');
  assertEq(advisories.length, 3, 'three advisories captured');
  assert(advisories.some((a) => a.type === 'may_contain'), 'may-contain classified');
});

// ——— normalization ———

test('E-numbers normalize to specific entities', () => {
  const r = normalizeIngredientName('E322');
  assertEq(r.normalizedName, 'lecithins', 'E322');
  assert(r.confident, 'confident');
  assertEq(normalizeIngredientName('color (E129)').normalizedName, 'allura red (Red 40)', 'embedded E-number');
});

test('synonyms merge but distinctions survive', () => {
  assertEq(normalizeIngredientName('Ascorbic Acid').normalizedName, 'vitamin C', 'ascorbic acid');
  assertEq(normalizeIngredientName('HFCS').normalizedName, 'high fructose corn syrup', 'HFCS');
  // Nitrite and nitrate must never merge.
  const nitrite = normalizeIngredientName('sodium nitrite').normalizedName;
  const nitrate = normalizeIngredientName('sodium nitrate').normalizedName;
  assert(nitrite !== nitrate, 'nitrite ≠ nitrate');
  // Distinct B12 forms stay identifiable.
  assert(normalizeIngredientName('cyanocobalamin').normalizedName.includes('cyanocobalamin'), 'B12 form preserved');
});

test('unknown names keep original with unconfirmed normalization', () => {
  const r = normalizeIngredientName('Mystery Compound X');
  assertEq(r.normalizedName, 'Mystery Compound X', 'kept');
  assert(!r.confident, 'unconfirmed');
});

// ——— product matching ———

test('exact barcode + matching label scores confirmed', () => {
  const label = { barcode: '036000291452', productName: 'Crunchy Oat Squares', brand: 'Hillside', ingredientsText: 'oats, sugar, salt', nutrition: { calories: 150, sodiumMg: 190 } };
  const db = { ...label };
  const m = scoreProductMatch(label, db);
  assert(m.score >= 0.9, `high score (got ${m.score})`);
  assertEq(m.status, 'confirmed', 'confirmed status');
});

test('barcode hit with conflicting label is NOT auto-confirmed', () => {
  const label = { barcode: '036000291452', productName: 'Tomato Soup', brand: 'Hearth', ingredientsText: 'water, tomato paste, salt', nutrition: { calories: 90, sodiumMg: 480 } };
  const db = { barcode: '036000291452', productName: 'Chocolate Sandwich Cookies', brand: 'SweetCo', ingredientsText: 'sugar, flour, palm oil, cocoa', nutrition: { calories: 160, sodiumMg: 90 } };
  const m = scoreProductMatch(label, db);
  assert(m.score < 0.9, `not confirmed (got ${m.score})`);
});

test('barcode-only hit is never auto-confirmed', () => {
  const m = scoreProductMatch({ barcode: '036000291452' }, { barcode: '036000291452' });
  assertEq(m.status, 'needs_confirmation', 'requires user confirmation');
});

test('statusForScore bands', () => {
  assertEq(statusForScore(0.95).status, 'confirmed');
  assertEq(statusForScore(0.8).status, 'probable');
  assertEq(statusForScore(0.6).status, 'needs_confirmation');
  assertEq(statusForScore(0.2).status, 'unconfirmed');
});

// ——— reconciliation ———

test('label value wins over conflicting database value', () => {
  const recs = reconcileFields({ addedSugarGrams: 12 }, { addedSugarGrams: 10 });
  const r = recs.find((x) => x.field === 'addedSugarGrams');
  assertEq(r.selectedValue, 12, 'label wins');
  assertEq(r.selectedSource, 'package_label', 'source recorded');
  assert(r.conflict, 'conflict flagged');
  assert(meaningfulConflicts(recs).length >= 1, 'conflict surfaced');
});

test('database fills fields the label lacks; missing stays null', () => {
  const recs = reconcileFields({ addedSugarGrams: null, sodiumMg: null }, { addedSugarGrams: 8 });
  const sugar = recs.find((x) => x.field === 'addedSugarGrams');
  assertEq(sugar.selectedValue, 8, 'db fill');
  assertEq(sugar.selectedSource, 'product_database', 'db source recorded');
  const sodium = recs.find((x) => x.field === 'sodiumMg');
  assertEq(sodium.selectedValue, null, 'missing everywhere stays null, not zero');
  assertEq(sodium.selectedSource, 'unavailable', 'unavailable source');
});

test('close numeric values are not flagged as conflicts', () => {
  const recs = reconcileFields({ calories: 150 }, { calories: 155 });
  assert(!recs.find((x) => x.field === 'calories').conflict, '3% difference tolerated');
});

// ——— deterministic nutrition calculator ———

test('percentDV uses configurable constants', () => {
  assertEq(percentDV('sodiumMg', 460), 20, '460mg sodium = 20% DV');
  assertEq(percentDV('addedSugarGrams', 25), 50, '25g added sugar = 50% DV');
  assertEq(percentDV('sodiumMg', null), null, 'missing stays null');
});

test('per-container math needs servings, never invents them', () => {
  const calc = calculateNutrition({ calories: 150, sodiumMg: 190 }, { servingsPerContainer: 'about 4' });
  assertEq(calc.perContainer.calories, 600, 'per-container calories');
  assertEq(calc.servingsPerContainer, 4, 'parsed servings');
  const noServings = calculateNutrition({ calories: 150 });
  assertEq(noServings.perContainer, null, 'no servings → no per-container claims');
  assertEq(parseServingsPerContainer('varies'), null, 'unparseable → null');
});

test('calculations carry an audit trail', () => {
  const calc = calculateNutrition({ sodiumMg: 460 }, { servingsPerContainer: 2 });
  assert(calc.calculations.some((c) => c.id === 'dv_sodiumMg' && c.result === 20), 'DV calc recorded');
  assert(calc.calculations.some((c) => c.id === 'pkg_sodiumMg' && c.result === 920), 'per-container calc recorded');
});

// ——— category-aware scoring ———

test('detectCategory finds categories from names and tags', () => {
  assertEq(detectCategory('Morning Crunch Cereal').key, 'cereal', 'cereal from name');
  assertEq(detectCategory('Garden Tomato Soup').key, 'soup', 'soup from name');
  assertEq(detectCategory('Mystery Product').key, 'general', 'default general');
  assertEq(detectCategory('Choco Thing', ['hazelnut spread']).key, 'spread', 'category from db tags');
});

test('category thresholds override general bands and change judgments', () => {
  const soupT = thresholdsForCategory('soup', THRESHOLDS);
  assertEq(soupT.sodiumMg.high, 600, 'soup sodium band raised');
  assertEq(soupT.addedSugarGrams.high, THRESHOLDS.addedSugarGrams.high, 'unspecified keys fall back');
  // 480 mg sodium: high for a general product, moderate for soup.
  assertEq(nutrientLevel('sodiumMg', 480), 'high', 'general: high');
  assertEq(nutrientLevel('sodiumMg', 480, soupT), 'moderate', 'soup: moderate');
});

test('analyzer judges soup sodium by soup norms', () => {
  const { analysis, scoreDetail } = analyzeProduct(DEMO_PRODUCTS[2]); // Garden Tomato Soup, 480 mg
  assertEq(analysis.category.key, 'soup', 'category detected');
  assert(!scoreDetail.adjustments.some((adj) => adj.reason.startsWith('High sodium')), 'no high-sodium penalty under soup norms');
  assert(scoreDetail.adjustments.some((adj) => adj.reason.startsWith('Moderate sodium')), 'moderate-sodium note instead');
});

test('every category threshold override uses known keys', () => {
  for (const [key, def] of Object.entries(CATEGORIES)) {
    for (const tKey of Object.keys(def.thresholds)) {
      assert(THRESHOLDS[tKey], `${key}.${tKey} matches a real threshold key`);
    }
  }
});

// ——— marketing-claim analyzer ———

test('claims: "no added sugar" contradicted by the label', () => {
  const analysis = { nutrition: { addedSugarGrams: 12 }, ingredients: [] };
  const claims = analyzeClaims('No Added Sugar! All Natural', analysis);
  const sugar = claims.find((c) => c.id === 'no_added_sugar');
  assertEq(sugar.verdict, 'contradicted', 'contradicted');
  const natural = claims.find((c) => c.id === 'natural');
  assertEq(natural.verdict, 'marketing', 'natural is marketing language');
});

test('claims: low sodium checked against the regulated 140 mg bar', () => {
  const ok = analyzeClaims('Low sodium', { nutrition: { sodiumMg: 120 }, ingredients: [] })[0];
  assertEq(ok.verdict, 'supported', 'meets definition');
  const bad = analyzeClaims('Low sodium', { nutrition: { sodiumMg: 300 }, ingredients: [] })[0];
  assertEq(bad.verdict, 'contradicted', 'exceeds definition');
});

test('claims: gluten-free flagged when a gluten source is listed', () => {
  const analysis = { nutrition: {}, ingredients: [{ name: 'Barley / malt', rawName: 'malt extract', gluten: true }] };
  assertEq(analyzeClaims('Gluten-free', analysis)[0].verdict, 'contradicted', 'malt contradicts');
  assertEq(analyzeClaims('Gluten-free', { nutrition: {}, ingredients: [] })[0].verdict, 'regulated', 'otherwise regulated term');
});

test('claims: unverifiable when the label lacks the number', () => {
  const c = analyzeClaims('No added sugar', { nutrition: { addedSugarGrams: null }, ingredients: [] })[0];
  assertEq(c.verdict, 'unverifiable', 'missing data → unverifiable, not assumed');
});

// ——— product database mapping ———

test('OFF per-100g values derive per-serving only when serving size is known', () => {
  const withServing = mapOffProduct({
    code: '123', product_name: 'Test Spread', serving_size: '15 g',
    nutriments: { 'energy-kcal_100g': 539, 'sugars_100g': 56.3, 'sodium_100g': 0.0428 },
  }, '123');
  assertEq(withServing.nutrition.calories, 80.85, 'derived calories = 539 × 0.15');
  assertEq(withServing.nutritionBasis, 'derived_from_100g', 'basis flagged as derived');
  assertEq(withServing.nutrition.sodiumMg, 6, 'sodium g → mg');

  const noServing = mapOffProduct({
    code: '123', product_name: 'Test Spread',
    nutriments: { 'energy-kcal_100g': 539 },
  }, '123');
  assertEq(noServing.nutrition.calories, null, 'no serving size → no per-serving claim');
  assertEq(noServing.nutritionPer100g.calories, 539, 'per-100g kept separately');
});

test('OFF native per-serving values are preferred over derivation', () => {
  const p = mapOffProduct({
    code: '9', serving_size: '30 g',
    nutriments: { 'energy-kcal_serving': 120, 'energy-kcal_100g': 500 },
  }, '9');
  assertEq(p.nutrition.calories, 120, 'uses _serving directly');
});

// ——— pipeline integration through the analyzer ———

test('analyzer produces sub-ingredient records with hierarchy metadata', () => {
  const { analysis } = analyzeProduct({
    productName: 'Trail Bar',
    ingredientsText: 'Whole grain oats, chocolate chips (cane sugar, cocoa butter, soy lecithin), almonds, sea salt.',
  });
  assertEq(analysis.ingredients.length, 7, 'seven records including sub-ingredients');
  const lecithin = analysis.ingredients.find((i) => i.rawName.toLowerCase() === 'soy lecithin');
  assert(lecithin && lecithin.depth === 1, 'sub-ingredient has depth 1');
  assert(analysis.allergens.includes('Soy'), 'allergen from sub-ingredient');
  const r = validateAnalysis(analysis);
  assert(r.ok, `still schema-valid: ${r.errors.join('; ')}`);
});

test('analyzer normalizes E-numbers into known entries', () => {
  const { analysis } = analyzeProduct({ ingredientsText: 'Sugar, E322, salt.' });
  const lec = analysis.ingredients.find((i) => i.rawName === 'E322');
  assert(lec, 'E322 record exists');
  assertEq(lec.eNumber, 'E322', 'E-number preserved');
  assertEq(lec.name, 'Lecithin', 'resolved to knowledge-base entry via normalization');
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
