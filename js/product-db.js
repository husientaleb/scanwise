// product-db.js — verified product lookup with a strict source order:
//   1. Local ScanWise product cache (localStorage, TTL)
//   2. Open Food Facts API (public, structured, per-barcode)
//   3. USDA FoodData Central (stub — needs an API key; see .env.example)
//   4. Licensed database (stub for future configuration)
//   5. (OCR-based search and manual confirmation happen in the UI flow)
// General web-search snippets are never used as product data.

import { lookupKeys } from './barcode.js';

const CACHE_KEY = 'scanwise.products.v1';
const CACHE_TTL_MS = 7 * 24 * 3600 * 1000; // product cache policy (separate from evidence cache)

function readCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY)) || {}; } catch { return {}; }
}

function writeCache(cache) {
  try {
    const entries = Object.entries(cache);
    // Bound the cache to the 40 most recent lookups.
    if (entries.length > 40) {
      entries.sort((a, b) => (b[1].retrievedAt || '').localeCompare(a[1].retrievedAt || ''));
      cache = Object.fromEntries(entries.slice(0, 40));
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch { /* quota — cache is best-effort */ }
}

/** Map an Open Food Facts record to the ScanWise product shape. */
export function mapOffProduct(off, barcode) {
  if (!off) return null;
  const n = off.nutriments || {};
  const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

  // Serving grams, when OFF discloses a weight-based serving size.
  const servingGramsMatch = String(off.serving_size || '').match(/([\d.]+)\s*g/i);
  const servingGrams = servingGramsMatch ? parseFloat(servingGramsMatch[1]) : null;

  // Per-serving value: prefer OFF's own _serving figure; otherwise DERIVE it
  // from the per-100g figure and the disclosed serving size (deterministic
  // arithmetic, flagged as derived). With neither, stay null — never guess.
  let basis = null;
  const perServingRaw = (k) => {
    const direct = num(n[`${k}_serving`]);
    if (direct !== null) { basis = basis || 'serving'; return direct; }
    const per100 = num(n[`${k}_100g`]);
    if (per100 !== null && servingGrams) {
      basis = 'derived_from_100g';
      return per100 * (servingGrams / 100);
    }
    return null;
  };
  const perServing = (k) => {
    const v = perServingRaw(k);
    return v === null ? null : Math.round(v * 100) / 100;
  };
  const per100g = (k) => num(n[`${k}_100g`]);

  const product = {
    nutritionPer100g: {
      calories: per100g('energy-kcal'),
      addedSugarGrams: per100g('added-sugars'),
      sugarsGrams: per100g('sugars'),
      sodiumMg: per100g('sodium') !== null ? Math.round(per100g('sodium') * 1000) : null,
      saturatedFatGrams: per100g('saturated-fat'),
      fiberGrams: per100g('fiber'),
      proteinGrams: per100g('proteins'),
    },
    nutritionBasis: null, // set below after perServing() calls run
    servingGrams,
    source: 'openfoodfacts',
    sourceProductId: off.code || barcode,
    barcode: off.code || barcode,
    productName: off.product_name || '',
    brand: off.brands || '',
    packageSize: off.quantity || '',
    servingSize: off.serving_size || '',
    ingredientsText: off.ingredients_text_en || off.ingredients_text || '',
    allergensText: (off.allergens_tags || []).map((t) => t.replace(/^en:/, '')).join(', '),
    imageUrl: off.image_front_small_url || off.image_url || null,
    nutrition: (() => {
      const sodiumG = perServingRaw('sodium'); // OFF sodium is in grams; convert before rounding
      const nut = {
        calories: perServing('energy-kcal'),
        addedSugarGrams: perServing('added-sugars'),
        sugarsGrams: perServing('sugars'),
        sodiumMg: sodiumG !== null ? Math.round(sodiumG * 1000) : null,
        saturatedFatGrams: perServing('saturated-fat'),
        fiberGrams: perServing('fiber'),
        proteinGrams: perServing('proteins'),
      };
      return nut;
    })(),
    sourceLastUpdated: off.last_modified_t ? new Date(off.last_modified_t * 1000).toISOString() : null,
    retrievedAt: new Date().toISOString(),
  };
  product.nutritionBasis = basis; // 'serving' | 'derived_from_100g' | null
  return product;
}

async function fetchOpenFoodFacts(code) {
  const fields = [
    'code', 'product_name', 'brands', 'quantity', 'serving_size',
    'ingredients_text', 'ingredients_text_en', 'allergens_tags',
    'image_front_small_url', 'image_url', 'nutriments', 'last_modified_t',
  ].join(',');
  const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${fields}`, {
    headers: { Accept: 'application/json' },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Open Food Facts returned HTTP ${res.status}`);
  const data = await res.json();
  if (data.status === 0 || !data.product) return null;
  return mapOffProduct(data.product, code);
}

/**
 * Look up a normalized barcode through the source hierarchy.
 * @returns {Promise<{ product: object|null, source: string, fromCache: boolean, error?: string }>}
 */
export async function lookupProduct(normalizedBarcode) {
  const cache = readCache();

  // 1. Local cache
  for (const key of lookupKeys(normalizedBarcode)) {
    const hit = cache[key];
    if (hit && Date.now() - new Date(hit.retrievedAt).getTime() < CACHE_TTL_MS) {
      return { product: hit, source: 'cache', fromCache: true };
    }
  }

  // 2. Open Food Facts
  let lastError = null;
  for (const key of lookupKeys(normalizedBarcode)) {
    try {
      const product = await fetchOpenFoodFacts(key);
      if (product) {
        cache[key] = product;
        writeCache(cache);
        return { product, source: 'openfoodfacts', fromCache: false };
      }
    } catch (err) {
      lastError = err.message;
    }
  }

  // 3./4. USDA FoodData Central & licensed databases: not configured in
  // this build (they require server-side keys — see .env.example). The
  // pipeline continues with label-only analysis rather than guessing.
  return {
    product: null,
    source: 'none',
    fromCache: false,
    error: lastError || 'No verified database record found for this barcode.',
  };
}
