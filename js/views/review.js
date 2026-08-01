// review.js — the review screen: the user checks and corrects extracted
// text, optionally identifies the exact product by barcode, and confirms
// before any analysis runs. Nothing is analyzed until confirmed here.
//
// Pipeline stages here: barcode validation → verified-database lookup →
// product-match scoring → field-level reconciliation (label wins; database
// fills gaps; conflicts surfaced).

import { esc, toast, mainConcernOf } from '../ui.js';
import { session } from '../main.js';
import { analyzeProduct, parseNutrition } from '../analyzer.js';
import { analyzeWithFallback } from '../ai.js';
import { getPrefs, saveScan, newId, incrementScanUsage } from '../store.js';
import { normalizeBarcode } from '../barcode.js';
import { lookupProduct } from '../product-db.js';
import { scoreProductMatch } from '../matching.js';
import { reconcileFields, meaningfulConflicts } from '../reconcile.js';

export function renderReview(el) {
  const extracted = session.pendingExtracted;
  if (!extracted) {
    location.hash = '#/scan';
    return;
  }
  const fromOcr = extracted.source === 'ocr';

  // Pipeline state for this review session.
  const pipe = {
    barcode: session.pendingBarcode || null, // { original, normalized, format, valid, confidence, source }
    product: null,
    lookupSource: null,
    match: null,
    accepted: false,
  };

  el.innerHTML = `
    <a href="#/scan" class="small">← Back to scan</a>
    <h1 style="margin-top:8px;">${fromOcr ? 'Check what we read' : 'Enter the label text'}</h1>
    <p class="muted small">${fromOcr
      ? 'OCR isn\'t perfect — please correct anything that looks wrong before analyzing. Fields we couldn\'t read are left blank, not guessed.'
      : 'Type or paste the label text. Only the ingredient list is required; more detail gives a more complete report.'}</p>

    <div id="capture-flags" class="row" style="flex-wrap:wrap; gap:6px; margin-bottom:10px;"></div>

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

    <section class="card" aria-labelledby="pid-title">
      <h2 id="pid-title" style="font-size:1.05rem;">Identify the exact product <span class="muted small">(optional)</span></h2>
      <p class="small muted">A barcode lets ScanWise match this product against the Open Food Facts database and fill in anything your photo missed.</p>
      <label class="field-label" for="f-barcode">Barcode (UPC/EAN)</label>
      <div class="row">
        <input type="text" id="f-barcode" inputmode="numeric" placeholder="e.g. 038000198817" value="${esc(pipe.barcode?.normalized || '')}" autocomplete="off" style="flex:1;" />
        <button type="button" class="btn btn-secondary" id="btn-lookup">Look up</button>
      </div>
      <p class="small" id="barcode-status" style="margin:8px 0 0;">${pipe.barcode
        ? `Detected from your photo (${esc(pipe.barcode.format || 'unknown format')}, ${esc(pipe.barcode.confidence || 'medium')} confidence).`
        : 'No barcode detected in the photo — type it in, or skip this step.'}</p>
      <div id="match-card"></div>
    </section>

    <form id="review-form" class="card" novalidate>
      <label class="field-label" for="f-name">Product name</label>
      <input type="text" id="f-name" value="${esc(extracted.productName)}" placeholder="e.g. Crunchy Oat Squares" autocomplete="off" />

      <label class="field-label" for="f-brand" style="margin-top:12px;">Brand <span class="muted">(optional)</span></label>
      <input type="text" id="f-brand" value="${esc(extracted.brand)}" placeholder="e.g. Hillside Foods" autocomplete="off" />

      <label class="field-label" for="f-claims" style="margin-top:12px;">Front-of-package claims <span class="muted">(optional)</span></label>
      <input type="text" id="f-claims" value="${esc(extracted.claimsText || '')}" placeholder='e.g. "No added sugar · High protein · All natural"' autocomplete="off" />
      <p class="small muted" style="margin:4px 0 0;">ScanWise checks marketing claims against the actual label.</p>

      <label class="field-label" for="f-ingredients" style="margin-top:12px;">Ingredient list</label>
      <textarea id="f-ingredients" placeholder="Ingredients: whole grain oats, sugar, salt…">${esc(extracted.ingredientsText)}</textarea>

      <label class="field-label" for="f-nutrition" style="margin-top:12px;">Nutrition facts <span class="muted">(optional)</span></label>
      <textarea id="f-nutrition" placeholder="Serving size 1 cup (39 g). Calories 150. Sodium 190 mg. Includes 14 g added sugars. Dietary fiber 1 g. Protein 2 g.">${esc(extracted.nutritionText)}</textarea>
      <p class="small muted" style="margin-top:6px;">Anything left blank is reported as "not available" — ScanWise never fills in numbers it didn't read. If you accept a database match above, the database may fill blank fields (clearly labeled), but it never overrides what your package says.</p>

      <button type="submit" class="btn btn-primary btn-big btn-block" style="margin-top:14px;" id="analyze-btn">Analyze product</button>
    </form>
  `;

  const $ = (sel) => el.querySelector(sel);

  function refreshCaptureFlags() {
    const flags = [];
    if (!$('#f-ingredients').value.trim()) flags.push(['badge-amber', 'Ingredient list not captured']);
    if (!$('#f-nutrition').value.trim()) flags.push(['badge-amber', 'Nutrition Facts panel not captured']);
    if (!$('#f-barcode').value.trim()) flags.push(['badge-gray', 'Barcode not provided']);
    if (!/contains/i.test($('#f-ingredients').value)) flags.push(['badge-gray', 'Allergen statement not visible']);
    $('#capture-flags').innerHTML = flags.map(([cls, text]) => `<span class="badge ${cls}">${text}</span>`).join('');
  }
  refreshCaptureFlags();
  ['#f-ingredients', '#f-nutrition', '#f-barcode'].forEach((sel) =>
    $(sel).addEventListener('input', refreshCaptureFlags));

  function currentLabelData() {
    const nutritionParsed = parseNutrition($('#f-nutrition').value.trim());
    return {
      barcode: normalizeBarcode($('#f-barcode').value).normalized || null,
      productName: $('#f-name').value.trim(),
      brand: $('#f-brand').value.trim(),
      servingSize: nutritionParsed.servingSize || '',
      packageSize: '',
      ingredientsText: $('#f-ingredients').value.trim(),
      nutrition: nutritionParsed,
      ...nutritionParsed,
    };
  }

  function drawMatchCard() {
    const box = $('#match-card');
    if (!pipe.product) { box.innerHTML = ''; return; }
    const p = pipe.product;
    const m = pipe.match;
    const statusCls = m.status === 'confirmed' ? 'badge-green' : m.status === 'probable' ? 'badge-blue' : m.status === 'needs_confirmation' ? 'badge-amber' : 'badge-red';
    box.innerHTML = `
      <div style="border:1.5px solid var(--border); border-radius:var(--radius-sm); padding:12px; margin-top:12px;">
        <div class="row" style="align-items:flex-start;">
          ${p.imageUrl ? `<img src="${esc(p.imageUrl)}" alt="" style="width:52px;height:52px;object-fit:contain;border-radius:8px;background:#fff;" />` : ''}
          <div style="flex:1;min-width:0;">
            <strong>${esc(p.productName || 'Unnamed product')}</strong>
            <p class="small muted" style="margin:0;">${esc(p.brand || '')}${p.packageSize ? ` · ${esc(p.packageSize)}` : ''}</p>
            <p class="small" style="margin:6px 0 0;">
              <span class="badge ${statusCls}">${esc(m.statusLabel)} — ${Math.round(m.score * 100)}%</span>
              <span class="badge badge-gray">Open Food Facts${pipe.lookupSource === 'cache' ? ' (cached)' : ''}</span>
            </p>
          </div>
        </div>
        <p class="small muted" style="margin:8px 0;">Signals: ${m.components.filter((c) => c.scored).map((c) => `${c.signal} ${Math.round(c.similarity * 100)}%`).join(' · ') || 'barcode only'}. Retrieved ${new Date(p.retrievedAt).toLocaleDateString()}.</p>
        <div class="row" style="gap:8px;">
          <button type="button" class="btn ${pipe.accepted ? 'btn-primary' : 'btn-secondary'}" id="btn-accept" style="flex:1;">${pipe.accepted ? '✓ Using this product' : 'Yes, this is my product'}</button>
          <button type="button" class="btn btn-ghost" id="btn-reject" style="flex:1;">Not my product</button>
        </div>
        ${pipe.accepted ? '<p class="small muted" style="margin:8px 0 0;">Database values will fill blank fields only. Your package label always wins on conflicts, and conflicts are shown in the report.</p>' : ''}
      </div>`;
    $('#btn-accept')?.addEventListener('click', () => { pipe.accepted = true; drawMatchCard(); });
    $('#btn-reject')?.addEventListener('click', () => { pipe.accepted = false; pipe.product = null; pipe.match = null; drawMatchCard(); toast('Database match discarded — analyzing your label only.'); });
  }

  $('#btn-lookup').addEventListener('click', async () => {
    const raw = $('#f-barcode').value;
    const bc = normalizeBarcode(raw);
    const status = $('#barcode-status');
    if (!bc.normalized) { status.textContent = 'Enter the digits printed under the barcode.'; return; }
    pipe.barcode = { ...bc, confidence: bc.valid ? (pipe.barcode?.confidence || 'high') : 'low', source: pipe.barcode?.source || 'manual' };
    status.textContent = bc.valid
      ? `${bc.format} barcode, check digit OK. Searching…`
      : `⚠ ${bc.reason} — searching anyway, but double-check the digits.`;

    const btn = $('#btn-lookup');
    btn.disabled = true;
    try {
      const result = await lookupProduct(bc.normalized);
      if (!result.product) {
        status.textContent = `No verified database record found for ${bc.normalized}. ScanWise will analyze the photographed label only — that's fine.`;
        pipe.product = null; pipe.match = null; pipe.accepted = false;
        drawMatchCard();
        return;
      }
      pipe.product = result.product;
      pipe.lookupSource = result.source;
      pipe.match = scoreProductMatch(currentLabelData(), result.product);
      pipe.accepted = pipe.match.status === 'confirmed' || pipe.match.status === 'probable';
      status.textContent = `Found a database record. ${pipe.accepted ? 'It matches your label data well.' : 'Please confirm it is really this product.'}`;
      drawMatchCard();
    } catch (err) {
      status.textContent = `Lookup failed (${err.message}). You can retry or continue without it.`;
    } finally {
      btn.disabled = false;
    }
  });

  // Auto-trigger lookup when a barcode was detected in the photo.
  if (pipe.barcode?.normalized && pipe.barcode.valid) {
    $('#btn-lookup').click();
  }

  el.querySelector('#review-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = {
      productName: $('#f-name').value.trim(),
      brand: $('#f-brand').value.trim(),
      claimsText: $('#f-claims').value.trim(),
      ingredientsText: $('#f-ingredients').value.trim(),
      nutritionText: $('#f-nutrition').value.trim(),
    };

    // Field-level reconciliation with the accepted database record.
    let reconciliation = null;
    if (pipe.accepted && pipe.product) {
      const labelParsed = { ...input, ...parseNutrition(input.nutritionText) };
      const dbFlat = {
        productName: pipe.product.productName,
        brand: pipe.product.brand,
        servingSize: pipe.product.servingSize,
        ingredientsText: pipe.product.ingredientsText,
        ...pipe.product.nutrition,
      };
      reconciliation = reconcileFields(labelParsed, dbFlat, { dbTrusted: true });
      // Database fills text fields the label lacks (rule 2) — visibly.
      for (const rec of reconciliation) {
        if (rec.selectedSource === 'product_database') {
          if (rec.field === 'productName' && !input.productName) input.productName = rec.selectedValue;
          if (rec.field === 'brand' && !input.brand) input.brand = rec.selectedValue;
          if (rec.field === 'ingredientsText' && !input.ingredientsText) input.ingredientsText = rec.selectedValue;
        }
      }
      input.nutritionFill = Object.fromEntries(reconciliation
        .filter((r) => r.selectedSource === 'product_database' && typeof r.selectedValue === 'number')
        .map((r) => [r.field, r.selectedValue]));
      input.dbCategoryTags = pipe.product.categoryTags || [];
    }

    if (!input.ingredientsText && !input.nutritionText) {
      toast('Add an ingredient list or nutrition facts so there\'s something to analyze.', true);
      return;
    }

    const btn = $('#analyze-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" style="width:20px;height:20px;border-width:2.5px;" aria-hidden="true"></span> Analyzing…';

    try {
      const retrieved = pipe.accepted && pipe.product ? {
        product: { name: pipe.product.productName, brand: pipe.product.brand, source: 'Open Food Facts', barcode: pipe.product.barcode },
        matchStatus: pipe.match?.status,
        reconciliation,
      } : null;
      const { analysis, scoreDetail, engine, engineNote } =
        await analyzeWithFallback(input, session.pendingImage, getPrefs(), analyzeProduct, retrieved);
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
        pipeline: {
          barcode: pipe.barcode,
          product: pipe.accepted ? pipe.product : null,
          lookupSource: pipe.accepted ? pipe.lookupSource : null,
          match: pipe.match,
          matchAccepted: pipe.accepted,
          reconciliation,
          conflicts: reconciliation ? meaningfulConflicts(reconciliation).length : 0,
        },
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
      session.pendingBarcode = null;
      location.hash = `#/report/${scan.id}`;
    } catch (err) {
      console.error(err);
      btn.disabled = false;
      btn.textContent = 'Analyze product';
      toast('Analysis failed unexpectedly. Please try again.', true);
    }
  });
}
