// scoring.js — Ingrado's transparent scoring utility.
// Deliberately separate from the analyzer and UI so the rubric can evolve.
//
// The score starts at a neutral 7 and applies visible, explainable adjustments
// based on per-serving nutrition, the ingredient profile, and (optionally) the
// user's stated preferences. Every adjustment is returned so the UI can show
// exactly why points were added or removed.
//
// The score is a general nutrition signal only. It must never be read as a
// safety verdict for someone with a food allergy — allergen alerts are
// surfaced separately and independently of the score.

export const BASE_SCORE = 7;

// Per-serving thresholds informed by FDA "low"/"high" nutrient-content
// definitions and %DV conventions (DV: added sugar 50 g, sodium 2300 mg,
// saturated fat 20 g, fiber 28 g).
export const THRESHOLDS = {
  addedSugarGrams: { moderate: 6, high: 12 },   // >20% DV is "high"
  sodiumMg: { moderate: 230, high: 460 },        // 10% / 20% DV
  saturatedFatGrams: { moderate: 2, high: 4 },   // 10% / 20% DV
  fiberGrams: { good: 3, excellent: 5 },         // FDA "good"/"excellent source"
  proteinGrams: { good: 5, excellent: 10 },
  calories: { high: 400 },                       // FDA considers ≥400 kcal/serving high
};

/** Descriptive level for a nutrition card: 'low' | 'moderate' | 'high' | 'unknown'.
 *  Pass category-adjusted thresholds as the third argument to judge a product
 *  against its own category's norms. */
export function nutrientLevel(key, value, thresholds = THRESHOLDS) {
  if (value === null || value === undefined || Number.isNaN(value)) return 'unknown';
  const t = thresholds[key];
  switch (key) {
    case 'addedSugarGrams':
    case 'sodiumMg':
    case 'saturatedFatGrams':
      if (value >= t.high) return 'high';
      if (value >= t.moderate) return 'moderate';
      return 'low';
    case 'fiberGrams':
    case 'proteinGrams':
      if (value >= t.excellent) return 'high';
      if (value >= t.good) return 'moderate';
      return 'low';
    case 'calories':
      if (value >= t.high) return 'high';
      if (value >= 200) return 'moderate';
      return 'low';
    default:
      return 'unknown';
  }
}

export function labelForScore(score) {
  if (score >= 8) return 'Strong choice';
  if (score >= 6) return 'Reasonable choice';
  if (score >= 4) return 'Consider occasionally';
  return 'Compare alternatives';
}

/**
 * Score a product.
 *
 * @param {object} nutrition  { calories, addedSugarGrams, sodiumMg,
 *                              saturatedFatGrams, fiberGrams, proteinGrams } — null = unknown
 * @param {Array}  ingredients analyzer ingredient objects ({ name, category, concernLevel })
 * @param {object} [prefs]     user preferences (see store.js DEFAULT_PREFS)
 * @param {object} [opts]      { thresholds, category: {key,label} } — category-aware
 *                             judging (see categories.js); defaults to general bands
 * @returns {{ score:number, label:string, adjustments:Array<{reason:string, delta:number, personalized?:boolean}>,
 *             confidence:'high'|'medium'|'low', confidenceNote:string, missingFields:string[], category? }}
 */
export function scoreProduct(nutrition = {}, ingredients = [], prefs = {}, opts = {}) {
  const T = opts.thresholds || THRESHOLDS;
  const adjustments = [];
  const add = (reason, delta, personalized = false) => {
    adjustments.push({ reason, delta: Math.round(delta * 10) / 10, personalized });
  };

  const n = nutrition || {};
  const known = (v) => v !== null && v !== undefined && !Number.isNaN(v);

  // --- Added sugar ---
  if (known(n.addedSugarGrams)) {
    const lvl = nutrientLevel('addedSugarGrams', n.addedSugarGrams, T);
    if (lvl === 'high') add(`High added sugar (${n.addedSugarGrams} g per serving)`, -1.5);
    else if (lvl === 'moderate') add(`Moderate added sugar (${n.addedSugarGrams} g per serving)`, -0.5);
    else if (n.addedSugarGrams === 0) add('No added sugar', +0.5);
    if (prefs.lowerSugar && lvl !== 'low') {
      add('You asked to prioritize lower sugar', -0.5, true);
    }
  }

  // --- Sodium ---
  if (known(n.sodiumMg)) {
    const lvl = nutrientLevel('sodiumMg', n.sodiumMg, T);
    if (lvl === 'high') add(`High sodium (${n.sodiumMg} mg per serving)`, -1);
    else if (lvl === 'moderate') add(`Moderate sodium (${n.sodiumMg} mg per serving)`, -0.3);
    else add('Low sodium', +0.3);
    if (prefs.lowerSodium && lvl !== 'low') {
      add('You asked to prioritize lower sodium', -0.5, true);
    }
  }

  // --- Saturated fat ---
  if (known(n.saturatedFatGrams)) {
    const lvl = nutrientLevel('saturatedFatGrams', n.saturatedFatGrams, T);
    if (lvl === 'high') add(`High saturated fat (${n.saturatedFatGrams} g per serving)`, -1);
    else if (lvl === 'moderate') add(`Moderate saturated fat (${n.saturatedFatGrams} g per serving)`, -0.3);
  }

  // --- Fiber ---
  if (known(n.fiberGrams)) {
    const lvl = nutrientLevel('fiberGrams', n.fiberGrams, T);
    if (lvl === 'high') add(`Excellent source of fiber (${n.fiberGrams} g per serving)`, +1);
    else if (lvl === 'moderate') add(`Good source of fiber (${n.fiberGrams} g per serving)`, +0.5);
    if (prefs.higherFiber && lvl === 'high') {
      add('Matches your higher-fiber preference', +0.5, true);
    }
  }

  // --- Protein ---
  if (known(n.proteinGrams)) {
    const lvl = nutrientLevel('proteinGrams', n.proteinGrams, T);
    if (lvl === 'high') add(`High protein (${n.proteinGrams} g per serving)`, +1);
    else if (lvl === 'moderate') add(`Good source of protein (${n.proteinGrams} g per serving)`, +0.5);
    if (prefs.higherProtein && lvl === 'high') {
      add('Matches your higher-protein preference', +0.5, true);
    }
  }

  // --- Calories / serving size context ---
  if (known(n.calories) && n.calories >= T.calories.high) {
    add(`Calorie-dense serving (${n.calories} kcal)`, -0.5);
  }

  // --- Ingredient profile ---
  const list = Array.isArray(ingredients) ? ingredients : [];
  if (list.length > 0) {
    const highConcern = list.filter((i) => i.concernLevel === 'high');
    for (const ing of highConcern.slice(0, 2)) {
      add(`Contains ${ing.name.toLowerCase()} — see ingredient notes`, -0.7);
    }

    // Ingredient lists are ordered by weight: a sweetener in the top three
    // means sugar is a primary ingredient, and several sweetener names is a
    // common way to spread sugar down the list.
    const sweetenerNames = [...new Set(list.filter((i) => i.category === 'Sweetener').map((i) => (i.rawName || i.name).toLowerCase()))];
    if (list.slice(0, 3).some((i) => i.category === 'Sweetener')) {
      add('A sweetener is among the first three ingredients', -0.5);
    }
    if (sweetenerNames.length >= 3) {
      add(`Sweeteners appear under ${sweetenerNames.length} different names`, -0.5);
    }
    const first = (list[0]?.rawName || '').toLowerCase();
    if (/whole\s(grain|wheat|oat|rye|corn)|whole-grain|oats\b|rolled oats|brown rice|quinoa|buckwheat|millet/.test(first)) {
      add('Whole grain listed as the first ingredient', +0.3);
    }

    // Diet-preference conflicts (informational penalties, clearly personalized).
    const names = (arr) => [...new Set(arr.map((i) => i.name))].join(', ');
    if (prefs.vegan) {
      const hits = list.filter((i) => i.nonVegan || i.nonVeg);
      if (hits.length) add(`Contains ${names(hits)} — conflicts with your vegan preference`, -1, true);
    } else if (prefs.vegetarian) {
      const hits = list.filter((i) => i.nonVeg);
      if (hits.length) add(`Contains ${names(hits)} — conflicts with your vegetarian preference`, -1, true);
    }
    if (prefs.glutenAvoidance) {
      const hits = list.filter((i) => i.gluten);
      if (hits.length) add(`Contains gluten sources (${names(hits)}) you asked to avoid`, -1, true);
    }
    if (prefs.dairyAvoidance) {
      const hits = list.filter((i) => i.allergen === 'Milk');
      if (hits.length) add(`Contains dairy (${names(hits)}) you asked to avoid`, -1, true);
    }
    const additiveCount = list.filter((i) =>
      ['Preservative', 'Color', 'Emulsifier', 'Sweetener'].includes(i.category)).length;
    if (list.length >= 15 && additiveCount >= 5) {
      add(`Long, highly processed ingredient list (${list.length} ingredients)`, -0.5);
    } else if (list.length <= 6 && additiveCount <= 1) {
      add(`Short, simple ingredient list (${list.length} ingredients)`, +0.5);
    }
    if (prefs.avoidArtificialColors && list.some((i) => i.name === 'Synthetic food dye')) {
      add('Contains synthetic dyes you asked to avoid', -1, true);
    }
    const avoidList = (prefs.avoidIngredients || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
    if (avoidList.length) {
      const hits = list.filter((i) => avoidList.some((a) => i.rawName?.toLowerCase().includes(a) || i.name.toLowerCase().includes(a)));
      if (hits.length) add(`Contains ingredients on your avoid list (${hits.map((h) => h.name).join(', ')})`, -1, true);
    }
  }

  // --- Confidence from data availability ---
  const nutritionKeys = ['calories', 'addedSugarGrams', 'sodiumMg', 'saturatedFatGrams', 'fiberGrams', 'proteinGrams'];
  const missingFields = nutritionKeys.filter((k) => !known(n[k]));
  if (list.length === 0) missingFields.push('ingredients');

  let confidence = 'high';
  let confidenceNote = 'Based on a complete label reading.';
  if (missingFields.length >= 5) {
    confidence = 'low';
    confidenceNote = 'Most of the label could not be read, so this score is a rough estimate.';
  } else if (missingFields.length >= 2) {
    confidence = 'medium';
    confidenceNote = `Some label data was unavailable (${missingFields.length} fields), which reduces confidence.`;
  }

  const total = adjustments.reduce((sum, a) => sum + a.delta, 0);
  const score = Math.round(Math.min(10, Math.max(1, BASE_SCORE + total)) * 10) / 10;

  return {
    score,
    label: labelForScore(score),
    adjustments,
    confidence,
    confidenceNote,
    missingFields,
    category: opts.category || null,
  };
}
