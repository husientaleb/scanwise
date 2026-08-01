// alternatives.js — verified alternative-product engine.
//
// Searches Open Food Facts within the SAME category as the scanned product
// and filters candidates with structured nutrition data against the user's
// improvement criteria. Comparisons use per-100g values so different serving
// sizes can't game the result. Every suggestion shows why it was selected,
// its source, retrieval date, and confidence — and nothing is invented:
// no prices, no availability, no unverified products.

const SEARCH_URL = 'https://world.openfoodfacts.org/api/v2/search';
const PAGE_SIZE = 50;
const CACHE_KEY = 'scanwise.altsearch.v1';
const CACHE_TTL_MS = 24 * 3600 * 1000;

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** Per-100g extraction from an OFF search hit. */
function per100(off) {
  const n = off.nutriments || {};
  const g = (k) => num(n[`${k}_100g`]);
  return {
    calories: g('energy-kcal'),
    addedSugarGrams: g('added-sugars'),
    sugarsGrams: g('sugars'),
    sodiumMg: g('sodium') !== null ? Math.round(g('sodium') * 1000) : null,
    saturatedFatGrams: g('saturated-fat'),
    fiberGrams: g('fiber'),
    proteinGrams: g('proteins'),
  };
}

// A reported 0 g added sugar is only trustworthy when total sugars is also
// low — OFF's added-sugars field is sparsely filled, and an unfilled value
// can surface as 0 on visibly sugary products.
function reliableAddedSugar(p) {
  const added = p.addedSugarGrams;
  if (added === null || added === undefined) return null;
  if (added > 0) return added;
  const total = p.sugarsGrams;
  return total !== null && total !== undefined && total <= 5 ? added : null;
}

// Criteria the user can ask for. `compare(base100, cand100)` returns
// { baseVal, candVal, fieldName } with LIKE-FOR-LIKE values, or null when a
// fair comparison isn't possible.
export const ALT_CRITERIA = {
  lessSugar: {
    label: 'Less sugar',
    direction: 'lower',
    compare: (base, cand) => {
      const ba = reliableAddedSugar(base);
      const ca = reliableAddedSugar(cand);
      if (ba !== null && ca !== null) return { baseVal: ba, candVal: ca, fieldName: 'added sugar' };
      // Fall back to total sugars — on BOTH sides, honestly labeled.
      const bt = base.sugarsGrams;
      const ct = cand.sugarsGrams;
      if (bt !== null && bt !== undefined && ct !== null && ct !== undefined) {
        return { baseVal: bt, candVal: ct, fieldName: 'total sugars' };
      }
      return null;
    },
  },
  lessSodium: { label: 'Less sodium', direction: 'lower', compare: single('sodiumMg', 'sodium') },
  lessSatFat: { label: 'Less saturated fat', direction: 'lower', compare: single('saturatedFatGrams', 'saturated fat') },
  moreFiber: { label: 'More fiber', direction: 'higher', compare: single('fiberGrams', 'fiber') },
  moreProtein: { label: 'More protein', direction: 'higher', compare: single('proteinGrams', 'protein') },
};

function single(key, fieldName) {
  return (base, cand) => {
    const b = base[key];
    const c = cand[key];
    if (b === null || b === undefined || c === null || c === undefined) return null;
    return { baseVal: b, candVal: c, fieldName };
  };
}

export const MIN_IMPROVEMENT = 0.25; // spec: at least 25% better on the chosen axis

export function improvement(direction, baseline, candidate) {
  if (baseline === null || candidate === null || baseline === undefined || candidate === undefined) return null;
  if (direction === 'lower') {
    if (baseline <= 0) return null;
    return (baseline - candidate) / baseline;
  }
  if (candidate <= 0) return null;
  if (baseline <= 0) return candidate > 0 ? 1 : null;
  return (candidate - baseline) / baseline;
}

function readCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY)) || {}; } catch { return {}; }
}

async function searchCategory(categoryTag) {
  const cache = readCache();
  const hit = cache[categoryTag];
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.products;

  const params = new URLSearchParams({
    categories_tags: categoryTag,
    fields: 'code,product_name,brands,quantity,serving_size,nutriments,ingredients_text,image_front_small_url,last_modified_t,countries_tags',
    page_size: String(PAGE_SIZE),
    sort_by: 'unique_scans_n', // popularity → products people actually find in stores
  });
  const res = await fetch(`${SEARCH_URL}?${params}`, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Alternative search failed (HTTP ${res.status}).`);
  const data = await res.json();
  const products = (data.products || []).filter((p) => p.product_name);
  try {
    cache[categoryTag] = { at: Date.now(), products };
    const keys = Object.keys(cache);
    if (keys.length > 10) delete cache[keys[0]];
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch { /* best effort */ }
  return products;
}

/**
 * Find verified alternatives to a scanned product.
 *
 * @param {object} baseProduct  the matched OFF product (needs nutritionPer100g + categoryTags + barcode)
 * @param {string} criterionKey one of ALT_CRITERIA keys
 * @param {object} [opts]       { avoidAllergens: string[] } lowercase allergen words to exclude
 * @returns {Promise<{alternatives: Array, searchedCategory: string|null, candidateCount: number, note: string|null}>}
 */
export async function findAlternatives(baseProduct, criterionKey, opts = {}) {
  const criterion = ALT_CRITERIA[criterionKey];
  if (!criterion) throw new Error('Unknown criterion');

  const base100 = baseProduct.nutritionPer100g || {};
  // Quick feasibility check: can the base product be compared at all?
  if (!criterion.compare(base100, base100)) {
    return { alternatives: [], searchedCategory: null, candidateCount: 0, note: 'The scanned product has no verified per-100g data for this measure, so a fair comparison is not possible. Use the shopping criteria instead.' };
  }

  // Most specific category tag OFF gives us (ordered general → specific).
  // Only slug-shaped tags are queryable — OFF records also carry raw
  // display labels (e.g. "en:Pâtes à tartiner") that the search API rejects.
  const slugTags = (baseProduct.categoryTagsRaw || []).filter((t) => /^[a-z]{2}:[a-z0-9-]+$/.test(t));
  const tag = slugTags[slugTags.length - 1] || null;
  if (!tag) {
    return { alternatives: [], searchedCategory: null, candidateCount: 0, note: 'No verified category for this product, so an exact-product search is not possible. Use the shopping criteria instead.' };
  }

  const candidates = await searchCategory(tag);
  const avoid = (opts.avoidAllergens || []).map((a) => a.toLowerCase());

  const scored = [];
  for (const off of candidates) {
    if (off.code === baseProduct.barcode) continue;
    const p100 = per100(off);

    // Sanity gates against crowdsourced noise:
    // 1. The candidate record must be reasonably complete (≥3 core fields).
    const completeness = ['calories', 'sugarsGrams', 'sodiumMg', 'saturatedFatGrams', 'fiberGrams', 'proteinGrams']
      .filter((k) => p100[k] !== null).length;
    if (completeness < 3) continue;
    // 2. Similar product type: energy density within ±60% of the scanned
    //    product (a low-calorie sauce miscategorized into a spread category
    //    is not a real alternative to a dense spread).
    if (base100.calories !== null && p100.calories !== null) {
      const ratio = p100.calories / Math.max(base100.calories, 1);
      if (ratio < 0.4 || ratio > 1.6) continue;
    }

    const cmp = criterion.compare(base100, p100);
    if (!cmp) continue;
    const imp = improvement(criterion.direction, cmp.baseVal, cmp.candVal);
    if (imp === null || imp < MIN_IMPROVEMENT) continue;
    // Allergen exclusion from OFF ingredient text when available (advisory
    // only — the card still tells users to verify the package).
    const ingText = (off.ingredients_text || '').toLowerCase();
    if (avoid.length && avoid.some((a) => ingText.includes(a))) continue;
    scored.push({
      barcode: off.code,
      productName: off.product_name,
      brand: off.brands || '',
      packageSize: off.quantity || '',
      imageUrl: off.image_front_small_url || null,
      per100g: p100,
      improvementPct: Math.round(imp * 100),
      comparedField: cmp.fieldName,
      baselineValue: Math.round(cmp.baseVal * 10) / 10,
      candidateValue: Math.round(cmp.candVal * 10) / 10,
      source: 'Open Food Facts',
      sourceLastUpdated: off.last_modified_t ? new Date(off.last_modified_t * 1000).toISOString() : null,
      retrievedAt: new Date().toISOString(),
      // Confidence: community database with structured data — honest ceiling.
      confidence: 'moderate',
    });
  }

  scored.sort((a, b) => b.improvementPct - a.improvementPct);
  return {
    alternatives: scored.slice(0, 3),
    searchedCategory: tag,
    candidateCount: candidates.length,
    note: scored.length === 0
      ? `Searched ${candidates.length} products in this category — none had verified data at least 25% better on ${criterion.label.toLowerCase()}. The shopping criteria below still apply.`
      : null,
  };
}
