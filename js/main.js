// main.js — hash router and app bootstrap.
//
// View modules are pulled in with dynamic import() so the first screen only
// downloads what it actually renders; the rest arrive on navigation, and the
// service worker precaches them so offline use is unaffected.

import { hasOnboarded } from './store.js';
import { initAnalytics, trackPageView } from './analytics.js';

// Ephemeral state carried between the scan → review → report steps.
export const session = {
  pendingImage: null,      // data URL of the (possibly cropped/rotated) label photo
  pendingThumbnail: null,  // small jpeg for history
  pendingExtracted: null,  // { productName, brand, ingredientsText, nutritionText, source }
  pendingBarcode: null,    // { original, normalized, format, valid, confidence, source }
};

// Each loader resolves to { render, chrome }. chrome: false hides the bottom
// nav, which the landing page does for a cleaner first impression.
const landing = () => import('./views/landing.js').then((m) => ({ render: m.renderLanding, chrome: false }));
const home = () => import('./views/home.js').then((m) => ({ render: m.renderHome }));
const historyView = () => import('./views/history.js').then((m) => ({ render: m.renderHistory }));
const profile = () => import('./views/profile.js').then((m) => ({ render: m.renderProfile }));
const legal = (which) => () => import('./views/legal.js').then((m) => ({ render: (el) => m.renderLegal(el, which) }));

const routes = [
  { pattern: /^#?\/?$/, load: () => (hasOnboarded() ? home() : landing()) },
  { pattern: /^#\/landing$/, load: landing },
  { pattern: /^#\/home$/, load: home },
  { pattern: /^#\/scan(?:\?.*)?$/, load: () => import('./views/scan.js').then((m) => ({ render: m.renderScan })) },
  { pattern: /^#\/review$/, load: () => import('./views/review.js').then((m) => ({ render: m.renderReview })) },
  { pattern: /^#\/report\/(.+)$/, load: () => import('./views/report.js').then((m) => ({ render: m.renderReport })) },
  { pattern: /^#\/history$/, load: historyView },
  { pattern: /^#\/favorites$/, load: () => import('./views/history.js').then((m) => ({ render: (el) => m.renderHistory(el, { favoritesOnly: true }) })) },
  { pattern: /^#\/compare(?:\/(.*))?$/, load: () => import('./views/compare.js').then((m) => ({ render: m.renderCompare })) },
  { pattern: /^#\/prefs$/, load: () => import('./views/prefs.js').then((m) => ({ render: m.renderPrefs })) },
  { pattern: /^#\/library$/, load: () => import('./views/library.js').then((m) => ({ render: m.renderLibrary })) },
  { pattern: /^#\/pricing$/, load: () => import('./views/pricing.js').then((m) => ({ render: m.renderPricing })) },
  { pattern: /^#\/profile$/, load: profile },
  { pattern: /^#\/auth(?:\/(.*))?$/, load: profile },
  { pattern: /^#\/privacy$/, load: legal('privacy') },
  { pattern: /^#\/terms$/, load: legal('terms') },
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

// Guards against a slow module landing after the user has navigated on.
let navId = 0;

async function route() {
  const hash = location.hash || '#/';
  const app = document.getElementById('app');
  const nav = document.getElementById('bottom-nav');

  for (const r of routes) {
    const m = hash.match(r.pattern);
    if (!m) continue;

    const id = ++navId;
    let view;
    try {
      view = await r.load();
    } catch (err) {
      // Offline with a cold cache, or a failed deploy: keep the current screen
      // rather than blanking the app.
      console.error('Failed to load view for', hash, err);
      return;
    }
    if (id !== navId) return; // a newer navigation already won

    app.innerHTML = '';
    view.render(app, m[1]);
    nav.style.display = view.chrome === false ? 'none' : '';
    updateNav(hash);
    trackPageView(hash);
    app.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
    return;
  }
  location.hash = '#/home';
}

window.addEventListener('hashchange', route);
initAnalytics();
route();

// Warm the scan view once the first screen is idle: it is the primary action
// and the heaviest hop, so paying for it early makes the tap feel instant.
const warmScan = () => import('./views/scan.js').catch(() => {});
if ('requestIdleCallback' in window) requestIdleCallback(warmScan, { timeout: 4000 });
else window.addEventListener('load', () => setTimeout(warmScan, 2000));

// PWA: register the service worker (secure contexts only; localhost counts).
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((err) =>
      console.warn('Service worker registration failed:', err));
  });
}
