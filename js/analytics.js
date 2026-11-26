// analytics.js — Google Analytics 4 for Ingrado.
//
// Ingrado is a hash-router SPA, so GA4's automatic page_view only ever fires
// for the first screen. This module loads gtag.js once and sends one
// page_view per route change, with record ids stripped out of the path so
// reports group by screen instead of by product.
//
// To switch analytics on, paste the GA4 stream's Measurement ID below.
// While it is empty the app loads no third-party script at all.

const MEASUREMENT_ID = ''; // e.g. 'G-XXXXXXXXXX'

let ready = false;

/** Load gtag.js and configure GA4. Safe to call more than once. */
export function initAnalytics() {
  if (ready || !MEASUREMENT_ID) return;
  ready = true;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  // The router sends page_view itself, so suppress the automatic one.
  window.gtag('config', MEASUREMENT_ID, { send_page_view: false });

  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(MEASUREMENT_ID)}`;
  document.head.appendChild(s);
}

// Collapse per-record hashes into one reportable path, so a thousand scanned
// products do not become a thousand rows in the Pages report.
const NORMALIZE = [
  [/^#\/report\/.+$/, '/report/:id'],
  [/^#\/compare\/.+$/, '/compare/:ids'],
  [/^#\/auth\/.+$/, '/auth/:action'],
];

/** Turn a location hash into a stable page path. */
export function pagePath(hash) {
  const clean = (hash || '#/').split('?')[0];
  const match = NORMALIZE.find(([re]) => re.test(clean));
  if (match) return match[1];
  return clean.replace(/^#/, '') || '/';
}

/** Report one screen view. `hash` is the raw location.hash. */
export function trackPageView(hash) {
  if (!ready || typeof window.gtag !== 'function') return;
  const path = pagePath(hash);
  window.gtag('event', 'page_view', {
    page_path: path,
    page_title: document.title,
    page_location: `${location.origin}${location.pathname}#${path}`,
  });
}
