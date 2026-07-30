// assessment.js — the product is evaluated on SEPARATE dimensions rather
// than one opaque number. The nutrition-profile score still comes from the
// transparent rubric in scoring.js; the dimensions here add context and are
// all computed deterministically.

import { PREF_ALLERGEN_MAP, PREF_LABELS } from './store.js';

const ADDITIVE_CATEGORIES = ['Preservative', 'Color', 'Emulsifier', 'Sweetener', 'Flavoring'];

/**
 * @param {object} args { analysis, scoreDetail, prefs, reconciliation, match }
 * @returns {Array<{key, label, value, display, note}>}
 */
export function computeDimensions({ analysis, scoreDetail, prefs = {}, reconciliation = null, match = null }) {
  const dims = [];
  const ings = analysis.ingredients || [];

  // 1. Nutrition profile — the transparent rubric score.
  dims.push({
    key: 'nutrition',
    label: 'Nutrition profile',
    value: analysis.overallScore,
    display: `${analysis.overallScore}/10`,
    note: 'From the transparent scoring rubric (see "Why this score").',
  });

  // 2. Ingredient transparency — how much of the list is identifiable.
  if (ings.length) {
    const known = ings.filter((i) => i.concernLevel !== 'unknown').length;
    const vague = ings.filter((i) => /flavor|flavour/i.test(i.name) && !/vanilla|cocoa|spice/i.test(i.name)).length;
    const value = Math.round(Math.max(0, (known / ings.length) * 10 - vague * 0.5) * 10) / 10;
    dims.push({
      key: 'transparency',
      label: 'Ingredient transparency',
      value,
      display: `${value}/10`,
      note: `${known} of ${ings.length} ingredients recognized${vague ? `; ${vague} unspecified flavoring${vague > 1 ? 's' : ''}` : ''}.`,
    });
  }

  // 3. Degree of processing — descriptive, not a health verdict.
  if (ings.length) {
    const additives = ings.filter((i) => ADDITIVE_CATEGORIES.includes(i.category)).length;
    let label = 'Minimally processed profile';
    if (ings.length >= 15 || additives >= 6) label = 'Highly processed profile';
    else if (ings.length >= 8 || additives >= 3) label = 'Moderately processed profile';
    dims.push({
      key: 'processing',
      label: 'Degree of processing',
      value: null,
      display: label,
      note: `${ings.length} ingredients, ${additives} additive-type entries. Descriptive only — processing level is one signal, not a verdict.`,
    });
  }

  // 4. Allergen suitability — NEVER folded into any score.
  const userAllergens = Object.entries(PREF_ALLERGEN_MAP)
    .filter(([prefKey]) => prefs[prefKey])
    .map(([prefKey, allergen]) => ({ allergen, label: PREF_LABELS[prefKey] }));
  if (userAllergens.length) {
    const hits = userAllergens.filter((u) => (analysis.allergens || []).includes(u.allergen));
    dims.push({
      key: 'allergens',
      label: 'Allergen suitability',
      value: null,
      display: hits.length
        ? `Not suitable: contains ${hits.map((h) => h.allergen.toLowerCase()).join(', ')}`
        : 'No flagged allergens detected',
      note: 'Independent of all scores. Always verify the current package label.',
      alert: hits.length > 0,
    });
  }

  // 5. Preference match.
  const prefAdjustments = (scoreDetail?.adjustments || []).filter((a) => a.personalized);
  if (prefAdjustments.length) {
    const penalty = prefAdjustments.reduce((s, a) => s + Math.min(0, a.delta), 0);
    const value = Math.round(Math.max(0, 10 + penalty * 2.5) * 10) / 10;
    dims.push({
      key: 'preferences',
      label: 'Match with your preferences',
      value,
      display: `${value}/10`,
      note: prefAdjustments.map((a) => a.reason).join('; '),
    });
  }

  // 6. Data completeness.
  const nutritionKeys = ['calories', 'addedSugarGrams', 'sodiumMg', 'saturatedFatGrams', 'fiberGrams', 'proteinGrams'];
  const presentCount = nutritionKeys.filter((k) => analysis.nutrition?.[k] !== null && analysis.nutrition?.[k] !== undefined).length
    + (ings.length ? 1 : 0);
  const completeness = Math.round((presentCount / (nutritionKeys.length + 1)) * 100);
  dims.push({
    key: 'completeness',
    label: 'Data completeness',
    value: completeness,
    display: `${completeness}%`,
    note: completeness === 100 ? 'All core fields were available.' : 'Missing fields are reported as unavailable, never estimated.',
  });

  // 7. Match confidence (when a database lookup happened).
  if (match) {
    dims.push({
      key: 'match',
      label: 'Product identification',
      value: match.score,
      display: `${match.statusLabel} (${Math.round(match.score * 100)}%)`,
      note: match.status === 'confirmed' || match.status === 'probable'
        ? 'Database record verified against your photo/label data.'
        : 'Treat database-filled fields with caution.',
    });
  }

  // 8. Conflicts surfaced by reconciliation.
  if (reconciliation) {
    const conflicts = reconciliation.filter((r) => r.conflict);
    if (conflicts.length) {
      dims.push({
        key: 'conflicts',
        label: 'Label vs. database',
        value: null,
        display: `${conflicts.length} field${conflicts.length > 1 ? 's' : ''} disagree`,
        note: 'Your package label was used for these fields; the database record may be outdated.',
        alert: true,
      });
    }
  }

  return dims;
}
