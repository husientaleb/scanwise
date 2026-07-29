// profile.js — profile hub: guest status, optional email sign-in placeholder,
// links to preferences/pricing/legal, and privacy controls.
//
// Real authentication is wired for Supabase later (see supabase/schema.sql and
// README). For the MVP the user is always a guest with local storage.

import { esc, toast, disclaimerHtml } from '../ui.js';
import { getScans, clearAllData } from '../store.js';

export function renderProfile(el) {
  const scanCount = getScans().length;

  el.innerHTML = `
    <h1>Profile</h1>

    <section class="card">
      <div class="row">
        <span class="scan-thumb" style="font-size:1.6rem;" aria-hidden="true">👤</span>
        <div>
          <h3 style="margin:0;">Guest</h3>
          <p class="small muted" style="margin:0;">${scanCount} scan${scanCount === 1 ? '' : 's'} saved on this device</p>
        </div>
      </div>
      <p class="small muted" style="margin-top:12px;">You don't need an account to use ScanWise. Create one later to sync your history across devices.</p>
      <form id="signin-form" class="stack" style="margin-top:6px;">
        <label class="field-label" for="email" style="margin:0;">Email sign-in <span class="muted">(optional)</span></label>
        <input type="email" id="email" placeholder="you@example.com" autocomplete="email" />
        <button type="submit" class="btn btn-secondary btn-block">Send sign-in link</button>
      </form>
      <p class="small muted" id="signin-note" style="margin:8px 0 0;"></p>
    </section>

    <section class="card">
      <h2>Settings</h2>
      <div class="stack">
        <a class="btn btn-ghost btn-block" href="#/prefs">Dietary preferences</a>
        <a class="btn btn-ghost btn-block" href="#/pricing">Plans &amp; pricing</a>
        <a class="btn btn-ghost btn-block" href="#/landing">About ScanWise</a>
      </div>
    </section>

    <section class="card">
      <h2>Privacy &amp; data</h2>
      <p class="small muted">Your scans and photos are stored only on this device. Uploaded images are used solely to read the label text — never for model training unless you explicitly opt in (there is nothing to opt into yet).</p>
      <div class="stack">
        <a class="btn btn-ghost btn-block" href="#/privacy">Privacy policy</a>
        <a class="btn btn-ghost btn-block" href="#/terms">Terms of use</a>
        <button class="btn btn-danger btn-block" id="btn-wipe">Delete all my data</button>
      </div>
    </section>

    ${disclaimerHtml()}
  `;

  el.querySelector('#signin-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = el.querySelector('#email').value.trim();
    if (!email || !email.includes('@')) {
      toast('Please enter a valid email address.', true);
      return;
    }
    // Placeholder: with Supabase configured this calls signInWithOtp({ email }).
    el.querySelector('#signin-note').textContent =
      'Account sync isn\'t enabled in this build yet — your history stays safely on this device. This form will send a magic link once accounts launch.';
  });

  el.querySelector('#btn-wipe').addEventListener('click', () => {
    if (confirm('Delete ALL scans, images, and preferences from this device? This cannot be undone.')) {
      clearAllData();
      toast('All local data deleted');
      location.hash = '#/home';
    }
  });
}
