// claims.js — front-of-package marketing-claim analyzer. Compares detected
// claims against the verified label data and classifies each one honestly:
//
//   supported          — the visible label backs it up
//   contradicted       — the visible label appears to disagree (worded
//                        carefully; formulations and definitions vary)
//   regulated          — the term has a legal definition (context provided)
//   context_dependent  — true-ish but needs context to mean anything
//   marketing          — primarily marketing language with no fixed meaning
//   unverifiable       — cannot be checked from the label alone
//
// The analyzer never accuses a company of deception — it reports what the
// label shows next to what the claim implies.

const known = (v) => v !== null && v !== undefined && !Number.isNaN(v);

// Each rule: pattern, then verdict(nutrition, ingredients) → {verdict, note}
export const CLAIM_RULES = [
  {
    id: 'no_added_sugar',
    pattern: /no added sugars?|without added sugars?|0g? added sugars?/i,
    label: 'No added sugar',
    evaluate: (n) => {
      if (known(n.addedSugarGrams) && n.addedSugarGrams > 0) {
        return { verdict: 'contradicted', note: `The nutrition panel lists ${n.addedSugarGrams} g added sugars per serving.` };
      }
      if (known(n.addedSugarGrams) && n.addedSugarGrams === 0) {
        return { verdict: 'supported', note: 'The nutrition panel lists 0 g added sugars. Note the product can still contain natural sugars.' };
      }
      return { verdict: 'unverifiable', note: 'Added sugars were not readable from this label.' };
    },
  },
  {
    id: 'sugar_free',
    pattern: /sugar[- ]free|zero sugar|0 sugar/i,
    label: 'Sugar-free',
    evaluate: (n) => {
      if (known(n.addedSugarGrams) && n.addedSugarGrams > 0.5) {
        return { verdict: 'contradicted', note: `"Sugar-free" is regulated (under 0.5 g per serving in the US); this label shows ${n.addedSugarGrams} g added sugars.` };
      }
      return { verdict: 'regulated', note: 'US rule: under 0.5 g total sugars per serving. Often paired with low-calorie sweeteners — check the ingredient list.' };
    },
  },
  {
    id: 'low_sodium',
    pattern: /low sodium|low in sodium/i,
    label: 'Low sodium',
    evaluate: (n) => {
      if (known(n.sodiumMg)) {
        return n.sodiumMg <= 140
          ? { verdict: 'supported', note: `Meets the US regulatory definition (≤140 mg per serving): this label shows ${n.sodiumMg} mg.` }
          : { verdict: 'contradicted', note: `"Low sodium" is defined as ≤140 mg per serving in the US; this label shows ${n.sodiumMg} mg.` };
      }
      return { verdict: 'regulated', note: 'US rule: ≤140 mg sodium per serving. Sodium was not readable from this label.' };
    },
  },
  {
    id: 'high_protein',
    pattern: /high protein|protein packed|packed with protein|excellent source of protein/i,
    label: 'High protein',
    evaluate: (n) => {
      if (known(n.proteinGrams)) {
        return n.proteinGrams >= 10
          ? { verdict: 'supported', note: `≥10 g per serving (20% DV) qualifies as "high" in the US; this label shows ${n.proteinGrams} g.` }
          : { verdict: 'context_dependent', note: `This label shows ${n.proteinGrams} g protein per serving — below the 10 g (20% DV) bar usually required for a "high protein" claim.` };
      }
      return { verdict: 'unverifiable', note: 'Protein was not readable from this label.' };
    },
  },
  {
    id: 'gluten_free',
    pattern: /gluten[- ]free/i,
    label: 'Gluten-free',
    evaluate: (n, ings) => {
      const glutenHit = ings.find((i) => i.gluten);
      if (glutenHit) {
        return { verdict: 'contradicted', note: `The ingredient list includes ${glutenHit.name.toLowerCase()}, a gluten source. Double-check the package — this may be an OCR error or a certified gluten-free variant.` };
      }
      return { verdict: 'regulated', note: 'Regulated claim (<20 ppm gluten in the US/EU). The ingredient list shows no gluten sources, but certification testing is what actually backs this claim.' };
    },
  },
  {
    id: 'whole_grain',
    pattern: /made with whole grains?|whole grain/i,
    label: 'Made with whole grains',
    evaluate: (n, ings) => {
      const first = (ings[0]?.rawName || '').toLowerCase();
      if (/whole/.test(first)) {
        return { verdict: 'supported', note: 'A whole grain is the first ingredient — the strongest version of this claim.' };
      }
      const anywhere = ings.some((i) => /whole/.test((i.rawName || '').toLowerCase()));
      return anywhere
        ? { verdict: 'context_dependent', note: '"Made with" only requires some whole grain. Here it is not the first ingredient, so the amount may be small.' }
        : { verdict: 'unverifiable', note: 'No whole-grain ingredient was identified in the readable list.' };
    },
  },
  {
    id: 'no_artificial_flavors',
    pattern: /no artificial flavou?rs?/i,
    label: 'No artificial flavors',
    evaluate: (n, ings) => {
      const hit = ings.find((i) => /artificial flavou?r/i.test(i.rawName || ''));
      return hit
        ? { verdict: 'contradicted', note: 'The ingredient list includes an artificial flavor.' }
        : { verdict: 'supported', note: 'No artificial flavor appears in the readable ingredient list. Note "natural flavors" may still be present — a different, also-unspecified category.' };
    },
  },
  {
    id: 'no_preservatives',
    pattern: /no preservatives?|preservative[- ]free/i,
    label: 'No preservatives',
    evaluate: (n, ings) => {
      const hit = ings.find((i) => i.category === 'Preservative' && i.concernLevel !== 'unknown' && !/vitamin|tocopherol|vinegar|citric/i.test(i.name));
      return hit
        ? { verdict: 'contradicted', note: `The ingredient list includes ${hit.name.toLowerCase()}, generally used as a preservative.` }
        : { verdict: 'supported', note: 'No conventional preservative appears in the readable list. Acids like citric acid or vitamin E can still play a preserving role.' };
    },
  },
  {
    id: 'natural',
    pattern: /\ball[- ]natural\b|\bnatural\b/i,
    label: 'Natural',
    evaluate: () => ({
      verdict: 'marketing',
      note: '"Natural" has no full legal definition for most foods in the US. It says little about nutrition — the ingredient list and nutrition panel are more informative.',
    }),
  },
  {
    id: 'organic',
    pattern: /\borganic\b/i,
    label: 'Organic',
    evaluate: () => ({
      verdict: 'regulated',
      note: 'USDA Organic is a certified claim about farming practices, not about nutrition. Look for the certification seal; the word alone is not the certification.',
    }),
  },
  {
    id: 'keto',
    pattern: /\bketo\b|keto[- ]friendly/i,
    label: 'Keto',
    evaluate: () => ({
      verdict: 'marketing',
      note: '"Keto" is not a regulated term. Check net carbohydrates and added sugars yourself if you follow a ketogenic diet.',
    }),
  },
  {
    id: 'heart_healthy',
    pattern: /heart[- ]healthy|good for your heart/i,
    label: 'Heart healthy',
    evaluate: () => ({
      verdict: 'context_dependent',
      note: 'Some heart-health claims are FDA-authorized with strict criteria; many are loose marketing. Sodium, saturated fat, and fiber lines are the numbers to check.',
    }),
  },
  {
    id: 'low_carb',
    pattern: /low[- ]carb/i,
    label: 'Low carb',
    evaluate: () => ({
      verdict: 'marketing',
      note: '"Low carb" has no US regulatory definition — compare the total-carbohydrate line yourself.',
    }),
  },
];

export const VERDICT_META = {
  supported: { label: 'Supported by the label', cls: 'badge-green' },
  contradicted: { label: 'Label appears to disagree', cls: 'badge-red' },
  regulated: { label: 'Regulated term', cls: 'badge-blue' },
  context_dependent: { label: 'Context-dependent', cls: 'badge-amber' },
  marketing: { label: 'Marketing language', cls: 'badge-amber' },
  unverifiable: { label: 'Cannot verify from label', cls: 'badge-gray' },
};

/**
 * Analyze marketing claims found in free text (front-of-package claims the
 * user typed, plus the product name).
 * @returns {Array<{id,label,claimText,verdict,note}>}
 */
export function analyzeClaims(text, analysis) {
  const source = String(text || '');
  if (!source.trim()) return [];
  const results = [];
  for (const rule of CLAIM_RULES) {
    const m = source.match(rule.pattern);
    if (!m) continue;
    const { verdict, note } = rule.evaluate(analysis?.nutrition || {}, analysis?.ingredients || []);
    results.push({ id: rule.id, label: rule.label, claimText: m[0], verdict, note });
  }
  return results;
}
