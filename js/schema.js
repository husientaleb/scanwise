// schema.js — validation for AI/analyzer output.
// Zod-style, dependency-free. The canonical analysis schema lives here so the
// client pipeline, the serverless AI endpoint, and the tests all agree.

export const CONCERN_LEVELS = ['low', 'moderate', 'high', 'unknown'];

export const INGREDIENT_CATEGORIES = [
  'Common food ingredient',
  'Nutrient',
  'Preservative',
  'Sweetener',
  'Color',
  'Flavoring',
  'Emulsifier',
  'Allergen',
  'Other',
];

export const OVERALL_LABELS = [
  'Strong choice',
  'Reasonable choice',
  'Consider occasionally',
  'Compare alternatives',
];

const isStr = (v) => typeof v === 'string';
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isNumOrNull = (v) => v === null || isNum(v);
const isStrArray = (v) => Array.isArray(v) && v.every(isStr);

function checkIngredient(ing, i, errors) {
  const path = `ingredients[${i}]`;
  if (typeof ing !== 'object' || ing === null) {
    errors.push(`${path}: expected an object`);
    return;
  }
  if (!isStr(ing.name) || !ing.name.trim()) errors.push(`${path}.name: non-empty string required`);
  if (!INGREDIENT_CATEGORIES.includes(ing.category)) {
    errors.push(`${path}.category: must be one of ${INGREDIENT_CATEGORIES.join(', ')}`);
  }
  for (const key of ['purpose', 'plainLanguageExplanation', 'evidenceSummary', 'whoShouldPayAttention']) {
    if (!isStr(ing[key])) errors.push(`${path}.${key}: string required`);
  }
  if (!CONCERN_LEVELS.includes(ing.concernLevel)) {
    errors.push(`${path}.concernLevel: must be one of ${CONCERN_LEVELS.join(', ')}`);
  }
}

/**
 * Validate a full analysis object. Returns { ok, errors, value }.
 * `value` is the input untouched when ok, otherwise null.
 */
export function validateAnalysis(obj) {
  const errors = [];
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    return { ok: false, errors: ['analysis: expected an object'], value: null };
  }

  if (!isStr(obj.productName)) errors.push('productName: string required');
  if (!isStr(obj.brand)) errors.push('brand: string required (may be empty)');
  if (!isNum(obj.confidence) || obj.confidence < 0 || obj.confidence > 1) {
    errors.push('confidence: number between 0 and 1 required');
  }
  if (!isNum(obj.overallScore) || obj.overallScore < 1 || obj.overallScore > 10) {
    errors.push('overallScore: number between 1 and 10 required');
  }
  if (!OVERALL_LABELS.includes(obj.overallLabel)) {
    errors.push(`overallLabel: must be one of ${OVERALL_LABELS.join(', ')}`);
  }
  if (!isStr(obj.summary)) errors.push('summary: string required');
  if (!isStrArray(obj.keyFindings)) errors.push('keyFindings: array of strings required');
  else if (obj.keyFindings.length > 5) errors.push('keyFindings: at most 5 findings');

  if (!Array.isArray(obj.ingredients)) errors.push('ingredients: array required');
  else obj.ingredients.forEach((ing, i) => checkIngredient(ing, i, errors));

  if (!isStrArray(obj.allergens)) errors.push('allergens: array of strings required');

  const n = obj.nutrition;
  if (typeof n !== 'object' || n === null) {
    errors.push('nutrition: object required');
  } else {
    if (!isStr(n.servingSize)) errors.push('nutrition.servingSize: string required (may be empty)');
    for (const key of ['calories', 'addedSugarGrams', 'sodiumMg', 'saturatedFatGrams', 'fiberGrams', 'proteinGrams']) {
      if (!isNumOrNull(n[key])) errors.push(`nutrition.${key}: number or null required`);
    }
  }

  if (!isStrArray(obj.alternativeGuidance)) errors.push('alternativeGuidance: array of strings required');
  if (!isStrArray(obj.limitations)) errors.push('limitations: array of strings required');

  return { ok: errors.length === 0, errors, value: errors.length === 0 ? obj : null };
}

/** An empty-but-valid analysis skeleton, useful as a merge base. */
export function emptyAnalysis() {
  return {
    productName: '',
    brand: '',
    confidence: 0,
    overallScore: 5,
    overallLabel: 'Consider occasionally',
    summary: '',
    keyFindings: [],
    ingredients: [],
    allergens: [],
    nutrition: {
      servingSize: '',
      calories: null,
      addedSugarGrams: null,
      sodiumMg: null,
      saturatedFatGrams: null,
      fiberGrams: null,
      proteinGrams: null,
    },
    alternativeGuidance: [],
    limitations: [],
  };
}
