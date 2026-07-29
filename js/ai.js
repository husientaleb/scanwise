// ai.js — client for the optional server-side AI analysis (/api/analyze).
//
// The app never depends on this: any failure (static hosting without the
// function, no API key configured, offline, timeout, invalid AI JSON) falls
// back to the local analyzer. When the AI path succeeds, its output is
// schema-validated and the overall score is ALWAYS recomputed by the local
// transparent scoring utility — the AI explains, it does not grade.

import { validateAnalysis } from './schema.js';
import { scoreProduct } from './scoring.js';
import { mainConcernOf } from './ui.js';

const TIMEOUT_MS = 45000;

/**
 * Ask the server AI to analyze a label.
 * @param {{ image?: string|null, extracted: object }} payload
 * @returns {Promise<object>} schema-valid analysis
 * @throws {Error} with a user-friendly message when unavailable/invalid
 */
export async function analyzeViaApi({ image, extracted }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res;
  try {
    res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ image: image || undefined, extracted }),
      signal: controller.signal,
    });
  } catch (err) {
    throw new Error(err.name === 'AbortError'
      ? 'AI analysis timed out.'
      : 'AI analysis is unreachable (offline or not deployed).');
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    let msg = `AI analysis unavailable (HTTP ${res.status}).`;
    try {
      const body = await res.json();
      if (body && body.error) msg = body.error;
    } catch { /* non-JSON error body */ }
    throw new Error(msg);
  }

  const body = await res.json();
  if (!body.ok || !body.analysis) throw new Error(body.error || 'AI analysis returned no result.');

  const check = validateAnalysis(body.analysis);
  if (!check.ok) {
    console.warn('AI analysis failed schema validation:', check.errors);
    throw new Error('The AI response did not match the expected format.');
  }
  return body.analysis;
}

/**
 * Full analysis orchestration: try the AI endpoint, fall back to the local
 * analyzer. Regardless of engine, the score comes from scoring.js.
 *
 * @param {object} input   { productName, brand, ingredientsText, nutritionText }
 * @param {string|null} image  data URL of the label photo, if any
 * @param {object} prefs   user preferences
 * @param {function} localAnalyze  the local analyzeProduct function (injected to avoid a cycle)
 * @returns {Promise<{ analysis, scoreDetail, engine: 'ai'|'local', engineNote: string }>}
 */
export async function analyzeWithFallback(input, image, prefs, localAnalyze) {
  try {
    const aiAnalysis = await analyzeViaApi({ image, extracted: input });
    // Recompute the score transparently from the AI's extracted data.
    const scoreDetail = scoreProduct(aiAnalysis.nutrition, aiAnalysis.ingredients, prefs);
    const analysis = {
      ...aiAnalysis,
      overallScore: scoreDetail.score,
      overallLabel: scoreDetail.label,
    };
    return {
      analysis,
      scoreDetail,
      engine: 'ai',
      engineNote: 'AI-assisted reading, validated against the ScanWise schema. Score computed by the transparent ScanWise rubric.',
    };
  } catch (err) {
    const { analysis, scoreDetail } = localAnalyze(input, prefs);
    return {
      analysis,
      scoreDetail,
      engine: 'local',
      engineNote: `Analyzed with the built-in ScanWise engine on your device. (AI path: ${err.message})`,
    };
  }
}

export { mainConcernOf };
