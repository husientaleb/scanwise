// legal.js — privacy-policy and terms-of-use placeholders.

import { disclaimerHtml } from '../ui.js';

export function renderLegal(el, which) {
  if (which === 'privacy') {
    el.innerHTML = `
      <a href="#/profile" class="small">← Back</a>
      <h1 style="margin-top:8px;">Privacy policy</h1>
      <p class="badge badge-amber">Placeholder — replace before public launch</p>
      <section class="card">
        <h2>What ScanWise stores</h2>
        <p class="small">Scans, reports, preferences, and label photos are stored locally on your device. Nothing is sent to a server in this build except optional AI label analysis, which transmits only the photo/text you submit.</p>
        <h2>Camera photos</h2>
        <p class="small">Label photos can accidentally capture background details (people, documents, your kitchen). Crop before analyzing, and use "Delete stored image only" on any report to remove the saved photo while keeping the report.</p>
        <h2>Model training</h2>
        <p class="small">Your images are never used to train AI models unless you explicitly opt in. There is currently no opt-in — so they are never used for training, full stop.</p>
        <h2>Deleting your data</h2>
        <p class="small">Profile → "Delete all my data" removes every scan, image, and preference from this device immediately. When accounts launch, account deletion will remove synced data as well.</p>
      </section>`;
  } else {
    el.innerHTML = `
      <a href="#/profile" class="small">← Back</a>
      <h1 style="margin-top:8px;">Terms of use</h1>
      <p class="badge badge-amber">Placeholder — replace before public launch</p>
      <section class="card">
        <h2>Educational information only</h2>
        <p class="small">ScanWise summarizes publicly available nutrition knowledge. It is not a medical device, does not diagnose conditions, and must not be relied on for allergy safety — always read the physical package.</p>
        <h2>Accuracy</h2>
        <p class="small">Text extraction and analysis can make mistakes, and product formulations change. Reports reflect only the text you confirmed on the review screen.</p>
        <h2>Acceptable use</h2>
        <p class="small">Don't use ScanWise output to make medical claims about products or to disparage manufacturers. Scores are general nutrition signals with published criteria, not verdicts.</p>
      </section>`;
  }
  el.insertAdjacentHTML('beforeend', disclaimerHtml());
}
