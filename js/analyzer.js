// analyzer.js — turns reviewed label text into a structured, schema-valid
// analysis. This is the local (no-API) pipeline: rule-based ingredient
// lookup, nutrition parsing, allergen detection, and transparent scoring.
// When the app is deployed with an AI key, /api/analyze can replace or
// enrich this output — both must satisfy validateAnalysis() in schema.js.

import { lookupIngredient, ALLERGEN_KEYWORDS, ALLERGEN_EXCLUSIONS } from './ingredients-db.js';
import { scoreProduct, nutrientLevel, THRESHOLDS } from './scoring.js';
import { validateAnalysis, emptyAnalysis } from './schema.js';
import { parseIngredientTree, flattenIngredientTree } from './ingredient-parser.js';
import { normalizeIngredientName } from './normalize.js';
import { detectCategory, thresholdsForCategory } from './categories.js';

/**
 * Flat list of every ingredient and sub-ingredient label name (advisory
 * statements excluded). Backed by the hierarchical parser; kept as the
 * simple entry point for callers that only need names.
 */
export function splitIngredients(text) {
  const { ingredients } = parseIngredientTree(text);
  return flattenIngredientTree(ingredients)
    .map((n) => n.labelName)
    .filter((s) => s.length > 1 && s.length < 120);
}

/**
 * Build a schema-shaped ingredient entry from raw label text.
 * @param {string} rawName  ingredient text as printed
 * @param {object} [meta]   parser metadata: { depth, parentIndex, order, twoPercentOrLess }
 */
export function analyzeIngredient(rawName, meta = {}) {
  // Normalize first (E-numbers, synonyms); look up under the label name,
  // then under the normalized entity ("E322" → "lecithins" → lecithin entry).
  const norm = normalizeIngredientName(rawName);
  const entry = lookupIngredient(rawName) || (norm.confident ? lookupIngredient(norm.normalizedName) : null);

  const base = {
    rawName,
    normalizedName: norm.normalizedName,
    normalizationConfirmed: norm.confident,
    eNumber: norm.eNumber,
    depth: meta.depth || 0,
    parentIndex: meta.parentIndex ?? null,
    twoPercentOrLess: meta.twoPercentOrLess || false,
  };

  if (entry) {
    return {
      ...base,
      name: entry.name,
      category: entry.category,
      purpose: entry.purpose,
      plainLanguageExplanation: entry.explanation,
      evidenceSummary: entry.evidence,
      whoShouldPayAttention: entry.attention,
      concernLevel: entry.concernLevel,
      allergen: entry.allergen || null,
      nonVeg: entry.nonVeg || false,
      nonVegan: entry.nonVegan || entry.nonVeg || false,
      gluten: entry.gluten || false,
      evidenceGrade: entry.evidenceGrade || null,
      regulatory: entry.regulatory || null,
      sources: entry.sources || null,
    };
  }
  return {
    ...base,
    name: rawName.replace(/\s*\(.*\)\s*/g, '').trim() || rawName,
    category: 'Other',
    purpose: 'Not identified — purpose unknown for this specific ingredient.',
    plainLanguageExplanation: `"${rawName}" is not in Ingrado's ingredient database yet. An unfamiliar or chemical-sounding name does not by itself mean an ingredient is unsafe — many safe ingredients have technical names.`,
    evidenceSummary: 'No specific evidence summary available for this ingredient.',
    whoShouldPayAttention: 'If you have specific dietary restrictions, verify this ingredient with the manufacturer or a reliable reference.',
    concernLevel: 'unknown',
    allergen: null,
    nonVeg: false,
    nonVegan: false,
    gluten: false,
    evidenceGrade: 'Unknown',
    regulatory: null,
    sources: null,
  };
}

/**
 * Diet-compatibility flags from the matched ingredient entries. Only asserts
 * what the database knows — unknown ingredients never produce a "suitable"
 * claim, which is why the report words this as "nothing flagged" rather than
 * "vegan-friendly".
 */
export function dietFlags(ingredients) {
  const uniq = (arr) => [...new Set(arr)];
  return {
    nonVegetarian: uniq(ingredients.filter((i) => i.nonVeg).map((i) => i.name)),
    nonVegan: uniq(ingredients.filter((i) => i.nonVegan).map((i) => i.name)),
    glutenSources: uniq(ingredients.filter((i) => i.gluten).map((i) => i.name)),
  };
}

/** True when the raw first-ingredient text names a whole grain. */
export function wholeGrainFirst(ingredients) {
  const first = ingredients[0]?.rawName?.toLowerCase() || '';
  return /whole\s(grain|wheat|oat|rye|corn)|whole-grain|oats\b|rolled oats|brown rice|quinoa|buckwheat|millet/.test(first);
}

/** Detect the 9 major allergens from a full text blob (ingredients + contains statement). */
export function detectAllergens(text) {
  const lower = (text || '').toLowerCase();
  const found = [];
  for (const [allergen, words] of Object.entries(ALLERGEN_KEYWORDS)) {
    // Strip known dairy-free compounds (e.g. "cocoa butter") before matching
    // generic keywords (e.g. "butter") so they don't false-positive.
    let scoped = lower;
    for (const phrase of ALLERGEN_EXCLUSIONS[allergen] || []) {
      scoped = scoped.split(phrase).join(' ');
    }
    // Allow a trailing plural "s" (almond -> almonds) before the boundary.
    if (words.some((w) => new RegExp(`(^|[^a-z])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:s?(?:[^a-z]|$))`, 'i').test(scoped))) {
      found.push(allergen);
    }
  }
  return found;
}

const NUTRITION_PATTERNS = {
  servingSize: /serving\s*size\s*[:\-]?\s*([^\n,;]+?)(?:\.(?:\s|$)|[\n,;]|$)/i,
  calories: /calories\s*[:\-]?\s*(\d+)/i,
  addedSugarGrams: /(?:incl(?:udes|\.)?\s*)?(\d+(?:\.\d+)?)\s*g\s*(?:of\s*)?added\s*sugars?|added\s*sugars?\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*g/i,
  sodiumMg: /sodium\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*mg/i,
  saturatedFatGrams: /saturated\s*fat\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*g/i,
  fiberGrams: /(?:dietary\s*)?fib(?:er|re)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*g/i,
  proteinGrams: /protein\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*g/i,
};

/** Parse nutrition facts text. Unreadable fields stay null — never invented. */
export function parseNutrition(text) {
  const result = {
    servingSize: '',
    calories: null,
    addedSugarGrams: null,
    sodiumMg: null,
    saturatedFatGrams: null,
    fiberGrams: null,
    proteinGrams: null,
  };
  if (!text) return result;
  for (const [key, pattern] of Object.entries(NUTRITION_PATTERNS)) {
    const m = text.match(pattern);
    if (!m) continue;
    if (key === 'servingSize') {
      result.servingSize = m[1].trim();
    } else {
      const num = parseFloat(m[1] ?? m[2]);
      if (!Number.isNaN(num)) result[key] = num;
    }
  }
  return result;
}

function buildKeyFindings(nutrition, ingredients, allergens, T = THRESHOLDS) {
  const findings = [];
  const lvl = (k) => nutrientLevel(k, nutrition[k], T);

  if (lvl('addedSugarGrams') === 'high') {
    findings.push(`High added sugar: ${nutrition.addedSugarGrams} g per serving. This is a meaningful amount, especially if you eat more than one serving.`);
  }
  const sweeteners = [...new Set(ingredients.filter((i) => i.category === 'Sweetener').map((i) => (i.rawName || i.name).toLowerCase()))];
  if (sweeteners.length >= 3) {
    findings.push(`Sweeteners under ${sweeteners.length} different names (${sweeteners.join(', ')}) — splitting sugar across names moves each one lower on the list.`);
  }
  if (lvl('sodiumMg') === 'high') {
    findings.push(`High sodium: ${nutrition.sodiumMg} mg per serving — about ${Math.round((nutrition.sodiumMg / 2300) * 100)}% of the daily guideline for most adults.`);
  }
  if (lvl('saturatedFatGrams') === 'high') {
    findings.push(`High saturated fat: ${nutrition.saturatedFatGrams} g per serving. Most guidelines suggest moderating saturated fat across the day.`);
  }
  if (lvl('fiberGrams') === 'high') {
    findings.push(`Excellent source of fiber: ${nutrition.fiberGrams} g per serving supports digestion and fullness.`);
  } else if (lvl('fiberGrams') === 'moderate') {
    findings.push(`Good source of fiber: ${nutrition.fiberGrams} g per serving.`);
  }
  if (lvl('proteinGrams') === 'high') {
    findings.push(`High protein: ${nutrition.proteinGrams} g per serving helps with satiety.`);
  }
  if (wholeGrainFirst(ingredients)) {
    findings.push(`Whole grain listed first: ingredient lists are ordered by weight, so a whole grain leading the list is a good sign.`);
  }
  if (allergens.length) {
    findings.push(`Contains major allergen${allergens.length > 1 ? 's' : ''}: ${allergens.join(', ')}. Always verify the package if you have a food allergy.`);
  }
  const additiveCount = ingredients.filter((i) =>
    ['Preservative', 'Color', 'Emulsifier', 'Sweetener'].includes(i.category)).length;
  if (ingredients.length >= 15 && additiveCount >= 5) {
    findings.push(`Highly processed profile: ${ingredients.length} ingredients including ${additiveCount} additives. Processing level is one signal among many — nutrition numbers matter too.`);
  } else if (ingredients.length > 0 && ingredients.length <= 6) {
    findings.push(`Short ingredient list: just ${ingredients.length} recognizable ingredients.`);
  }
  return findings.slice(0, 5);
}

function buildAlternativeGuidance(nutrition, ingredients, prefs = {}, T = THRESHOLDS, categoryLabel = null) {
  const guidance = [];
  const lvl = (k) => nutrientLevel(k, nutrition[k], T);
  const category = categoryLabel ? `another ${categoryLabel.toLowerCase()}` : 'a similar product';

  if (lvl('addedSugarGrams') === 'high' || (prefs.lowerSugar && lvl('addedSugarGrams') !== 'low')) {
    guidance.push(`Look for ${category} with no more than ${T.addedSugarGrams.moderate} g of added sugar per serving — this one has ${nutrition.addedSugarGrams} g.`);
  }
  if (lvl('sodiumMg') === 'high' || (prefs.lowerSodium && lvl('sodiumMg') !== 'low')) {
    guidance.push(`Compare sodium lines and aim for under ${T.sodiumMg.moderate} mg per serving; "reduced sodium" versions often cut it by a quarter or more.`);
  }
  if (nutrition.fiberGrams !== null && nutrition.fiberGrams < T.fiberGrams.good) {
    guidance.push(`Choose an option with at least ${T.fiberGrams.good} g of fiber per serving — whole-grain-first ingredient lists are a good signal.`);
  }
  if (prefs.higherProtein && lvl('proteinGrams') !== 'high') {
    guidance.push(`For your higher-protein goal, look for at least ${T.proteinGrams.excellent} g of protein per serving.`);
  }
  if (ingredients.some((i) => i.name === 'Synthetic food dye')) {
    guidance.push('Prefer to skip synthetic dyes? Look for products colored with fruit or vegetable extracts (annatto, turmeric, beet juice) or no color at all.');
  }
  if (ingredients.length >= 15) {
    guidance.push('A similar product with a shorter ingredient list will usually be less processed — compare a few labels side by side.');
  }
  if (lvl('saturatedFatGrams') === 'high') {
    guidance.push(`Look for a version with under ${T.saturatedFatGrams.moderate} g saturated fat per serving.`);
  }
  if (guidance.length === 0) {
    guidance.push('This profile already looks reasonable. If you want to optimize further, compare fiber and added-sugar lines across a few similar products.');
  }
  return guidance.slice(0, 3);
}

function buildSummary(productName, score, nutrition, ingredients, allergens, limitations) {
  const parts = [];
  const name = productName || 'This product';
  if (score.label === 'Strong choice') {
    parts.push(`${name} has a solid nutritional profile for its category.`);
  } else if (score.label === 'Reasonable choice') {
    parts.push(`${name} is a reasonable option with a few things worth knowing.`);
  } else if (score.label === 'Consider occasionally') {
    parts.push(`${name} is fine as an occasional choice, but a few numbers stand out.`);
  } else {
    parts.push(`${name} has several characteristics worth comparing against alternatives.`);
  }
  const negatives = score.adjustments.filter((a) => a.delta < 0 && !a.personalized);
  const positives = score.adjustments.filter((a) => a.delta > 0 && !a.personalized);
  if (negatives.length) parts.push(`Main considerations: ${negatives.slice(0, 2).map((a) => a.reason.toLowerCase()).join('; ')}.`);
  if (positives.length) parts.push(`On the plus side: ${positives.slice(0, 2).map((a) => a.reason.toLowerCase()).join('; ')}.`);
  parts.push('Remember that serving size, how often you eat it, and your overall diet matter more than any single product.');
  if (limitations.length) parts.push('Some label information could not be read, so treat this as a partial picture.');
  return parts.join(' ');
}

/**
 * Full local analysis pipeline.
 *
 * @param {object} input { productName, brand, ingredientsText, nutritionText }
 * @param {object} [prefs] user preferences
 * @returns {{ analysis: object, scoreDetail: object }} schema-valid analysis + score breakdown
 */
export function analyzeProduct(input, prefs = {}) {
  const { productName = '', brand = '', ingredientsText = '', nutritionText = '' } = input;

  const tree = parseIngredientTree(ingredientsText);
  const flat = flattenIngredientTree(tree.ingredients)
    .filter((n) => n.labelName.length > 1 && n.labelName.length < 120);
  const ingredients = flat.map((node) => analyzeIngredient(node.labelName, node));
  const rawItems = flat.map((n) => n.labelName);
  const nutrition = parseNutrition(nutritionText);
  // Reconciled database values may FILL fields the label didn't show —
  // never replace a value that was visible on the package (reconcile.js
  // rule 3; provenance is recorded in the scan's reconciliation records).
  if (input.nutritionFill) {
    for (const [key, value] of Object.entries(input.nutritionFill)) {
      if (nutrition[key] === null && value !== null && value !== undefined) {
        nutrition[key] = value;
      }
    }
  }
  const allergens = detectAllergens(`${ingredientsText}\n${nutritionText}`);

  const limitations = [];
  if (!productName) limitations.push('Product name was not detected — you can add it manually.');
  if (rawItems.length === 0) limitations.push('No ingredient list was detected in the provided text.');
  if (nutrition.calories === null && nutrition.sodiumMg === null && nutrition.proteinGrams === null) {
    limitations.push('No nutrition facts were detected; nutrition-based scoring is unavailable.');
  } else {
    const missing = [];
    if (nutrition.addedSugarGrams === null) missing.push('added sugar');
    if (nutrition.sodiumMg === null) missing.push('sodium');
    if (nutrition.saturatedFatGrams === null) missing.push('saturated fat');
    if (nutrition.fiberGrams === null) missing.push('fiber');
    if (nutrition.proteinGrams === null) missing.push('protein');
    if (missing.length) limitations.push(`Could not read: ${missing.join(', ')}. These fields are marked unavailable, not zero.`);
  }
  const unknownCount = ingredients.filter((i) => i.concernLevel === 'unknown').length;
  if (unknownCount > 0) {
    limitations.push(`${unknownCount} ingredient${unknownCount > 1 ? 's are' : ' is'} not in the database and shown without an evidence summary.`);
  }

  // Category-aware judging: cereal is compared with cereal, soup with soup.
  const category = detectCategory(productName, input.dbCategoryTags || []);
  const catThresholds = thresholdsForCategory(category.key, THRESHOLDS);

  const scoreDetail = scoreProduct(nutrition, ingredients, prefs, { thresholds: catThresholds, category });
  const confidenceNum = scoreDetail.confidence === 'high' ? 0.9 : scoreDetail.confidence === 'medium' ? 0.6 : 0.3;

  const analysis = {
    ...emptyAnalysis(),
    productName: productName.trim(),
    brand: brand.trim(),
    confidence: confidenceNum,
    overallScore: scoreDetail.score,
    overallLabel: scoreDetail.label,
    summary: buildSummary(productName.trim(), scoreDetail, nutrition, ingredients, allergens, limitations),
    keyFindings: buildKeyFindings(nutrition, ingredients, allergens, catThresholds),
    ingredients,
    allergens,
    nutrition,
    alternativeGuidance: buildAlternativeGuidance(nutrition, ingredients, prefs, catThresholds, category.key === 'general' ? null : category.label),
    limitations,
    // Extra, schema-compatible metadata (validators ignore unknown keys).
    dietFlags: dietFlags(ingredients),
    advisories: tree.advisories,
    category,
  };

  const check = validateAnalysis(analysis);
  if (!check.ok) {
    // Should never happen; surfaced loudly in dev, gracefully in prod.
    console.error('Analyzer produced invalid analysis:', check.errors);
  }
  return { analysis, scoreDetail };
}
