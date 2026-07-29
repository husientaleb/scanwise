// pricing.js — freemium pricing page. Billing is intentionally inert until
// Stripe is configured; buttons are placeholders.

import { toast } from '../ui.js';

export function renderPricing(el) {
  el.innerHTML = `
    <a href="#/profile" class="small">← Profile</a>
    <h1 style="margin-top:8px;">Plans</h1>
    <p class="muted small">ScanWise is free to use. Plus unlocks power features when billing launches.</p>

    <div class="plan-card" style="margin-bottom:14px;">
      <h2>Free</h2>
      <p class="plan-price">$0</p>
      <ul>
        <li>20 scans per month</li>
        <li>Ingredient explanations</li>
        <li>Nutrition summary &amp; transparent score</li>
        <li>Scan history on this device</li>
      </ul>
      <button class="btn btn-ghost btn-block" disabled>Your current plan</button>
    </div>

    <div class="plan-card plan-plus">
      <span class="badge badge-green" style="position:absolute;top:-12px;left:18px;">Coming soon</span>
      <h2>ScanWise Plus</h2>
      <p class="plan-price">$5.99<span class="small muted">/month</span></p>
      <p class="small muted">or $39.99/year (about 44% off)</p>
      <ul>
        <li>Unlimited scans</li>
        <li>Product comparisons</li>
        <li>Personalized dietary preferences</li>
        <li>Family profiles</li>
        <li>Advanced alternative suggestions</li>
        <li>Exportable reports</li>
        <li>Longer scan history with sync</li>
      </ul>
      <button class="btn btn-primary btn-block" id="btn-plus">Join the waitlist</button>
      <p class="small muted center" style="margin:10px 0 0;">Prices are placeholders. No payment is collected — billing activates only when Stripe is configured.</p>
    </div>
  `;

  el.querySelector('#btn-plus').addEventListener('click', () => {
    toast('Thanks for your interest! Billing isn\'t live yet — everything currently in the app is free.');
  });
}
