// legal.js — privacy policy and terms of use. Written to accurately reflect
// how this build behaves. For a large-scale commercial launch, have counsel
// review — but nothing here is a placeholder: it describes the real app.

import { disclaimerHtml } from '../ui.js';

const LAST_UPDATED = 'August 1, 2026';

export function renderLegal(el, which) {
  if (which === 'privacy') {
    el.innerHTML = `
      <a href="#/profile" class="small">← Back</a>
      <h1 style="margin-top:8px;">Privacy policy</h1>
      <p class="small muted">Last updated: ${LAST_UPDATED}</p>

      <section class="card">
        <h2>The short version</h2>
        <p class="small">ScanWise keeps your data on your device. There are no accounts, no ads, no tracking pixels, and no analytics in this version. The only things that ever leave your phone are the specific lookups you trigger, described below.</p>
      </section>

      <section class="card">
        <h2>What stays on your device</h2>
        <p class="small">Scans, reports, photos, family profiles, preferences, and favorites are stored in your browser's local storage on this device only. We run no user database. Clearing the app's site data, or using "Delete all my data" in Profile, removes everything permanently.</p>
      </section>

      <section class="card">
        <h2>What leaves your device, and when</h2>
        <p class="small"><strong>Barcode lookups.</strong> When you look up a barcode, that barcode number is sent to Open Food Facts (a non-profit, open product database) to find the product. No other personal information is sent with it.</p>
        <p class="small"><strong>Alternative searches.</strong> When you tap an alternatives button, a product-category query is sent to Open Food Facts. Again, only the query — nothing about you.</p>
        <p class="small"><strong>Label photos.</strong> Text is read from your photos on your device. If this deployment has AI analysis enabled, the label photo and text you confirmed are sent to our server for one-time analysis and are not stored there. This build's report always tells you which engine analyzed it.</p>
        <p class="small"><strong>Text-recognition library.</strong> The on-device reader is downloaded from a content-delivery network the first time you scan; your images are not uploaded to it.</p>
      </section>

      <section class="card">
        <h2>Camera photos</h2>
        <p class="small">Label photos can accidentally capture background details. Crop before analyzing, and use "Delete stored image only" on any report to remove the saved photo while keeping the report. Your images are never used to train AI models.</p>
      </section>

      <section class="card">
        <h2>Analytics and advertising</h2>
        <p class="small">None in this version. If analytics are ever added, they will be privacy-conscious, disclosed here first, and come with an opt-out.</p>
      </section>

      <section class="card">
        <h2>Your controls</h2>
        <ul class="small" style="margin:0; padding-left:20px;">
          <li>Delete any single scan, or only its stored image, from its report</li>
          <li>Delete everything: Profile → "Delete all my data"</li>
          <li>Export: your data lives in your browser's storage and never leaves without your action</li>
        </ul>
      </section>

      <section class="card">
        <h2>Questions</h2>
        <p class="small">Contact the developer through the app's store listing or repository. If this policy changes, the "last updated" date above changes with it.</p>
      </section>`;
  } else {
    el.innerHTML = `
      <a href="#/profile" class="small">← Back</a>
      <h1 style="margin-top:8px;">Terms of use</h1>
      <p class="small muted">Last updated: ${LAST_UPDATED}</p>

      <section class="card">
        <h2>What ScanWise is</h2>
        <p class="small">ScanWise is an educational tool that helps you read packaged-food labels: it explains ingredients, summarizes nutrition numbers, flags potential allergens, and points to public sources. It is not a medical device and provides no medical advice.</p>
      </section>

      <section class="card">
        <h2>Accuracy has limits</h2>
        <p class="small">Reports are built from the text you confirm, community product databases, and a curated ingredient knowledge base. Photo reading can make mistakes, database records can be outdated, and manufacturers change formulations without notice. ScanWise shows its confidence and its sources so you can judge — but the printed package label is always the authority.</p>
      </section>

      <section class="card">
        <h2>Allergies</h2>
        <p class="small">Never rely on ScanWise as your only check for a food allergy. Formulations and manufacturing practices can change. Verify the current package label before consumption, every time. ScanWise never certifies a product as allergen-free or safe.</p>
      </section>

      <section class="card">
        <h2>Scores are explanations, not verdicts</h2>
        <p class="small">Every score comes with its full calculation. Scores are general nutrition signals with published criteria — they do not establish that a product is healthy, unhealthy, or medically suitable for anyone. Consult a qualified professional for medical dietary treatment.</p>
      </section>

      <section class="card">
        <h2>Product data attribution</h2>
        <p class="small">Product information comes in part from <a href="https://world.openfoodfacts.org" target="_blank" rel="noopener">Open Food Facts</a>, available under the <a href="https://opendatacommons.org/licenses/odbl/1-0/" target="_blank" rel="noopener">Open Database License (ODbL)</a>. We're grateful to its contributors.</p>
      </section>

      <section class="card">
        <h2>Acceptable use</h2>
        <p class="small">Don't use ScanWise output to make medical or safety claims about products, to disparage manufacturers, or to republish database content in violation of its license. The app is provided as-is, without warranties, to the extent permitted by law.</p>
      </section>`;
  }
  el.insertAdjacentHTML('beforeend', disclaimerHtml());
}
