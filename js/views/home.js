// home.js — the main dashboard: hero scan card, quick actions, recent scans.

import { esc, formatDate, scoreColor } from '../ui.js';
import { getScans, getScanUsage, getProfiles, getActiveProfile, setActiveProfile } from '../store.js';
import { DEMO_PRODUCTS } from '../demo-data.js';
import { runDemoScan } from './report.js';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function renderHome(el) {
  const scans = getScans().slice(0, 4);
  const usage = getScanUsage();
  const profiles = getProfiles();
  const active = getActiveProfile();

  el.innerHTML = `
    <header class="row-between" style="margin-bottom:14px;">
      <div class="row" style="gap:10px;">
        <span class="logo-mark" style="width:42px;height:42px;border-radius:13px;margin:0;" aria-hidden="true">
          <svg viewBox="0 0 24 24" style="width:22px;height:22px;"><path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M3 12h18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        </span>
        <div>
          <p class="small muted" style="margin:0;">${greeting()}</p>
          <h1 style="font-size:1.2rem;margin:0;">Ingrado</h1>
        </div>
      </div>
      ${profiles.length > 1 ? `
        <button class="chip chip-on" id="profile-cycle" aria-label="Active profile — tap to switch">
          ${esc(active.emoji)} ${esc(active.name)}
        </button>` : ''}
    </header>

    <section class="scan-hero" aria-labelledby="hero-title">
      <h2 id="hero-title">What are you shopping for?</h2>
      <p class="small">Scan a barcode or food label to understand the product in seconds.</p>
      <div class="stack" style="gap:10px; margin-top:14px;">
        <a class="btn btn-hero btn-big btn-block" href="#/scan">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h3l2-2h6l2 2h3v13H4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="13" r="4" fill="none" stroke="currentColor" stroke-width="2"/></svg>
          Open Scanner
        </a>
        <div class="row" style="gap:10px;">
          <a class="btn btn-hero-ghost" style="flex:1;" href="#/scan?mode=upload">Upload a photo</a>
          <a class="btn btn-hero-ghost" style="flex:1;" href="#/scan?mode=manual">Type it in</a>
        </div>
      </div>
    </section>

    <nav class="quick-grid" aria-label="Quick actions">
      <a class="quick-action" href="#/compare"><span class="qa-emoji" aria-hidden="true">⚖️</span>Compare</a>
      <a class="quick-action" href="#/library"><span class="qa-emoji" aria-hidden="true">📖</span>Ingredients</a>
      <a class="quick-action" href="#/favorites"><span class="qa-emoji" aria-hidden="true">🤍</span>Saved</a>
    </nav>

    ${usage.count > 0 ? `
      <div style="margin-bottom:16px;">
        <div class="row-between small muted" style="margin-bottom:4px;">
          <span>Free plan: ${usage.count} of ${usage.limit} scans this month</span>
          ${usage.over ? '<a href="#/pricing">See plans</a>' : ''}
        </div>
        <div class="progress-bar" role="progressbar" aria-valuenow="${usage.count}" aria-valuemin="0" aria-valuemax="${usage.limit}" aria-label="Monthly scan usage">
          <div class="progress-fill" style="width:${Math.min(100, Math.round((usage.count / usage.limit) * 100))}%"></div>
        </div>
        ${usage.over ? '<p class="small muted" style="margin:6px 0 0;">You\'ve passed this month\'s free allowance. While billing isn\'t live, scanning stays free — thanks for testing Ingrado!</p>' : ''}
      </div>` : ''}

    <section aria-labelledby="recent-title">
      <div class="row-between" style="margin-bottom:8px;">
        <h2 id="recent-title" style="margin:0;">Recent scans</h2>
        ${scans.length ? '<a class="small" href="#/history">See all</a>' : ''}
      </div>
      ${scans.length === 0
        ? `<div class="card empty-state" style="padding:26px 16px;">
             <span class="empty-emoji" aria-hidden="true">🛒</span>
             <p style="margin:0 0 4px;"><strong>Your product history starts here</strong></p>
             <p class="small" style="margin:0;">Scan a product — or try a demo below — to see a full report.</p>
           </div>`
        : scans.map(scanRow).join('')}
    </section>

    <section aria-labelledby="demo-title" style="margin-top:18px;">
      <div class="row-between" style="margin-bottom:8px;">
        <h2 id="demo-title" style="margin:0;">Try a demo</h2>
        <span class="demo-tag">Fictional</span>
      </div>
      <p class="small muted" style="margin-top:0;">Full reports, no camera needed.</p>
      ${DEMO_PRODUCTS.map((p) => `
        <button class="scan-item btn-block" data-demo="${esc(p.id)}" style="border:1px solid var(--border);cursor:pointer;font:inherit;text-align:left;">
          <span class="scan-thumb" aria-hidden="true">${p.emoji}</span>
          <span class="scan-meta">
            <span class="scan-title">${esc(p.productName)}</span>
            <span class="small muted" style="display:block;">${esc(p.brand)}</span>
          </span>
          <span class="small muted">View →</span>
        </button>`).join('')}
    </section>
  `;

  el.querySelectorAll('[data-demo]').forEach((btn) =>
    btn.addEventListener('click', () => runDemoScan(btn.dataset.demo)));

  el.querySelector('#profile-cycle')?.addEventListener('click', () => {
    const idx = profiles.findIndex((p) => p.id === active.id);
    setActiveProfile(profiles[(idx + 1) % profiles.length].id);
    renderHome(el);
  });
}

function scanRow(scan) {
  return `
    <a class="scan-item" href="#/report/${esc(scan.id)}">
      <span class="scan-thumb" aria-hidden="true">
        ${scan.thumbnail ? `<img src="${esc(scan.thumbnail)}" alt="" />` : (scan.emoji || '🍽️')}
      </span>
      <span class="scan-meta">
        <span class="scan-title">${esc(scan.productName || 'Unnamed product')}</span>
        <span class="small muted" style="display:block;">${esc(scan.mainConcern || '')}</span>
        <span class="small muted" style="display:block;">${esc(formatDate(scan.createdAt))}${scan.demo ? ' · Demo' : ''}</span>
      </span>
      <span class="badge badge-gray" style="color:${scoreColor(scan.overallScore)};">${esc(scan.overallScore)}/10</span>
    </a>`;
}
