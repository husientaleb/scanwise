// api/analyze.js — Vercel serverless function: vision-capable AI analysis.
//
// POST { image?: dataUrl, extracted?: { productName, brand, ingredientsText, nutritionText } }
// → { ok: true, analysis } (schema-valid) | { ok: false, error }
//
// The API key stays server-side (ANTHROPIC_API_KEY env var — see .env.example).
// The client works fully without this endpoint via its local analyzer; when
// deployed with a key, this provides richer extraction directly from the photo.
// Responses are validated against the same schema the client enforces; invalid
// AI JSON is rejected rather than displayed.

const MODEL = 'claude-sonnet-5';

const SYSTEM_PROMPT = `You are the EXPLANATION layer of ScanWise, a consumer food-label app.
You will receive a photo of a food label and/or user-confirmed label text, and often
a "retrieved" block containing verified product-database records, reconciled fields,
and knowledge-base ingredient entries with evidence grades.

Your job is to read the label accurately, then summarize, explain in plain language,
and communicate uncertainty. Your job is NOT to invent missing evidence, assign
unverified regulatory status, estimate undisclosed ingredient quantities, diagnose
disease, declare a product medically safe, or override deterministic calculations.
When a "retrieved" block is present, prefer its facts over your own recall; when the
label conflicts with a database record, the label wins.

Rules you must follow:
- Return ONLY valid JSON matching the schema provided. No markdown, no commentary.
- State uncertainty: if the image is unclear, lower "confidence" and add a note to "limitations".
- Never fabricate nutrition values. Use null for anything you cannot read.
- No medical diagnoses and no fear-based language ("toxic", "poison", "dangerous") unless a verified, regulator-recognized safety issue exists.
- Do not imply an ingredient is unhealthy just because its name sounds chemical.
- Explain that dose, serving size, and overall diet matter.
- Keep food-allergy concerns separate from general nutrition concerns.
- Do not claim an ingredient causes cancer, infertility, behavioral disorders, or other diseases without strong, reliable evidence; describe evidence honestly (e.g., "regulators permit X at current levels; some studies at high doses…").
- If asked about a diagnosed condition, severe allergy, pregnancy, or medications, recommend professional advice in "limitations".
- allergens[] may only contain: Milk, Eggs, Peanuts, Tree nuts, Soy, Wheat, Fish, Shellfish, Sesame.
- keyFindings: at most 5, each a short sentence with a concrete number when available.
- ingredient category must be one of: Common food ingredient, Nutrient, Preservative, Sweetener, Color, Flavoring, Emulsifier, Allergen, Other.
- concernLevel must be one of: low, moderate, high, unknown.
- overallLabel must be one of: Strong choice, Reasonable choice, Consider occasionally, Compare alternatives.`;

const JSON_SCHEMA_HINT = `{
  "productName": "", "brand": "", "confidence": 0.0, "overallScore": 7.0,
  "overallLabel": "", "summary": "", "keyFindings": [],
  "ingredients": [{ "name": "", "category": "", "purpose": "",
    "plainLanguageExplanation": "", "evidenceSummary": "",
    "whoShouldPayAttention": "", "concernLevel": "low" }],
  "allergens": [],
  "nutrition": { "servingSize": "", "calories": null, "addedSugarGrams": null,
    "sodiumMg": null, "saturatedFatGrams": null, "fiberGrams": null, "proteinGrams": null },
  "alternativeGuidance": [], "limitations": []
}`;

// Minimal server-side mirror of js/schema.js (kept dependency-free; serverless
// functions here don't share the client module graph).
function validateShape(a) {
  if (!a || typeof a !== 'object') return false;
  const okStr = (v) => typeof v === 'string';
  return okStr(a.productName) && okStr(a.summary) &&
    typeof a.confidence === 'number' && typeof a.overallScore === 'number' &&
    Array.isArray(a.keyFindings) && Array.isArray(a.ingredients) &&
    Array.isArray(a.allergens) && Array.isArray(a.alternativeGuidance) &&
    Array.isArray(a.limitations) && a.nutrition && typeof a.nutrition === 'object';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'POST only' });
    return;
  }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(503).json({
      ok: false,
      error: 'AI analysis is not configured on this deployment. The app\'s built-in analyzer still works.',
    });
    return;
  }

  try {
    const { image, extracted, retrieved, validationErrors } = req.body || {};
    if (!image && !extracted) {
      res.status(400).json({ ok: false, error: 'Provide an image and/or extracted label text.' });
      return;
    }

    const content = [];
    if (image) {
      const match = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(image);
      if (!match) {
        res.status(400).json({ ok: false, error: 'Image must be a base64 data URL (jpeg, png, or webp).' });
        return;
      }
      content.push({ type: 'image', source: { type: 'base64', media_type: match[1], data: match[2] } });
    }
    content.push({
      type: 'text',
      text: `Analyze this food label.` +
        (extracted ? `\nUser-confirmed text (authoritative where it conflicts with the image):\n${JSON.stringify(extracted)}` : '') +
        (retrieved ? `\nRetrieved verified data (prefer these facts; do not contradict them):\n${JSON.stringify(retrieved).slice(0, 12000)}` : '') +
        (validationErrors ? `\nYour previous response failed schema validation with these errors — fix them:\n${JSON.stringify(validationErrors)}` : '') +
        `\nReturn JSON exactly matching this schema:\n${JSON_SCHEMA_HINT}`,
    });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content }],
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error('Anthropic API error:', response.status, detail.slice(0, 500));
      res.status(502).json({ ok: false, error: 'The AI service returned an error. Please try again.' });
      return;
    }

    const data = await response.json();
    const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
    let analysis;
    try {
      analysis = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, ''));
    } catch {
      res.status(502).json({ ok: false, error: 'The AI returned invalid JSON. Please retry the analysis.' });
      return;
    }
    if (!validateShape(analysis)) {
      res.status(502).json({ ok: false, error: 'The AI response did not match the expected format. Please retry.' });
      return;
    }

    res.status(200).json({ ok: true, analysis });
  } catch (err) {
    console.error('analyze failed:', err);
    res.status(500).json({ ok: false, error: 'Analysis failed unexpectedly. Please try again.' });
  }
}
