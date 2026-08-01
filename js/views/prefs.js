// prefs.js — personal preferences that customize reports.

import { esc, toast } from '../ui.js';
import {
  getPrefs, savePrefs, PREF_LABELS,
  getProfilesState, setActiveProfile, addProfile, deleteProfile, renameProfile,
} from '../store.js';

const GROUPS = [
  ['Nutrition goals', ['lowerSugar', 'lowerSodium', 'higherProtein', 'higherFiber']],
  ['Dietary patterns', ['vegetarian', 'vegan', 'glutenAvoidance', 'dairyAvoidance']],
  ['Allergies', ['peanutAllergy', 'treeNutAllergy', 'sesameAllergy']],
  ['Ingredient choices', ['avoidArtificialColors']],
];

export function renderPrefs(el) {
  const prefs = getPrefs();
  const state = getProfilesState();
  const active = state.profiles.find((p) => p.id === state.activeId) || state.profiles[0];

  el.innerHTML = `
    <a href="#/profile" class="small">← Profile</a>
    <h1 style="margin-top:8px;">Preferences</h1>
    <p class="muted small">These customize your reports and scores — they personalize information, they don't replace medical advice. Allergy flags add alerts but never make a product "safe."</p>

    <section class="card" aria-labelledby="fam-title">
      <h2 id="fam-title" style="font-size:1.05rem;">Family profiles</h2>
      <p class="small muted">Each profile has its own preferences. Any report can be re-read through another profile's eyes.</p>
      <div class="row" style="flex-wrap:wrap; gap:8px;">
        ${state.profiles.map((p) => `
          <button type="button" class="btn ${p.id === active.id ? 'btn-primary' : 'btn-ghost'}" data-profile="${esc(p.id)}" style="padding:8px 16px; min-height:40px;">
            ${esc(p.emoji)} ${esc(p.name)}
          </button>`).join('')}
        ${state.profiles.length < 6 ? '<button type="button" class="btn btn-secondary" id="btn-add-profile" style="padding:8px 16px; min-height:40px;">+ Add</button>' : ''}
      </div>
      <div class="row" style="gap:8px; margin-top:10px;">
        <button type="button" class="btn btn-ghost small" id="btn-rename-profile" style="min-height:40px;">Rename "${esc(active.name)}"</button>
        ${state.profiles.length > 1 ? `<button type="button" class="btn btn-danger small" id="btn-del-profile" style="min-height:40px;">Delete "${esc(active.name)}"</button>` : ''}
      </div>
      <p class="small muted" style="margin:10px 0 0;">Editing below changes <strong>${esc(active.emoji)} ${esc(active.name)}</strong>'s preferences.</p>
    </section>

    <form id="prefs-form">
      ${GROUPS.map(([title, keys]) => `
        <fieldset class="card" style="border:none;">
          <legend style="font-weight:700;padding:0;">${esc(title)}</legend>
          ${keys.map((key) => `
            <label class="check-row">
              <input type="checkbox" name="${esc(key)}" ${prefs[key] ? 'checked' : ''} />
              <span>${esc(PREF_LABELS[key])}</span>
            </label>`).join('')}
        </fieldset>`).join('')}

      <div class="card">
        <label class="field-label" for="avoid-list">Avoid specific ingredients</label>
        <input type="text" id="avoid-list" name="avoidIngredients" value="${esc(prefs.avoidIngredients)}"
               placeholder="e.g. carrageenan, aspartame (comma-separated)" autocomplete="off" />
        <p class="small muted" style="margin:8px 0 0;">Products containing these get a score note and an alert in the report.</p>
      </div>

      <button type="submit" class="btn btn-primary btn-block">Save preferences</button>
    </form>
    <p class="small muted center" style="margin-top:12px;">Changes apply to new scans. Re-analyze an old scan by scanning it again.</p>
  `;

  el.querySelectorAll('[data-profile]').forEach((btn) =>
    btn.addEventListener('click', () => { setActiveProfile(btn.dataset.profile); renderPrefs(el); }));
  el.querySelector('#btn-add-profile')?.addEventListener('click', () => {
    const name = prompt('Profile name (e.g. "Maya", "Grandpa", "Low-sodium")');
    if (name === null) return;
    const emoji = prompt('Pick an emoji for this profile (optional)', '👤') || '👤';
    addProfile(name.trim() || 'New profile', emoji.trim().slice(0, 4) || '👤');
    renderPrefs(el);
    toast('Profile added — set its preferences below');
  });
  el.querySelector('#btn-rename-profile')?.addEventListener('click', () => {
    const name = prompt('New name for this profile', active.name);
    if (name === null) return;
    renameProfile(active.id, name.trim());
    renderPrefs(el);
  });
  el.querySelector('#btn-del-profile')?.addEventListener('click', () => {
    if (confirm(`Delete the "${active.name}" profile and its preferences?`)) {
      deleteProfile(active.id);
      renderPrefs(el);
      toast('Profile deleted');
    }
  });

  el.querySelector('#prefs-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.target;
    const next = {};
    for (const key of Object.keys(PREF_LABELS)) {
      next[key] = form.elements[key]?.checked || false;
    }
    next.avoidIngredients = form.elements.avoidIngredients.value.trim();
    savePrefs(next);
    toast('Preferences saved');
  });
}
