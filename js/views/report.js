// report.js — the product report page, plus the demo-scan runner.

import {
  esc, toast, scoreRing, overallLabelBadge, confidenceBadge, levelBadge,
  ingredientCard, bindIngredientCards, disclaimerHtml, ALLERGY_WARNING,
  formatDate, mainConcernOf,
} from '../ui.js';
import { nutrientLevel } from '../scoring.js';
import { analyzeProduct } from '../analyzer.js';
import { computeDimensions } from '../assessment.js';
import { calculateNutrition } from '../nutrition-calc.js';
import { analyzeClaims, VERDICT_META } from '../claims.js';
import { findAlternatives, ALT_CRITERIA } from '../alternatives.js';
import {
  getScan, getScans, saveScan, deleteScan, deleteScanImage, toggleFavorite,
  getPrefs, newId, PREF_ALLERGEN_MAP, PREF_LABELS, DEFAULT_PREFS,
  getProfiles, getActiveProfile,
} from '../store.js';
import { scoreProduct, THRESHOLDS } from '../scoring.js';
import { thresholdsForCategory } from '../categories.js';
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

/** Product identification & data-provenance card (pipeline scans only). */
function productIdHtml(scan) {
  const pipe = scan.pipeline;
  if (!pipe || (!pipe.barcode && !pipe.product)) return '';
  const m = pipe.match;
  const conflicts = (pipe.reconciliation || []).filter((r) => r.conflict);
  const statusCls = m ? (m.status === 'confirmed' ? 'badge-green' : m.status === 'probable' ? 'badge-blue' : 'badge-amber') : 'badge-gray';
  return `
    <section class="card" aria-labelledby="pid2-title" data-depth="full">
      <h2 id="pid2-title">Product identification</h2>
      <div class="stack" style="gap:8px;">
        ${pipe.barcode ? `<div class="row-between"><span class="small">Barcode (${esc(pipe.barcode.format || '?')})</span><span class="small"><code>${esc(pipe.barcode.normalized)}</code> ${pipe.barcode.valid ? '✓' : '⚠ check digit'}</span></div>` : ''}
        ${pipe.product ? `
          <div class="row-between"><span class="small">Database record</span><span class="small">Open Food Facts</span></div>
          <div class="row-between"><span class="small">Match</span><span class="badge ${statusCls}">${esc(m.statusLabel)} · ${Math.round(m.score * 100)}%</span></div>
          <div class="row-between"><span class="small">Retrieved</span><span class="small">${esc(formatDate(pipe.product.retrievedAt))}</span></div>
        ` : (pipe.barcode ? '<p class="small muted" style="margin:0;">No verified database record — this report is based on the photographed label only.</p>' : '')}
        ${conflicts.length ? `
          <div style="border-top:1px solid var(--surface-2); padding-top:8px;">
            <p class="small" style="margin:0 0 6px;"><strong>Label vs. database — ${conflicts.length} conflict${conflicts.length > 1 ? 's' : ''}</strong> (your package label was used; the database record may be outdated):</p>
            ${conflicts.map((c) => `<p class="small muted" style="margin:0;">• ${esc(c.field)}: label ${esc(String(c.labelValue))} vs database ${esc(String(c.databaseValue))}</p>`).join('')}
          </div>` : ''}
        ${(pipe.reconciliation || []).some((r) => r.selectedSource === 'product_database') ? `
          <p class="small muted" style="margin:0;">Fields filled from the database (not visible on your photo): ${
            pipe.reconciliation.filter((r) => r.selectedSource === 'product_database').map((r) => esc(r.field)).join(', ')}.</p>` : ''}
        ${pipe.product?.nutritionBasis === 'derived_from_100g' ? `
          <p class="small muted" style="margin:0;">Database nutrition was converted from per-100g values using the disclosed serving size (${esc(String(pipe.product.servingGrams))} g) — a calculation, not a label reading.</p>` : ''}
      </div>
    </section>`;
}

/** Multi-dimension assessment card (uses the viewed profile's recomputed score). */
function dimensionsHtml(scan, prefs, sd, viewScore) {
  const dims = computeDimensions({
    analysis: { ...scan.analysis, overallScore: viewScore ?? scan.analysis.overallScore },
    scoreDetail: sd || scan.scoreDetail,
    prefs,
    reconciliation: scan.pipeline?.reconciliation || null,
    match: scan.pipeline?.matchAccepted ? scan.pipeline.match : null,
  });
  if (!dims.length) return '';
  return `
    <section class="card" aria-labelledby="dims-title" data-depth="full">
      <h2 id="dims-title">At a glance</h2>
      <div class="stack" style="gap:8px;">
        ${dims.map((d) => `
          <div class="row-between" style="align-items:flex-start;">
            <span class="small" style="flex:1;">
              <strong>${esc(d.label)}</strong>
              <span class="muted" style="display:block;">${esc(d.note)}</span>
            </span>
            <span class="badge ${d.alert ? 'badge-red' : 'badge-blue'}" style="white-space:normal;text-align:right;">${esc(d.display)}</span>
          </div>`).join('')}
      </div>
      <p class="small muted" style="margin:10px 0 0;">A product can do well on one dimension and poorly on another — that's the honest picture.</p>
    </section>`;
}

/** Render verified-alternative search results. */
function renderAltResults(result, criterionKey) {
  const c = ALT_CRITERIA[criterionKey];
  if (!result.alternatives.length) {
    return `<p class="small muted">${esc(result.note || 'No verified alternatives found.')}</p>`;
  }
  return `
    <div class="stack">
      ${result.alternatives.map((alt) => `
        <div style="border:1.5px solid var(--border); border-radius:var(--radius-sm); padding:12px;">
          <div class="row" style="align-items:flex-start;">
            ${alt.imageUrl ? `<img src="${esc(alt.imageUrl)}" alt="" style="width:44px;height:44px;object-fit:contain;border-radius:8px;background:#fff;flex:none;" />` : ''}
            <div style="flex:1;min-width:0;">
              <strong class="small">${esc(alt.productName)}</strong>
              <p class="small muted" style="margin:0;">${esc(alt.brand)}${alt.packageSize ? ` · ${esc(alt.packageSize)}` : ''}</p>
            </div>
            <span class="badge badge-green" style="flex:none;">${alt.improvementPct}% ${c.direction === 'lower' ? 'less' : 'more'} ${esc(alt.comparedField)}</span>
          </div>
          <p class="small muted" style="margin:8px 0 0;">
            Why: ${esc(String(alt.candidateValue))} vs ${esc(String(alt.baselineValue))} ${alt.comparedField === 'sodium' ? 'mg' : 'g'} per 100 g.
            Source: ${esc(alt.source)}${alt.sourceLastUpdated ? `, updated ${esc(formatDate(alt.sourceLastUpdated))}` : ''} · retrieved ${esc(formatDate(alt.retrievedAt))} ·
            <span class="badge badge-amber" style="font-size:0.7rem;">Moderate confidence</span>
          </p>
        </div>`).join('')}
      <p class="small muted" style="margin:0;">Community-verified data (${result.candidateCount} products searched). Availability and prices are unknown; always verify the package in-store, especially for allergies.</p>
    </div>`;
}

/** Marketing-claims check card. */
function claimsHtml(scan, a) {
  const claimsText = scan.extracted?.claimsText || '';
  const claims = analyzeClaims(claimsText, a);
  if (!claims.length) return '';
  return `
    <section class="card" aria-labelledby="claims-title" data-depth="full">
      <h2 id="claims-title">Claims check</h2>
      <p class="small muted">Front-of-package claims compared with the verified label — what's regulated, what's marketing, and what the numbers actually show.</p>
      <div class="stack">
        ${claims.map((c) => {
          const meta = VERDICT_META[c.verdict] || VERDICT_META.unverifiable;
          return `
            <div>
              <div class="row" style="gap:8px; flex-wrap:wrap;">
                <strong class="small">“${esc(c.claimText)}”</strong>
                <span class="badge ${meta.cls}">${esc(meta.label)}</span>
              </div>
              <p class="small muted" style="margin:4px 0 0;">${esc(c.note)}</p>
            </div>`;
        }).join('')}
      </div>
    </section>`;
}

/** Diet & lifestyle card: shows what the ingredient database flagged for
 *  vegetarian/vegan/gluten/dairy concerns. Only renders when there is
 *  something to say (a relevant preference is set, or a flag was found). */
function dietCheckHtml(a, prefs) {
  const flags = a.dietFlags || { nonVegetarian: [], nonVegan: [], glutenSources: [] };
  const dairy = a.ingredients.filter((i) => i.allergen === 'Milk').map((i) => i.name);

  const rows = [];
  const row = (label, hits, prefOn) => {
    if (!hits.length && !prefOn) return;
    rows.push(`
      <div class="row" style="align-items:flex-start;">
        <span aria-hidden="true" style="flex:none;">${hits.length ? '⚠️' : '✅'}</span>
        <p class="small" style="margin:0;">
          <strong>${label}:</strong>
          ${hits.length
            ? `contains ${esc([...new Set(hits)].join(', '))}${prefOn ? ' — you flagged this in your preferences' : ''}.`
            : 'nothing flagged in our ingredient database.'}
        </p>
      </div>`);
  };

  row('Vegetarian', flags.nonVegetarian, prefs.vegetarian);
  row('Vegan', flags.nonVegan, prefs.vegan);
  row('Gluten', flags.glutenSources, prefs.glutenAvoidance);
  row('Dairy', dairy, prefs.dairyAvoidance);

  if (!rows.length) return '';
  return `
    <section class="card" aria-labelledby="diet-title" data-depth="full">
      <h2 id="diet-title">Diet check</h2>
      <div class="stack">${rows.join('')}</div>
      <p class="small muted" style="margin:10px 0 0;">Based only on ingredients our database recognizes — "nothing flagged" is a helpful signal, not a certification. Malt and rye contain gluten without triggering a wheat allergen statement.</p>
    </section>`;
}

/** Plain-text summary of a report for sharing/export. */
export function buildShareText(scan) {
  const a = scan.analysis;
  const n = a.nutrition;
  const fmt = (v, unit) => (v === null || v === undefined ? 'n/a' : `${v} ${unit}`);
  const lines = [
    `ScanWise report — ${a.productName || 'Unnamed product'}${a.brand ? ` (${a.brand})` : ''}${scan.demo ? ' [fictional demo]' : ''}`,
    `Score: ${a.overallScore}/10 — ${a.overallLabel}`,
    '',
    a.summary,
    '',
  ];
  if (a.keyFindings.length) {
    lines.push('What stands out:');
    a.keyFindings.forEach((f) => lines.push(`• ${f}`));
    lines.push('');
  }
  lines.push(`Per serving${n.servingSize ? ` (${n.servingSize})` : ''}: ` +
    `calories ${fmt(n.calories, 'kcal')}, added sugar ${fmt(n.addedSugarGrams, 'g')}, ` +
    `sodium ${fmt(n.sodiumMg, 'mg')}, sat fat ${fmt(n.saturatedFatGrams, 'g')}, ` +
    `fiber ${fmt(n.fiberGrams, 'g')}, protein ${fmt(n.proteinGrams, 'g')}`);
  if (a.allergens.length) lines.push(`Major allergens detected: ${a.allergens.join(', ')}`);
  lines.push('', 'Shared from ScanWise — general educational information, not medical advice. Always check the package label.');
  return lines.join('\n');
}

/** One-line plain-language headline: the report's five-second takeaway. */
export function buildHeadline(sd, analysis) {
  const clean = (reason) => reason.replace(/\s*\([^)]*\)/g, '').toLowerCase().trim();
  const negs = sd.adjustments.filter((a) => a.delta < 0 && !a.personalized).sort((a, b) => a.delta - b.delta);
  const poss = sd.adjustments.filter((a) => a.delta > 0 && !a.personalized).sort((a, b) => b.delta - a.delta);
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  if (poss.length && negs.length) return `${cap(clean(poss[0].reason))}, but ${clean(negs[0].reason)}`;
  if (negs.length) return `${cap(clean(negs[0].reason))} stands out`;
  if (poss.length) return `${cap(clean(poss[0].reason))}`;
  return analysis.overallLabel;
}

const VIEW_KEY = 'scanwise.reportview.v1';

const NUTRIENT_META = [
  ['calories', 'Calories', '', 'kcal'],
  ['addedSugarGrams', 'Added sugar', 'g', 'g'],
  ['sodiumMg', 'Sodium', 'mg', 'mg'],
  ['saturatedFatGrams', 'Saturated fat', 'g', 'g'],
  ['fiberGrams', 'Fiber', 'g', 'g'],
  ['proteinGrams', 'Protein', 'g', 'g'],
];

export function renderReport(el, scanId, opts = {}) {
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

  // Profile lens: the report can be re-interpreted for any family profile.
  // The stored scan is never modified — scoring is recomputed live from the
  // stored analysis data with the viewed profile's preferences.
  const profiles = getProfiles();
  const viewProfile = profiles.find((p) => p.id === opts.profileId) || getActiveProfile();
  const prefs = { ...DEFAULT_PREFS, ...viewProfile.prefs };
  const catThresholds = thresholdsForCategory(a.category?.key || 'general', THRESHOLDS);
  const sd = scoreProduct(a.nutrition, a.ingredients, prefs, {
    thresholds: catThresholds,
    category: a.category || null,
  });
  const viewScore = sd.score;
  const viewLabel = sd.label;
  const nutriCalc = calculateNutrition(a.nutrition);

  // Personal allergy/avoidance alerts driven by preferences.
  const prefAlerts = Object.entries(PREF_ALLERGEN_MAP)
    .filter(([prefKey, allergen]) => prefs[prefKey] && a.allergens.includes(allergen))
    .map(([prefKey, allergen]) => ({ allergen, prefLabel: PREF_LABELS[prefKey] }));

  el.innerHTML = `
    <a href="#/history" class="small">← History</a>

    ${profiles.length > 1 ? `
      <div class="row" style="flex-wrap:wrap; gap:6px; margin-top:10px;" role="group" aria-label="View report as profile">
        <span class="small muted" style="flex:none;">Viewing as:</span>
        ${profiles.map((p) => `
          <button class="btn ${p.id === viewProfile.id ? 'btn-primary' : 'btn-ghost'}" data-view-profile="${esc(p.id)}"
                  style="padding:5px 13px; min-height:36px; font-size:0.82rem;">${esc(p.emoji)} ${esc(p.name)}</button>`).join('')}
      </div>` : ''}

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
        ${scoreRing(viewScore)}
        <div>
          ${overallLabelBadge(viewLabel)}
          ${profiles.length > 1 ? `<p class="small muted" style="margin:6px 0 0;">For ${esc(viewProfile.emoji)} ${esc(viewProfile.name)} — switch profiles above to re-read this report.</p>` : ''}
          <p class="small" style="margin:8px 0 6px;">${confidenceBadge(sd.confidence)}</p>
          <p class="small muted" style="margin:0;">${esc(sd.confidenceNote || '')}</p>
        </div>
      </div>
      <div class="headline-card">
        <p class="headline">${esc(buildHeadline(sd, a))}</p>
      </div>
      <p style="margin:0 0 8px;">${esc(a.summary)}</p>
      ${a.allergens.length ? '<p class="small muted" style="margin:0;">This score reflects general nutrition only — it says nothing about allergy safety. See the allergy section below.</p>' : ''}
      ${scan.engine ? `<p class="small muted" data-depth="full" style="margin:8px 0 0;">${scan.engine === 'ai' ? '✨' : '🔧'} ${esc(scan.engineNote || '')}</p>` : ''}
    </section>

    <div class="seg" role="group" aria-label="Report detail level">
      <button id="seg-quick" aria-pressed="false">Quick view</button>
      <button id="seg-full" aria-pressed="false">Full analysis</button>
    </div>

    ${productIdHtml(scan)}
    ${dimensionsHtml(scan, prefs, sd, viewScore)}
    ${claimsHtml(scan, a)}

    <section class="card" aria-labelledby="score-why-title" data-depth="full">
      <h2 id="score-why-title">Why this score</h2>
      <p class="small muted">Transparent scoring: every product starts at 7, then visible adjustments are applied.${
        a.category && a.category.key !== 'general'
          ? ` Judged as <strong>${esc(a.category.label.toLowerCase())}</strong> — thresholds are category-aware, so this product is compared with its own kind.`
          : ''}</p>
      <div class="stack" style="gap:8px;">
        <div class="row-between"><span>Starting score</span><strong>7.0</strong></div>
        ${sd.adjustments.length === 0 ? '<p class="small muted">No adjustments — not enough label data was available to score meaningfully.</p>' : ''}
        ${sd.adjustments.map((adj) => `
          <div class="row-between">
            <span class="small">${esc(adj.reason)}${adj.personalized ? ' <span class="badge badge-blue">Your preference</span>' : ''}</span>
            <strong style="color:${adj.delta < 0 ? 'var(--red)' : 'var(--green-deep)'};">${adj.delta > 0 ? '+' : ''}${adj.delta}</strong>
          </div>`).join('')}
        <div class="row-between" style="border-top:1.5px solid var(--border); padding-top:8px;">
          <span>Final score</span><strong>${esc(viewScore)}/10</strong>
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
      ${(a.advisories || []).length ? `
        <div style="margin-bottom:8px;">
          <p class="small" style="margin:0 0 4px;"><strong>Advisory statements on the label:</strong></p>
          ${a.advisories.map((adv) => `<p class="small muted" style="margin:0;">• ${esc(adv.text)} <span class="badge badge-gray">${esc(adv.type.replace(/_/g, ' '))}</span></p>`).join('')}
        </div>` : ''}
      <p class="small muted" style="margin:0;">${esc(ALLERGY_WARNING)}</p>
    </section>

    ${dietCheckHtml(a, prefs)}

    <section class="card" aria-labelledby="nutrition-title">
      <h2 id="nutrition-title">Nutrition per serving</h2>
      ${a.nutrition.servingSize ? `<p class="small muted">Serving size: ${esc(a.nutrition.servingSize)}</p>` : '<p class="small muted">Serving size not available.</p>'}
      <div class="nutri-grid">
        ${NUTRIENT_META.map(([key, label, , unit]) => {
          const val = a.nutrition[key];
          const lvl = nutrientLevel(key, val);
          const dv = nutriCalc.percentDV[key];
          return `
            <div class="nutri-cell">
              <div class="nutri-name">${label}</div>
              <div class="nutri-value">${val === null ? '—' : `${esc(val)} ${key === 'calories' ? '' : unit}`}</div>
              ${levelBadge(lvl)}
              ${dv !== null && key !== 'calories' ? `<span class="small muted" style="display:block;margin-top:4px;">${dv}% DV</span>` : ''}
            </div>`;
        }).join('')}
      </div>
      <p class="small muted" style="margin:10px 0 0;">"Low / moderate / high" are general per-serving ranges based on public dietary guidelines — context, not a diagnosis. %DV computed against ${esc(nutriCalc.jurisdiction)} Daily Values (<a href="${esc(nutriCalc.dvSource.url)}" target="_blank" rel="noopener">${esc(nutriCalc.dvSource.organization)}</a>, effective ${esc(nutriCalc.dvEffectiveDate)}).</p>
    </section>

    <section class="card" aria-labelledby="ing-title" data-depth="full">
      <h2 id="ing-title">Ingredients (${a.ingredients.length})</h2>
      ${a.ingredients.length === 0
        ? '<p class="small muted">No ingredient list was available for this scan.</p>'
        : `<p class="small muted">Tap any ingredient for a plain-language explanation.</p>
           ${a.ingredients.length > 6 ? `
             <input type="search" id="ing-search" placeholder="Search ingredients…" aria-label="Search ingredients" style="margin-bottom:10px;" />` : ''}
           <div class="row" style="flex-wrap:wrap; gap:6px; margin-bottom:10px;" role="group" aria-label="Filter ingredients">
             <button class="chip" data-ing-filter="all" aria-pressed="true">All (${a.ingredients.length})</button>
             ${a.ingredients.some((i) => i.allergen) ? `<button class="chip" data-ing-filter="allergens" aria-pressed="false">Allergens</button>` : ''}
             ${a.ingredients.some((i) => i.category === 'Sweetener') ? `<button class="chip" data-ing-filter="sweeteners" aria-pressed="false">Sweeteners</button>` : ''}
             ${a.ingredients.some((i) => ['Preservative', 'Color', 'Emulsifier'].includes(i.category)) ? `<button class="chip" data-ing-filter="additives" aria-pressed="false">Additives</button>` : ''}
             ${a.ingredients.some((i) => i.concernLevel === 'unknown') ? `<button class="chip" data-ing-filter="unknown" aria-pressed="false">Not in database</button>` : ''}
           </div>
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
      ${scan.pipeline?.product?.categoryTagsRaw?.length ? `
        <div style="border-top:1px solid var(--surface-2); margin-top:14px; padding-top:12px;">
          <h3 style="font-size:0.95rem;">Verified alternatives in this category</h3>
          <p class="small muted">Searches Open Food Facts for products with structured data at least 25% better per 100 g. No prices or availability — those aren't verified.</p>
          <div class="row" style="flex-wrap:wrap; gap:6px;">
            ${Object.entries(ALT_CRITERIA).map(([key, c]) => `
              <button class="btn btn-ghost" data-alt-criterion="${esc(key)}" style="padding:6px 14px; min-height:38px; font-size:0.85rem;">${esc(c.label)}</button>`).join('')}
          </div>
          <div id="alt-results" style="margin-top:10px;" aria-live="polite"></div>
        </div>` : `
        <p class="small muted" style="margin-top:12px;">Verified exact-product suggestions need a database-matched product (scan the barcode) — until then these label-reading strategies apply.</p>`}
      <a class="btn btn-secondary btn-block" href="#/compare/${esc(scan.id)}" style="margin-top:6px;">Compare with another scan</a>
    </section>

    ${a.limitations.length ? `
      <section class="card" aria-labelledby="lim-title" data-depth="full">
        <h2 id="lim-title">Limitations of this report</h2>
        <ul style="margin:0; padding-left:20px;">
          ${a.limitations.map((l) => `<li class="small muted">${esc(l)}</li>`).join('')}
        </ul>
      </section>` : ''}

    <section class="card" data-depth="full">
      <h2>Manage this scan</h2>
      <div class="stack">
        <button class="btn btn-secondary" id="btn-share">Share this report</button>
        ${scan.thumbnail ? '<button class="btn btn-ghost" id="btn-del-img">Delete stored image only</button>' : ''}
        <button class="btn btn-danger" id="btn-del-scan">Delete this scan</button>
      </div>
    </section>

    ${disclaimerHtml()}
  `;

  bindIngredientCards(el);

  // Quick view / Full analysis toggle (last choice remembered).
  const applyView = (mode) => {
    el.querySelectorAll('[data-depth="full"]').forEach((sec) => { sec.hidden = mode === 'quick'; });
    el.querySelector('#seg-quick')?.setAttribute('aria-pressed', String(mode === 'quick'));
    el.querySelector('#seg-full')?.setAttribute('aria-pressed', String(mode === 'full'));
    try { localStorage.setItem(VIEW_KEY, mode); } catch { /* fine */ }
  };
  let viewMode = 'full';
  try { viewMode = localStorage.getItem(VIEW_KEY) || 'full'; } catch { /* fine */ }
  applyView(viewMode);
  el.querySelector('#seg-quick')?.addEventListener('click', () => applyView('quick'));
  el.querySelector('#seg-full')?.addEventListener('click', () => applyView('full'));

  // Ingredient filter chips + search.
  const ingFilters = {
    all: () => true,
    allergens: (i) => !!i.allergen,
    sweeteners: (i) => i.category === 'Sweetener',
    additives: (i) => ['Preservative', 'Color', 'Emulsifier'].includes(i.category),
    unknown: (i) => i.concernLevel === 'unknown',
  };
  let ingFilter = 'all';
  let ingQuery = '';
  const redrawIngredients = () => {
    const list = el.querySelector('#ing-list');
    if (!list) return;
    const q = ingQuery.toLowerCase();
    const shown = a.ingredients
      .map((ing, i) => ({ ing, i }))
      .filter(({ ing }) => ingFilters[ingFilter](ing))
      .filter(({ ing }) => !q ||
        ing.name.toLowerCase().includes(q) ||
        (ing.rawName || '').toLowerCase().includes(q) ||
        (ing.normalizedName || '').toLowerCase().includes(q));
    list.innerHTML = shown.length
      ? shown.map(({ ing, i }) => ingredientCard(ing, i)).join('')
      : '<p class="small muted">No ingredients match this filter.</p>';
    bindIngredientCards(list);
  };
  el.querySelectorAll('[data-ing-filter]').forEach((chipBtn) =>
    chipBtn.addEventListener('click', () => {
      ingFilter = chipBtn.dataset.ingFilter;
      el.querySelectorAll('[data-ing-filter]').forEach((c) =>
        c.setAttribute('aria-pressed', String(c === chipBtn)));
      redrawIngredients();
    }));
  el.querySelector('#ing-search')?.addEventListener('input', (e) => {
    ingQuery = e.target.value.trim();
    redrawIngredients();
  });

  el.querySelectorAll('[data-view-profile]').forEach((btn) =>
    btn.addEventListener('click', () => renderReport(el, scanId, { profileId: btn.dataset.viewProfile })));

  el.querySelectorAll('[data-alt-criterion]').forEach((btn) =>
    btn.addEventListener('click', async () => {
      const box = el.querySelector('#alt-results');
      box.innerHTML = '<p class="small muted"><span class="spinner" style="width:16px;height:16px;border-width:2px;vertical-align:middle;" aria-hidden="true"></span> Searching verified products…</p>';
      el.querySelectorAll('[data-alt-criterion]').forEach((b) => b.disabled = true);
      try {
        const userAllergens = Object.entries(PREF_ALLERGEN_MAP)
          .filter(([prefKey]) => prefs[prefKey])
          .map(([, allergen]) => allergen.toLowerCase());
        const result = await findAlternatives(scan.pipeline.product, btn.dataset.altCriterion, { avoidAllergens: userAllergens });
        box.innerHTML = renderAltResults(result, btn.dataset.altCriterion);
      } catch (err) {
        box.innerHTML = `<p class="small muted">Search failed (${esc(err.message)}). Check your connection and try again — the shopping criteria above still apply.</p>`;
      } finally {
        el.querySelectorAll('[data-alt-criterion]').forEach((b) => b.disabled = false);
      }
    }));

  el.querySelector('#btn-fav').addEventListener('click', () => {
    const nowFav = toggleFavorite(scan.id);
    toast(nowFav ? 'Added to favorites' : 'Removed from favorites');
    renderReport(el, scan.id);
  });
  el.querySelector('#btn-share').addEventListener('click', async () => {
    const text = buildShareText(scan);
    try {
      if (navigator.share) {
        await navigator.share({ title: `ScanWise: ${scan.productName}`, text });
      } else {
        await navigator.clipboard.writeText(text);
        toast('Report copied to clipboard');
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        try {
          await navigator.clipboard.writeText(text);
          toast('Report copied to clipboard');
        } catch {
          toast('Could not share on this device.', true);
        }
      }
    }
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
