// normalize.js — ingredient name normalization: E-numbers, chemical
// synonyms, and label aliases. Normalization maps names to a shared entity
// WITHOUT erasing meaningful distinctions (nitrite ≠ nitrate; each phosphate
// salt keeps its identity). When uncertain, the original name is retained
// and `confident` is false.

// E-number → canonical entity. Kept intentionally specific: E250 and E251
// map to different entities.
export const E_NUMBERS = {
  e100: 'curcumin', e101: 'riboflavin (vitamin B2)', e102: 'tartrazine (Yellow 5)',
  e110: 'sunset yellow (Yellow 6)', e120: 'carmine', e129: 'allura red (Red 40)',
  e132: 'indigotine (Blue 2)', e133: 'brilliant blue (Blue 1)',
  e150a: 'caramel color', e150d: 'caramel color (sulfite ammonia)',
  e160a: 'beta-carotene', e160b: 'annatto', e162: 'beet red', e171: 'titanium dioxide',
  e200: 'sorbic acid', e202: 'potassium sorbate', e210: 'benzoic acid', e211: 'sodium benzoate',
  e220: 'sulfur dioxide', e223: 'sodium metabisulfite',
  e250: 'sodium nitrite', e251: 'sodium nitrate',
  e260: 'acetic acid', e296: 'malic acid',
  e300: 'ascorbic acid (vitamin C)', e306: 'tocopherols (vitamin E)',
  e319: 'TBHQ', e320: 'BHA', e321: 'BHT', e322: 'lecithins',
  e330: 'citric acid', e331: 'sodium citrate',
  e407: 'carrageenan', e410: 'locust bean gum', e412: 'guar gum', e415: 'xanthan gum',
  e418: 'gellan gum', e440: 'pectin', e460: 'cellulose', e466: 'carboxymethylcellulose',
  e471: 'mono- and diglycerides', e481: 'sodium stearoyl lactylate',
  e500: 'sodium bicarbonate', e501: 'potassium carbonate', e503: 'ammonium carbonate',
  e621: 'monosodium glutamate', e627: 'disodium guanylate', e631: 'disodium inosinate',
  e950: 'acesulfame potassium', e951: 'aspartame', e952: 'cyclamate', e954: 'saccharin',
  e955: 'sucralose', e960: 'steviol glycosides', e965: 'maltitol', e967: 'xylitol', e968: 'erythritol',
};

// Alias → normalized entity. One direction only; distinct chemicals are
// NEVER merged (no entry maps nitrite to nitrate, and phosphate salts and
// B12 forms keep their exact names).
export const INGREDIENT_ALIASES = {
  'ascorbic acid': 'vitamin C',
  'sodium ascorbate': 'vitamin C (sodium salt)',
  'sodium chloride': 'salt',
  'tocopherols': 'vitamin E compounds',
  'mixed tocopherols': 'vitamin E compounds',
  'alpha-tocopherol': 'vitamin E compounds',
  'hfcs': 'high fructose corn syrup',
  'high-fructose corn syrup': 'high fructose corn syrup',
  'glucose-fructose syrup': 'high fructose corn syrup',
  'cobalamin': 'vitamin B12 (cobalamin)',
  'cyanocobalamin': 'vitamin B12 (cyanocobalamin)',   // distinct forms stay identifiable
  'methylcobalamin': 'vitamin B12 (methylcobalamin)',
  'thiamin mononitrate': 'vitamin B1 (thiamin)',
  'thiamine mononitrate': 'vitamin B1 (thiamin)',
  'pyridoxine hydrochloride': 'vitamin B6 (pyridoxine)',
  'cholecalciferol': 'vitamin D3',
  'ergocalciferol': 'vitamin D2',
  'niacinamide': 'vitamin B3 (niacinamide)',
  'folic acid': 'folate (folic acid)',
  'reduced iron': 'iron (reduced)',
  'ferrous sulfate': 'iron (ferrous sulfate)',
  'sodium bicarbonate': 'baking soda',
  'msg': 'monosodium glutamate',
  'vitamin c': 'vitamin C',
  'aspartame': 'aspartame',
  'oleic sunflower oil': 'sunflower oil',
  'high oleic sunflower oil': 'sunflower oil',
  'evaporated cane juice': 'cane sugar',
  'dehydrated cane juice': 'cane sugar',
  'natural vanilla flavor': 'natural vanilla flavor', // NOT merged with vanilla extract
  'vanilla extract': 'vanilla extract',
};

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Normalize a single label name.
 * @returns {{ labelName, normalizedName, eNumber: string|null, confident: boolean }}
 */
export function normalizeIngredientName(labelName) {
  const cleaned = labelName.trim().replace(/\s+/g, ' ');
  const lower = cleaned.toLowerCase();

  // E-number anywhere in the name ("colour (E129)", "E-322", "INS 322").
  const eMatch = lower.match(/\b(?:e|ins)[\s-]?(\d{3}[a-d]?)\b/i);
  if (eMatch) {
    const code = `e${eMatch[1].toLowerCase()}`;
    const entity = E_NUMBERS[code];
    if (entity) {
      return { labelName: cleaned, normalizedName: entity, eNumber: code.toUpperCase(), confident: true };
    }
    return { labelName: cleaned, normalizedName: cleaned, eNumber: code.toUpperCase(), confident: false };
  }

  // Exact alias, then whole-word alias inside the name (longest first).
  if (INGREDIENT_ALIASES[lower]) {
    return { labelName: cleaned, normalizedName: INGREDIENT_ALIASES[lower], eNumber: null, confident: true };
  }
  const aliases = Object.keys(INGREDIENT_ALIASES).sort((a, b) => b.length - a.length);
  for (const alias of aliases) {
    if (new RegExp(`(^|[^a-z])${escapeRe(alias)}([^a-z]|$)`, 'i').test(lower)) {
      return { labelName: cleaned, normalizedName: INGREDIENT_ALIASES[alias], eNumber: null, confident: true };
    }
  }

  // No mapping — keep the printed name; normalized identity unconfirmed
  // (which for common whole foods is simply the name itself).
  return { labelName: cleaned, normalizedName: cleaned, eNumber: null, confident: false };
}
