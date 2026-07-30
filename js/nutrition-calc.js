// nutrition-calc.js — deterministic nutrition calculations. Everything here
// is arithmetic over reconciled label values and the configurable DV
// constants; nothing is estimated or delegated to AI. Missing inputs
// produce null outputs, never zeros.

import { getDailyValues } from './dv-constants.js';

const known = (v) => v !== null && v !== undefined && !Number.isNaN(v);

/** % Daily Value for one nutrient per serving (null when not computable). */
export function percentDV(key, valuePerServing, jurisdiction) {
  if (!known(valuePerServing)) return null;
  const dv = getDailyValues(jurisdiction).values[key];
  if (!dv || !dv.value) return null;
  return Math.round((valuePerServing / dv.value) * 100);
}

/** Parse "about 4", "4.5", "4 servings" → number or null. */
export function parseServingsPerContainer(text) {
  if (typeof text === 'number') return Number.isFinite(text) ? text : null;
  const m = String(text || '').match(/([\d.]+)/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Full deterministic calculation set.
 *
 * @param {object} nutrition reconciled per-serving values
 * @param {object} [opts] { servingsPerContainer, servingsConsumed, jurisdiction }
 * @returns {{ perServing, percentDV, perContainer, consumed, jurisdiction, dvSource, calculations }}
 *   `calculations` is an audit list: each entry states what was computed
 *   from which inputs, so the report can show its work.
 */
export function calculateNutrition(nutrition = {}, opts = {}) {
  const jurisdiction = opts.jurisdiction || 'US';
  const dv = getDailyValues(jurisdiction);
  const servings = parseServingsPerContainer(opts.servingsPerContainer);
  const consumed = known(opts.servingsConsumed) && opts.servingsConsumed > 0 ? opts.servingsConsumed : null;

  const keys = ['calories', 'addedSugarGrams', 'sodiumMg', 'saturatedFatGrams', 'fiberGrams', 'proteinGrams'];
  const perServing = {};
  const pct = {};
  const perContainer = {};
  const consumedTotals = {};
  const calculations = [];

  for (const key of keys) {
    const v = known(nutrition[key]) ? nutrition[key] : null;
    perServing[key] = v;
    pct[key] = percentDV(key, v, jurisdiction);
    if (pct[key] !== null) {
      calculations.push({ id: `dv_${key}`, kind: 'percent_dv', input: v, constant: dv.values[key].value, result: pct[key] });
    }
    perContainer[key] = v !== null && servings !== null ? Math.round(v * servings * 10) / 10 : null;
    if (perContainer[key] !== null) {
      calculations.push({ id: `pkg_${key}`, kind: 'per_container', input: v, servings, result: perContainer[key] });
    }
    consumedTotals[key] = v !== null && consumed !== null ? Math.round(v * consumed * 10) / 10 : null;
  }

  return {
    perServing,
    percentDV: pct,
    perContainer: servings !== null ? perContainer : null,
    servingsPerContainer: servings,
    consumed: consumed !== null ? { servings: consumed, totals: consumedTotals } : null,
    jurisdiction: dv.jurisdiction,
    dvSource: dv.source,
    dvEffectiveDate: dv.effectiveDate,
    calculations,
  };
}
