// match-config.js — product-match weighting and thresholds. Deliberately a
// small data file so the rubric can be tuned without touching the engine.

export const MATCH_WEIGHTS = {
  barcode: 0.40,        // exact barcode match
  nameBrand: 0.20,      // brand + product-name similarity
  packageSize: 0.10,    // package size / net weight
  ingredients: 0.15,    // ingredient-list similarity
  nutrition: 0.10,      // nutrition-panel similarity
  image: 0.05,          // product-image similarity (unscored until CV exists)
};

export const MATCH_THRESHOLDS = [
  { min: 0.90, status: 'confirmed', label: 'Confirmed match' },
  { min: 0.75, status: 'probable', label: 'Probable match' },
  { min: 0.50, status: 'needs_confirmation', label: 'Needs your confirmation' },
  { min: 0, status: 'unconfirmed', label: 'Unconfirmed' },
];

export function statusForScore(score) {
  return MATCH_THRESHOLDS.find((t) => score >= t.min) || MATCH_THRESHOLDS[MATCH_THRESHOLDS.length - 1];
}
