// report.js — the product report page, plus the demo-scan runner.

import {
  esc, toast, scoreRing, overallLabelBadge, confidenceBadge, levelBadge,
  ingredientCard, bindIngredientCards, disclaimerHtml, ALLERGY_WARNING,
  formatDate, mainConcernOf,
} from '../ui.js';
import { nutrientLevel } from '../scoring.js';
import { analyzeProduct } from '../analyzer.js';
import {
  getScan, getScans, saveScan, deleteScan, deleteScanImage, toggleFavorite,
  getPrefs, newId, PREF_ALLERGEN_MAP, PREF_LABELS,
} from '../store.js';
import { getDemoProduct } from '../demo-data.js';

/** Analyze a demo product through the real pipeline and open its report. */
export function runDemoScan(demoId) {
  const demo = getDemoProduct(demoId);
  if (!demo) return;
  const existing = getScans().find((s) => s.demoId === demoId);
  if (existing) {
    location.hash = `#/report/${existing.id}`;
    return;
  }
  const { analysis, scoreDetail } = analyzeProduct(demo, getPrefs());
  const scan = {
    id: newId(),
    demoId,
    demo: true,
    emoji: demo.emoji,
    productName: analysis.productName,
    brand: analysis.brand,
    thumbnail: null,
    extracted: {
      productName: demo.productName, brand: demo.brand,
      ingredientsText: demo.ingredientsText, nutritionText: demo.nutritionText,
      source: 'demo',
    },
    analysis,
    scoreDetail,
    overallScore: analysis.overallScore,
    mainConcern: mainConcernOf(scoreDetail),
    createdAt: new Date().toISOString(),
    isFavorite: false,
  };
  saveScan(scan);
  location.hash = `#/report/${scan.id}`;
}

const NUTRIENT_META = [
  ['calories', 'Calories', '', 'kcal'],
  ['addedSugarGrams', 'Added sugar', 'g', 'g'],
  ['sodiumMg', 'Sodium', 'mg', 'mg'],
  ['saturatedFatGrams', 'Saturated fat', 'g', 'g'],
  ['fiberGrams', 'Fiber', 'g', 'g'],
  ['proteinGrams', 'Protein', 'g', 'g'],
];

export function renderReport(el, scanId) {
  const scan = getScan(scanId);
  if (!scan) {
    el.innerHTML = `
      <div class="empty-state card">
        <span class="empty-emoji" aria-hidden="true">🔎</span>
        <p>This report no longer exists — it may have been deleted.</p>
        <a class="btn btn-primary" href="#/history">Go to history</a>
      </div>`;
    return;
  }

  const a = scan.analysis;
  const sd = scan.scoreDetail || { adjustments: [], confidence: 'low', confidenceNote: '' };
  const prefs = getPrefs();

  // Personal allergy/avoidance alerts driven by preferences.
  const prefAlerts = Object.entries(PREF_ALLERGEN_MAP)
    .filter(([prefKey, allergen]) => prefs[prefKey] && a.allergens.includes(allergen))
    .map(([prefKey, allergen]) => ({ allergen, prefLabel: PREF_LABELS[prefKey] }));

  el.innerHTML = `
    <a href="#/history" class="small">← History</a>

    <section class="card" style="margin-top:8px;" aria-labelledby="report-title">
      ${scan.demo ? '<span class="demo-tag">Fictional demo product</span>' : ''}
      <div class="row" style="align-items:flex-start; margin-top:8px;">
        <div class="scan-thumb" style="width:64px;height:64px;font-size:1.9rem;" aria-hidden="true">
          ${scan.thumbnail ? `<img src="${esc(scan.thumbnail)}" alt="" />` : (scan.emoji || '🍽️')}
        </div>
        <div style="flex:1;min-width:0;">
          <h1 id="report-title" style="font-size:1.35rem;">${esc(a.productName || 'Unnamed product')}</h1>
          ${a.brand ? `<p class="muted small" style="margin:0;">${esc(a.brand)}</p>` : ''}
          <p class="small muted" style="margin:4px 0 0;">Scanned ${esc(formatDate(scan.createdAt))}</p>
        </div>
        <button class="icon-btn ${scan.isFavorite ? 'fav-on' : ''}" id="btn-fav" aria-label="${scan.isFavorite ? 'Remove from favorites' : 'Add to favorites'}" aria-pressed="${scan.isFavorite}">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.35-9.33-8.11C.9 9.03 2.5 5.5 6 5.5c2.06 0 3.4 1.1 4.25 2.3L12 10l1.75-2.2C14.6 6.6 15.94 5.5 18 5.5c3.5 0 5.1 3.53 3.33 6.39C19 15.65 12 20 12 20z" fill="${scan.isFavorite ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>
        </button>
      </div>

      <div class="row" style="margin-top:16px; gap:16px;">
        ${scoreRing(a.overallScore)}
        <div>
          ${overallLabelBadge(a.overallLabel)}
          <p class="small" style="margin:8px 0 6px;">${confidenceBadge(sd.confidence)}</p>
          <p class="small muted" style="margin:0;">${esc(sd.confidenceNote || '')}</p>
        </div>
      </div>
      <p style="margin-top:14px;">${esc(a.summary)}</p>
      ${a.allergens.length ? '<p class="small muted" style="margin:0;">This score reflects general nutrition only — it says nothing about allergy safety. See the allergy section below.</p>' : ''}
    </section>

    <section class="card" aria-labelledby="score-why-title">
      <h2 id="score-why-title">Why this score</h2>
      <p class="small muted">Transparent scoring: every product starts at 7, then visible adjustments are applied.</p>
      <div class="stack" style="gap:8px;">
        <div class="row-between"><span>Starting score</span><strong>7.0</strong></div>
        ${sd.adjustments.length === 0 ? '<p class="small muted">No adjustments — not enough label data was available to score meaningfully.</p>' : ''}
        ${sd.adjustments.map((adj) => `
          <div class="row-between">
            <span class="small">${esc(adj.reason)}${adj.personalized ? ' <span class="badge badge-blue">Your preference</span>' : ''}</span>
            <strong style="color:${adj.delta < 0 ? 'var(--red)' : 'var(--green-deep)'};">${adj.delta > 0 ? '+' : ''}${adj.delta}</strong>
          </div>`).join('')}
        <div class="row-between" style="border-top:1.5px solid var(--border); padding-top:8px;">
          <span>Final score</span><strong>${esc(a.overallScore)}/10</strong>
        </div>
      </div>
    </section>

    ${a.keyFindings.length ? `
      <section class="card" aria-labelledby="findings-title">
        <h2 id="findings-title">What stands out</h2>
        <div class="stack">
          ${a.keyFindings.map((f) => `
            <div class="row" style="align-items:flex-start;">
              <span aria-hidden="true" style="flex:none;">•</span>
              <p class="small" style="margin:0;">${esc(f)}</p>
            </div>`).join('')}
        </div>
      </section>` : ''}

    <section class="card" aria-labelledby="allergy-title">
      <h2 id="allergy-title">Allergy alerts</h2>
      ${prefAlerts.map(({ allergen, prefLabel }) => `
        <p class="badge badge-red" style="display:flex;white-space:normal;">⚠️ Contains ${esc(allergen.toLowerCase())} — you flagged "${esc(prefLabel)}" in your preferences.</p>`).join('')}
      ${a.allergens.length
        ? `<p class="small">Detected major allergens:</p>
           <p>${a.allergens.map((al) => `<span class="badge badge-amber" style="margin:0 6px 6px 0;">${esc(al)}</span>`).join('')}</p>`
        : '<p class="small muted">No major allergens were detected in the text we read — but detection depends on label quality.</p>'}
      <p class="small muted" style="margin:0;">${esc(ALLERGY_WARNING)}</p>
    </section>

    <section class="card" aria-labelledby="nutrition-title">
      <h2 id="nutrition-title">Nutrition per serving</h2>
      ${a.nutrition.servingSize ? `<p class="small muted">Serving size: ${esc(a.nutrition.servingSize)}</p>` : '<p class="small muted">Serving size not available.</p>'}
      <div class="nutri-grid">
        ${NUTRIENT_META.map(([key, label, , unit]) => {
          const val = a.nutrition[key];
          const lvl = nutrientLevel(key, val);
          return `
            <div class="nutri-cell">
              <div class="nutri-name">${label}</div>
              <div class="nutri-value">${val === null ? '—' : `${esc(val)} ${key === 'calories' ? '' : unit}`}</div>
              ${levelBadge(lvl)}
            </div>`;
        }).join('')}
      </div>
      <p class="small muted" style="margin:10px 0 0;">"Low / moderate / high" are general per-serving ranges based on public dietary guidelines — context, not a diagnosis.</p>
    </section>

    <section class="card" aria-labelledby="ing-title">
      <h2 id="ing-title">Ingredients (${a.ingredients.length})</h2>
      ${a.ingredients.length === 0
        ? '<p class="small muted">No ingredient list was available for this scan.</p>'
        : `<p class="small muted">Tap any ingredient for a plain-language explanation.</p>
           <div id="ing-list">${a.ingredients.map((ing, i) => ingredientCard(ing, i)).join('')}</div>`}
    </section>

    <section class="card" aria-labelledby="alt-title">
      <h2 id="alt-title">Find better options</h2>
      <div class="stack">
        ${a.alternativeGuidance.map((g) => `
          <div class="row" style="align-items:flex-start;">
            <span aria-hidden="true">🌱</span>
            <p class="small" style="margin:0;">${esc(g)}</p>
          </div>`).join('')}
      </div>
      <p class="small muted" style="margin-top:12px;">Barcode lookup and store-specific suggestions are coming in a future version — for now these are label-reading strategies, not specific product endorsements.</p>
      <a class="btn btn-secondary btn-block" href="#/compare/${esc(scan.id)}" style="margin-top:6px;">Compare with another scan</a>
    </section>

    ${a.limitations.length ? `
      <section class="card" aria-labelledby="lim-title">
        <h2 id="lim-title">Limitations of this report</h2>
        <ul style="margin:0; padding-left:20px;">
          ${a.limitations.map((l) => `<li class="small muted">${esc(l)}</li>`).join('')}
        </ul>
      </section>` : ''}

    <section class="card">
      <h2>Manage this scan</h2>
      <div class="stack">
        ${scan.thumbnail ? '<button class="btn btn-ghost" id="btn-del-img">Delete stored image only</button>' : ''}
        <button class="btn btn-danger" id="btn-del-scan">Delete this scan</button>
      </div>
    </section>

    ${disclaimerHtml()}
  `;

  bindIngredientCards(el);

  el.querySelector('#btn-fav').addEventListener('click', () => {
    const nowFav = toggleFavorite(scan.id);
    toast(nowFav ? 'Added to favorites' : 'Removed from favorites');
    renderReport(el, scan.id);
  });
  el.querySelector('#btn-del-scan').addEventListener('click', () => {
    if (confirm('Delete this scan and its report? This cannot be undone.')) {
      deleteScan(scan.id);
      toast('Scan deleted');
      location.hash = '#/history';
    }
  });
  const delImg = el.querySelector('#btn-del-img');
  if (delImg) {
    delImg.addEventListener('click', () => {
      deleteScanImage(scan.id);
      toast('Stored image removed');
      renderReport(el, scan.id);
    });
  }
}
