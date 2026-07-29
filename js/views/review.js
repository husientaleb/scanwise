// review.js — the OCR review screen: the user checks and corrects extracted
// text before any analysis runs. Nothing is analyzed until confirmed here.

import { esc, toast, mainConcernOf } from '../ui.js';
import { session } from '../main.js';
import { analyzeProduct } from '../analyzer.js';
import { analyzeWithFallback } from '../ai.js';
import { getPrefs, saveScan, newId, incrementScanUsage } from '../store.js';

export function renderReview(el) {
  const extracted = session.pendingExtracted;
  if (!extracted) {
    location.hash = '#/scan';
    return;
  }
  const fromOcr = extracted.source === 'ocr';

  el.innerHTML = `
    <a href="#/scan" class="small">← Back to scan</a>
    <h1 style="margin-top:8px;">${fromOcr ? 'Check what we read' : 'Enter the label text'}</h1>
    <p class="muted small">${fromOcr
      ? 'OCR isn\'t perfect — please correct anything that looks wrong before analyzing. Fields we couldn\'t read are left blank, not guessed.'
      : 'Type or paste the label text. Only the ingredient list is required; more detail gives a more complete report.'}</p>

    ${fromOcr && extracted.ocrConfidence !== null ? `
      <p class="small">
        <span class="badge ${extracted.ocrConfidence >= 0.75 ? 'badge-green' : extracted.ocrConfidence >= 0.55 ? 'badge-amber' : 'badge-red'}">
          Text recognition: ${Math.round(extracted.ocrConfidence * 100)}% confident
        </span>
      </p>` : ''}

    ${session.pendingImage ? `
      <details class="card" style="padding:12px;">
        <summary style="cursor:pointer;font-weight:600;">View your photo</summary>
        <img src="${esc(session.pendingImage)}" alt="Your uploaded label photo" style="width:100%;border-radius:12px;margin-top:10px;" />
      </details>` : ''}

    <form id="review-form" class="card" novalidate>
      <label class="field-label" for="f-name">Product name</label>
      <input type="text" id="f-name" value="${esc(extracted.productName)}" placeholder="e.g. Crunchy Oat Squares" autocomplete="off" />

      <label class="field-label" for="f-brand" style="margin-top:12px;">Brand <span class="muted">(optional)</span></label>
      <input type="text" id="f-brand" value="${esc(extracted.brand)}" placeholder="e.g. Hillside Foods" autocomplete="off" />

      <label class="field-label" for="f-ingredients" style="margin-top:12px;">Ingredient list</label>
      <textarea id="f-ingredients" placeholder="Ingredients: whole grain oats, sugar, salt…">${esc(extracted.ingredientsText)}</textarea>

      <label class="field-label" for="f-nutrition" style="margin-top:12px;">Nutrition facts <span class="muted">(optional)</span></label>
      <textarea id="f-nutrition" placeholder="Serving size 1 cup (39 g). Calories 150. Sodium 190 mg. Includes 14 g added sugars. Dietary fiber 1 g. Protein 2 g.">${esc(extracted.nutritionText)}</textarea>
      <p class="small muted" style="margin-top:6px;">Anything left blank is reported as "not available" — ScanWise never fills in numbers it didn't read.</p>

      <button type="submit" class="btn btn-primary btn-big btn-block" style="margin-top:14px;" id="analyze-btn">Analyze product</button>
    </form>
  `;

  el.querySelector('#review-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = {
      productName: el.querySelector('#f-name').value.trim(),
      brand: el.querySelector('#f-brand').value.trim(),
      ingredientsText: el.querySelector('#f-ingredients').value.trim(),
      nutritionText: el.querySelector('#f-nutrition').value.trim(),
    };
    if (!input.ingredientsText && !input.nutritionText) {
      toast('Add an ingredient list or nutrition facts so there\'s something to analyze.', true);
      return;
    }

    const btn = el.querySelector('#analyze-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" style="width:20px;height:20px;border-width:2.5px;" aria-hidden="true"></span> Analyzing…';

    try {
      // Try the deployed AI endpoint; fall back to the on-device analyzer.
      // Either way the score comes from the transparent local rubric.
      const { analysis, scoreDetail, engine, engineNote } =
        await analyzeWithFallback(input, session.pendingImage, getPrefs(), analyzeProduct);
      const scan = {
        id: newId(),
        productName: analysis.productName || 'Unnamed product',
        brand: analysis.brand,
        thumbnail: session.pendingThumbnail || null,
        extracted: { ...input, source: extracted.source },
        analysis,
        scoreDetail,
        engine,
        engineNote,
        overallScore: analysis.overallScore,
        mainConcern: mainConcernOf(scoreDetail),
        createdAt: new Date().toISOString(),
        isFavorite: false,
        demo: false,
      };
      saveScan(scan);
      incrementScanUsage();
      session.pendingExtracted = null;
      session.pendingImage = null;
      session.pendingThumbnail = null;
      location.hash = `#/report/${scan.id}`;
    } catch (err) {
      console.error(err);
      btn.disabled = false;
      btn.textContent = 'Analyze product';
      toast('Analysis failed unexpectedly. Please try again.', true);
    }
  });
}
