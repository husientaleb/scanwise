// landing.js — public landing page (also the first-run screen).

import { esc, disclaimerHtml } from '../ui.js';
import { setOnboarded } from '../store.js';

const FEATURES = [
  ['🔍', 'Ingredient explanations', 'Every ingredient explained in plain language — what it is, why it\'s there, and what the evidence actually says. No fear-mongering over chemical-sounding names.'],
  ['📊', 'Nutrition insights', 'Added sugar, sodium, saturated fat, fiber, and protein put in context with simple low / moderate / high ranges based on serving size.'],
  ['⚠️', 'Allergy awareness', 'Clear alerts for the nine major allergens — milk, eggs, peanuts, tree nuts, soy, wheat, fish, shellfish, and sesame.'],
  ['🌱', 'Healthier alternatives', 'Practical guidance for picking a better option in the same aisle, like "look for at least 4 g of fiber and under 6 g of added sugar."'],
  ['⚖️', 'Product comparisons', 'Put two products side by side and see which fits your priorities — with the criteria spelled out.'],
];

export function renderLanding(el) {
  el.innerHTML = `
    <div class="hero">
      <span class="logo-mark" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M3 12h18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      </span>
      <h1>Understand what's in your food.</h1>
      <p class="muted">Scan an ingredient list or nutrition label and get a clear, balanced explanation in seconds.</p>
      <p class="tagline">Scan it. Understand it. Choose better.</p>
      <div class="stack" style="margin-top:20px;">
        <a class="btn btn-primary btn-big btn-block" href="#/scan" data-onboard>Scan a Product</a>
        <a class="btn btn-secondary btn-block" href="#how-it-works">See How It Works</a>
        <a class="btn btn-ghost btn-block" href="#/home" data-onboard>Explore the app</a>
      </div>
    </div>

    <section id="how-it-works" class="card" aria-labelledby="hiw-title">
      <h2 id="hiw-title">How it works</h2>
      <div class="stack">
        <div class="row"><span class="step-num" aria-hidden="true">1</span><div><h3>Scan the label</h3><p class="muted small">Take a photo of the ingredient list and nutrition facts, upload one, or type them in.</p></div></div>
        <div class="row"><span class="step-num" aria-hidden="true">2</span><div><h3>Understand the ingredients</h3><p class="muted small">Get plain-language, evidence-based explanations — balanced, not alarmist.</p></div></div>
        <div class="row"><span class="step-num" aria-hidden="true">3</span><div><h3>Choose with confidence</h3><p class="muted small">See what stands out, get a transparent score, and find practical better options.</p></div></div>
      </div>
    </section>

    ${FEATURES.map(([emoji, title, body]) => `
      <section class="card">
        <div class="row" style="align-items:flex-start;">
          <span style="font-size:1.6rem;" aria-hidden="true">${emoji}</span>
          <div><h3>${esc(title)}</h3><p class="muted small" style="margin:0;">${esc(body)}</p></div>
        </div>
      </section>`).join('')}

    <section class="card center">
      <h2>Try it right now</h2>
      <p class="muted small">Three fictional demo products let you explore a full report without taking a photo.</p>
      <a class="btn btn-secondary btn-block" href="#/home" data-onboard>Browse demo products</a>
    </section>

    ${disclaimerHtml()}
    <p class="center small muted" style="margin-top:14px;">
      <a href="#/privacy">Privacy</a> · <a href="#/terms">Terms</a> · <a href="#/pricing">Pricing</a>
    </p>
    <p class="center small muted">Product data from <a href="https://world.openfoodfacts.org" target="_blank" rel="noopener">Open Food Facts</a> (ODbL).</p>
  `;

  // Mark onboarding as seen once the user enters the app proper.
  el.querySelectorAll('[data-onboard]').forEach((a) =>
    a.addEventListener('click', () => setOnboarded()));
}
