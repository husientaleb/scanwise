// categories.js — product-category detection and category-aware scoring
// thresholds. A condiment, beverage, cereal, and protein bar should not be
// judged by identical numbers. Data-first: tune thresholds here, not in the
// scoring engine.
//
// Threshold shape matches scoring.js THRESHOLDS; anything omitted falls back
// to the general defaults.

export const CATEGORIES = {
  general: {
    label: 'Packaged food (general)',
    keywords: [],
    thresholds: {},
  },
  cereal: {
    label: 'Breakfast cereal',
    keywords: ['cereal', 'granola', 'muesli', 'corn flakes', 'oat rings', 'crunch'],
    thresholds: {
      addedSugarGrams: { moderate: 6, high: 10 },
      fiberGrams: { good: 3, excellent: 5 },
    },
  },
  yogurt: {
    label: 'Yogurt & cultured dairy',
    keywords: ['yogurt', 'yoghurt', 'kefir', 'skyr'],
    thresholds: {
      addedSugarGrams: { moderate: 5, high: 9 },
      proteinGrams: { good: 8, excellent: 12 },
    },
  },
  bread: {
    label: 'Bread & baked staples',
    keywords: ['bread', 'bagel', 'tortilla', 'bun', 'roll', 'pita', 'english muffin'],
    thresholds: {
      sodiumMg: { moderate: 150, high: 300 },
      fiberGrams: { good: 2, excellent: 4 },
      addedSugarGrams: { moderate: 3, high: 6 },
    },
  },
  snackBar: {
    label: 'Snack / protein bar',
    keywords: ['bar', 'granola bar', 'protein bar', 'energy bar'],
    thresholds: {
      addedSugarGrams: { moderate: 6, high: 10 },
      proteinGrams: { good: 6, excellent: 10 },
    },
  },
  beverage: {
    label: 'Beverage',
    keywords: ['drink', 'juice', 'soda', 'cola', 'beverage', 'lemonade', 'iced tea', 'sports drink', 'water', 'smoothie'],
    thresholds: {
      // Liquid calories add up across a day; stricter sugar bands.
      addedSugarGrams: { moderate: 4, high: 9 },
      calories: { high: 200 },
    },
  },
  soup: {
    label: 'Soup & broth',
    keywords: ['soup', 'broth', 'bisque', 'chowder', 'stew'],
    thresholds: {
      // Soups are habitually sodium-heavy; bands reflect category norms
      // while still flagging the saltiest options.
      sodiumMg: { moderate: 350, high: 600 },
    },
  },
  condiment: {
    label: 'Condiment / sauce / dressing',
    keywords: ['ketchup', 'mustard', 'mayonnaise', 'dressing', 'sauce', 'salsa', 'condiment', 'marinade', 'syrup'],
    thresholds: {
      // Tiny servings: judge per-serving numbers on tighter bands.
      addedSugarGrams: { moderate: 3, high: 6 },
      sodiumMg: { moderate: 150, high: 300 },
    },
  },
  candy: {
    label: 'Candy & confectionery',
    keywords: ['candy', 'chocolate bar', 'gummy', 'gummies', 'licorice', 'caramels', 'confection'],
    thresholds: {
      addedSugarGrams: { moderate: 8, high: 15 },
    },
  },
  chipsSnack: {
    label: 'Chips & savory snacks',
    keywords: ['chips', 'crisps', 'crackers', 'pretzels', 'popcorn', 'puffs'],
    thresholds: {
      sodiumMg: { moderate: 180, high: 350 },
      saturatedFatGrams: { moderate: 1.5, high: 3 },
    },
  },
  spread: {
    label: 'Spread / nut butter',
    keywords: ['spread', 'peanut butter', 'nut butter', 'hazelnut spread', 'jam', 'jelly', 'preserves'],
    thresholds: {
      addedSugarGrams: { moderate: 4, high: 8 },
    },
  },
  frozenMeal: {
    label: 'Frozen / prepared meal',
    keywords: ['frozen meal', 'dinner', 'entree', 'entrée', 'pizza', 'lasagna', 'mac and cheese', 'burrito'],
    thresholds: {
      sodiumMg: { moderate: 500, high: 800 },
      calories: { high: 600 },
      proteinGrams: { good: 12, excellent: 20 },
    },
  },
};

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Detect the product category from name/keywords and (optionally) database
 * category tags. Longest keyword match wins; 'general' is the safe default.
 * @returns {{ key: string, label: string, matchedOn: string|null }}
 */
export function detectCategory(productName = '', dbCategoryTags = []) {
  const haystacks = [String(productName).toLowerCase(), ...dbCategoryTags.map((t) => String(t).toLowerCase())];
  let best = { key: 'general', label: CATEGORIES.general.label, matchedOn: null, len: 0 };
  for (const [key, def] of Object.entries(CATEGORIES)) {
    for (const kw of def.keywords) {
      if (kw.length <= best.len) continue;
      const re = new RegExp(`(^|[^a-z])${escapeRe(kw)}(s?)([^a-z]|$)`, 'i');
      if (haystacks.some((h) => re.test(h))) {
        best = { key, label: def.label, matchedOn: kw, len: kw.length };
      }
    }
  }
  return { key: best.key, label: best.label, matchedOn: best.matchedOn };
}

/** Merge a category's threshold overrides over the general defaults. */
export function thresholdsForCategory(categoryKey, baseThresholds) {
  const overrides = CATEGORIES[categoryKey]?.thresholds || {};
  const merged = {};
  for (const [key, base] of Object.entries(baseThresholds)) {
    merged[key] = { ...base, ...(overrides[key] || {}) };
  }
  return merged;
}
