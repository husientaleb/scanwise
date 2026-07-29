// prefs.js — personal preferences that customize reports.

import { esc, toast } from '../ui.js';
import { getPrefs, savePrefs, PREF_LABELS } from '../store.js';

const GROUPS = [
  ['Nutrition goals', ['lowerSugar', 'lowerSodium', 'higherProtein', 'higherFiber']],
  ['Dietary patterns', ['vegetarian', 'vegan', 'glutenAvoidance', 'dairyAvoidance']],
  ['Allergies', ['peanutAllergy', 'treeNutAllergy', 'sesameAllergy']],
  ['Ingredient choices', ['avoidArtificialColors']],
];

export function renderPrefs(el) {
  const prefs = getPrefs();

  el.innerHTML = `
    <a href="#/profile" class="small">← Profile</a>
    <h1 style="margin-top:8px;">Preferences</h1>
    <p class="muted small">These customize your reports and scores — they personalize information, they don't replace medical advice. Allergy flags add alerts but never make a product "safe."</p>

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
