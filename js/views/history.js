// history.js — scan history and favorites (same list, filtered).

import { esc, toast, formatDate, scoreColor } from '../ui.js';
import { getScans, searchScans, deleteScan, toggleFavorite } from '../store.js';

export function renderHistory(el, opts = {}) {
  const favoritesOnly = opts.favoritesOnly === true;
  let query = '';

  function draw() {
    let scans = searchScans(query);
    if (favoritesOnly) scans = scans.filter((s) => s.isFavorite);

    el.innerHTML = `
      <h1>${favoritesOnly ? 'Favorites' : 'Scan history'}</h1>
      <p class="muted small">${favoritesOnly
        ? 'Products you\'ve starred for quick reference.'
        : 'Your saved scans, stored on this device. Create an account later to sync them.'}</p>

      <label class="field-label" for="search-box" style="position:absolute;left:-9999px;">Search scans</label>
      <input type="search" id="search-box" placeholder="Search by product, brand, or concern…" value="${esc(query)}" style="margin-bottom:14px;" />

      ${scans.length === 0 ? `
        <div class="card empty-state">
          <span class="empty-emoji" aria-hidden="true">${favoritesOnly ? '🤍' : '🗂️'}</span>
          <p>${favoritesOnly
            ? 'No favorites yet. Tap the heart on any report to save it here.'
            : query ? 'No scans match that search.' : 'No scans yet. Scan a label or try a demo product from Home.'}</p>
          <a class="btn btn-primary" href="#/${favoritesOnly || query ? 'history' : 'scan'}">${favoritesOnly ? 'View all scans' : query ? 'Clear search' : 'Scan a product'}</a>
        </div>` : scans.map(row).join('')}
    `;

    const box = el.querySelector('#search-box');
    box.addEventListener('input', () => {
      query = box.value;
      const pos = box.selectionStart;
      draw();
      const newBox = el.querySelector('#search-box');
      newBox.focus();
      newBox.setSelectionRange(pos, pos);
    });

    el.querySelectorAll('[data-fav]').forEach((btn) =>
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const nowFav = toggleFavorite(btn.dataset.fav);
        toast(nowFav ? 'Added to favorites' : 'Removed from favorites');
        draw();
      }));
    el.querySelectorAll('[data-del]').forEach((btn) =>
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (confirm('Delete this scan? This cannot be undone.')) {
          deleteScan(btn.dataset.del);
          toast('Scan deleted');
          draw();
        }
      }));
  }

  function row(scan) {
    return `
      <a class="scan-item" href="#/report/${esc(scan.id)}">
        <span class="scan-thumb" aria-hidden="true">
          ${scan.thumbnail ? `<img src="${esc(scan.thumbnail)}" alt="" />` : (scan.emoji || '🍽️')}
        </span>
        <span class="scan-meta">
          <span class="scan-title">${esc(scan.productName || 'Unnamed product')}${scan.demo ? ' <span class="demo-tag">Demo</span>' : ''}</span>
          <span class="small muted" style="display:block;">${esc(formatDate(scan.createdAt))} · ${esc(scan.mainConcern || '')}</span>
        </span>
        <span class="badge badge-gray" style="color:${scoreColor(scan.overallScore)};">${esc(scan.overallScore)}/10</span>
        <button class="icon-btn ${scan.isFavorite ? 'fav-on' : ''}" data-fav="${esc(scan.id)}" aria-label="${scan.isFavorite ? 'Remove from favorites' : 'Add to favorites'}" aria-pressed="${scan.isFavorite}">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.35-9.33-8.11C.9 9.03 2.5 5.5 6 5.5c2.06 0 3.4 1.1 4.25 2.3L12 10l1.75-2.2C14.6 6.6 15.94 5.5 18 5.5c3.5 0 5.1 3.53 3.33 6.39C19 15.65 12 20 12 20z" fill="${scan.isFavorite ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>
        </button>
        <button class="icon-btn" data-del="${esc(scan.id)}" aria-label="Delete scan">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V5h6v2m-8 0 1 13h8l1-13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </a>`;
  }

  draw();
}
