// main.js — hash router and app bootstrap.

import { renderLanding } from './views/landing.js';
import { renderHome } from './views/home.js';
import { renderScan } from './views/scan.js';
import { renderReview } from './views/review.js';
import { renderReport } from './views/report.js';
import { renderHistory } from './views/history.js';
import { renderCompare } from './views/compare.js';
import { renderPrefs } from './views/prefs.js';
import { renderPricing } from './views/pricing.js';
import { renderProfile } from './views/profile.js';
import { renderLegal } from './views/legal.js';
import { renderLibrary } from './views/library.js';
import { hasOnboarded } from './store.js';

// Ephemeral state carried between the scan → review → report steps.
export const session = {
  pendingImage: null,      // data URL of the (possibly cropped/rotated) label photo
  pendingThumbnail: null,  // small jpeg for history
  pendingExtracted: null,  // { productName, brand, ingredientsText, nutritionText, source }
  pendingBarcode: null,    // { original, normalized, format, valid, confidence, source }
};

const routes = [
  { pattern: /^#?\/?$/, render: () => (hasOnboarded() ? renderHome : renderLanding) },
  { pattern: /^#\/landing$/, render: () => renderLanding },
  { pattern: /^#\/home$/, render: () => renderHome },
  { pattern: /^#\/scan(?:\?.*)?$/, render: () => renderScan },
  { pattern: /^#\/review$/, render: () => renderReview },
  { pattern: /^#\/report\/(.+)$/, render: () => renderReport },
  { pattern: /^#\/history$/, render: () => renderHistory },
  { pattern: /^#\/favorites$/, render: () => (el) => renderHistory(el, { favoritesOnly: true }) },
  { pattern: /^#\/compare(?:\/(.*))?$/, render: () => renderCompare },
  { pattern: /^#\/prefs$/, render: () => renderPrefs },
  { pattern: /^#\/library$/, render: () => renderLibrary },
  { pattern: /^#\/pricing$/, render: () => renderPricing },
  { pattern: /^#\/profile$/, render: () => renderProfile },
  { pattern: /^#\/auth(?:\/(.*))?$/, render: () => renderProfile },
  { pattern: /^#\/privacy$/, render: () => (el) => renderLegal(el, 'privacy') },
  { pattern: /^#\/terms$/, render: () => (el) => renderLegal(el, 'terms') },
];

const NAV_MAP = [
  [/^#\/home/, 'home'],
  [/^#\/(history|report|compare)/, 'history'],
  [/^#\/(scan|review)/, 'scan'],
  [/^#\/favorites/, 'favorites'],
  [/^#\/(profile|prefs|pricing|auth|privacy|terms|library)/, 'profile'],
];

function updateNav(hash) {
  const active = (NAV_MAP.find(([re]) => re.test(hash)) || [])[1] || (hash === '' || hash === '#/' ? 'home' : '');
  document.querySelectorAll('#bottom-nav .nav-item').forEach((item) => {
    const isActive = item.dataset.nav === active;
    item.classList.toggle('active', isActive);
    if (isActive) item.setAttribute('aria-current', 'page');
    else item.removeAttribute('aria-current');
  });
}

function route() {
  const hash = location.hash || '#/';
  const app = document.getElementById('app');
  const nav = document.getElementById('bottom-nav');

  for (const r of routes) {
    const m = hash.match(r.pattern);
    if (m) {
      app.innerHTML = '';
      const renderFn = r.render();
      renderFn(app, m[1]);
      // Landing page hides the app chrome for a cleaner first impression.
      nav.style.display = renderFn === renderLanding ? 'none' : '';
      updateNav(hash);
      app.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: 'instant' });
      return;
    }
  }
  location.hash = '#/home';
}

window.addEventListener('hashchange', route);
route();

// PWA: register the service worker (secure contexts only; localhost counts).
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((err) =>
      console.warn('Service worker registration failed:', err));
  });
}
