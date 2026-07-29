// home.js — the main dashboard: scan actions, recent scans, demo products.

import { esc, formatDate, scoreColor } from '../ui.js';
import { getScans, getScanUsage } from '../store.js';
import { DEMO_PRODUCTS } from '../demo-data.js';
import { runDemoScan } from './report.js';

export function renderHome(el) {
  const scans = getScans().slice(0, 5);
  const usage = getScanUsage();

  el.innerHTML = `
    <header class="row-between" style="margin-bottom:16px;">
      <div class="row" style="gap:10px;">
        <span class="logo-mark" style="width:42px;height:42px;border-radius:13px;margin:0;" aria-hidden="true">
          <svg viewBox="0 0 24 24" style="width:22px;height:22px;"><path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M3 12h18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        </span>
        <div>
          <h1 style="font-size:1.3rem;margin:0;">ScanWise</h1>
          <p class="small muted" style="margin:0;">Scan it. Understand it. Choose better.</p>
        </div>
      </div>
    </header>

    <div class="stack" style="margin-bottom:18px;">
      <a class="btn btn-primary btn-big btn-block" href="#/scan">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M3 12h18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        Scan a Product
      </a>
      <div class="row" style="gap:10px;">
        <a class="btn btn-secondary" style="flex:1;" href="#/scan?mode=upload">Upload Label</a>
        <a class="btn btn-ghost" style="flex:1;" href="#/scan?mode=manual">Enter Manually</a>
      </div>
      ${usage.count > 0 ? `
        <div>
          <div class="row-between small muted" style="margin-bottom:4px;">
            <span>Free plan: ${usage.count} of ${usage.limit} scans this month</span>
            ${usage.over ? '<a href="#/pricing">See plans</a>' : ''}
          </div>
          <div class="progress-bar" role="progressbar" aria-valuenow="${usage.count}" aria-valuemin="0" aria-valuemax="${usage.limit}" aria-label="Monthly scan usage">
            <div class="progress-fill" style="width:${Math.min(100, Math.round((usage.count / usage.limit) * 100))}%"></div>
          </div>
          ${usage.over ? '<p class="small muted" style="margin:6px 0 0;">You\'ve passed this month\'s free allowance. While billing isn\'t live, scanning stays free — thanks for testing ScanWise!</p>' : ''}
        </div>` : ''}
    </div>

    <section aria-labelledby="recent-title">
      <div class="row-between" style="margin-bottom:8px;">
        <h2 id="recent-title" style="margin:0;">Recent scans</h2>
        ${scans.length ? '<a class="small" href="#/history">See all</a>' : ''}
      </div>
      ${scans.length === 0
        ? `<div class="card empty-state">
             <span class="empty-emoji" aria-hidden="true">🛒</span>
             <p style="margin:0;">No scans yet. Try a demo product below, or scan your first label.</p>
           </div>`
        : scans.map(scanRow).join('')}
    </section>

    <section aria-labelledby="demo-title" style="margin-top:20px;">
      <h2 id="demo-title">Demo products</h2>
      <p class="small muted">Fictional products for exploring ScanWise — no camera or account needed.</p>
      ${DEMO_PRODUCTS.map((p) => `
        <button class="scan-item btn-block" data-demo="${esc(p.id)}" style="border:none;cursor:pointer;font:inherit;text-align:left;">
          <span class="scan-thumb" aria-hidden="true">${p.emoji}</span>
          <span class="scan-meta">
            <span class="scan-title">${esc(p.productName)}</span>
            <span class="small muted" style="display:block;">${esc(p.brand)}</span>
          </span>
          <span class="demo-tag">Demo</span>
        </button>`).join('')}
    </section>

    <section class="card" style="margin-top:20px;">
      <div class="row-between">
        <div>
          <h3 style="margin:0;">Compare two products</h3>
          <p class="small muted" style="margin:0;">Side-by-side nutrition and ingredients.</p>
        </div>
        <a class="btn btn-secondary" href="#/compare">Compare</a>
      </div>
    </section>
  `;

  el.querySelectorAll('[data-demo]').forEach((btn) =>
    btn.addEventListener('click', () => runDemoScan(btn.dataset.demo)));
}

function scanRow(scan) {
  return `
    <a class="scan-item" href="#/report/${esc(scan.id)}">
      <span class="scan-thumb" aria-hidden="true">
        ${scan.thumbnail ? `<img src="${esc(scan.thumbnail)}" alt="" />` : (scan.emoji || '🍽️')}
      </span>
      <span class="scan-meta">
        <span class="scan-title">${esc(scan.productName || 'Unnamed product')}</span>
        <span class="small muted" style="display:block;">${esc(formatDate(scan.createdAt))}${scan.demo ? ' · Demo' : ''}</span>
      </span>
      <span class="badge badge-gray" style="color:${scoreColor(scan.overallScore)};">${esc(scan.overallScore)}/10</span>
    </a>`;
}
