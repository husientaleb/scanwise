// matching.js — verify that a database record is actually the photographed
// product. A barcode hit alone is NOT accepted as proof; we score every
// comparable signal and renormalize over the signals we could evaluate.

import { MATCH_WEIGHTS, statusForScore } from './match-config.js';

const tokens = (s) => (s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((t) => t.length > 1);

/** Jaccard similarity over word tokens, 0..1. */
export function tokenSimilarity(a, b) {
  const ta = new Set(tokens(a));
  const tb = new Set(tokens(b));
  if (!ta.size || !tb.size) return null; // not comparable
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return inter / (ta.size + tb.size - inter);
}

/** Similarity of two nutrition objects over shared numeric fields, 0..1. */
export function nutritionSimilarity(a, b) {
  const keys = ['calories', 'addedSugarGrams', 'sodiumMg', 'saturatedFatGrams', 'fiberGrams', 'proteinGrams'];
  let compared = 0;
  let total = 0;
  for (const k of keys) {
    const va = a?.[k];
    const vb = b?.[k];
    if (va === null || va === undefined || vb === null || vb === undefined) continue;
    compared++;
    const denom = Math.max(Math.abs(va), Math.abs(vb), 1);
    total += Math.max(0, 1 - Math.abs(va - vb) / denom);
  }
  return compared ? total / compared : null;
}

/** Package-size comparability: extract leading number+unit and compare. */
export function sizeSimilarity(a, b) {
  const parse = (s) => {
    const m = String(s || '').toLowerCase().match(/([\d.]+)\s*(g|kg|mg|oz|ounce|lb|ml|l|fl oz)/);
    if (!m) return null;
    let value = parseFloat(m[1]);
    const unit = m[2];
    if (unit === 'kg' || unit === 'l') value *= 1000;
    if (unit === 'lb') value *= 453.6;
    if (unit === 'oz' || unit === 'ounce' || unit === 'fl oz') value *= 28.35;
    return value;
  };
  const va = parse(a);
  const vb = parse(b);
  if (va === null || vb === null) return null;
  return Math.max(0, 1 - Math.abs(va - vb) / Math.max(va, vb));
}

/**
 * Score a candidate database product against what the label/photos show.
 *
 * @param {object} label { barcode, productName, brand, packageSize, ingredientsText, nutrition }
 * @param {object} candidate same shape from the database
 * @returns {{ score, status, statusLabel, components: Array<{signal, weight, similarity, scored}> }}
 */
export function scoreProductMatch(label, candidate) {
  const components = [];
  const push = (signal, similarity) => components.push({
    signal,
    weight: MATCH_WEIGHTS[signal],
    similarity,
    scored: similarity !== null && similarity !== undefined,
  });

  push('barcode', label.barcode && candidate.barcode
    ? (label.barcode === candidate.barcode ? 1 : 0)
    : null);
  const nameSim = tokenSimilarity(label.productName, candidate.productName);
  const brandSim = tokenSimilarity(label.brand, candidate.brand);
  push('nameBrand', nameSim === null && brandSim === null
    ? null
    : ((nameSim ?? brandSim) + (brandSim ?? nameSim)) / 2);
  push('packageSize', sizeSimilarity(label.packageSize, candidate.packageSize));
  push('ingredients', tokenSimilarity(label.ingredientsText, candidate.ingredientsText));
  push('nutrition', nutritionSimilarity(label.nutrition, candidate.nutrition));
  push('image', null); // image similarity not implemented yet — never fake it

  const scoredWeight = components.filter((c) => c.scored).reduce((s, c) => s + c.weight, 0);
  const score = scoredWeight === 0 ? 0 : Math.round(
    (components.filter((c) => c.scored).reduce((s, c) => s + c.weight * c.similarity, 0) / scoredWeight) * 100
  ) / 100;

  let { status, label: statusLabel } = statusForScore(score);

  // A barcode hit with nothing else to verify against is never auto-accepted
  // (Stage 3 rule): the user must confirm it is really this product.
  const scoredSignals = components.filter((c) => c.scored).map((c) => c.signal);
  if (scoredSignals.length === 1 && scoredSignals[0] === 'barcode' &&
      (status === 'confirmed' || status === 'probable')) {
    status = 'needs_confirmation';
    statusLabel = 'Needs your confirmation (barcode only)';
  }

  return { score, status, statusLabel, components };
}
