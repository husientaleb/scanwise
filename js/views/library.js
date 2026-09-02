// library.js — the searchable ingredient encyclopedia, built directly from
// the curated knowledge base so it is always in sync with what reports say.

import { esc, ingredientCard, bindIngredientCards } from '../ui.js';
import { INGREDIENT_DB } from '../ingredients-db.js';
import { normalizeIngredientName } from '../normalize.js';

const entryToIngredient = (entry) => ({
  name: entry.name,
  rawName: entry.name,
  category: entry.category,
  purpose: entry.purpose,
  plainLanguageExplanation: entry.explanation,
  evidenceSummary: entry.evidence,
  whoShouldPayAttention: entry.attention,
  concernLevel: entry.concernLevel,
  evidenceGrade: entry.evidenceGrade || null,
  regulatory: entry.regulatory || null,
  sources: entry.sources || null,
  aliases: entry.match,
});

export function renderLibrary(el) {
  let query = '';
  let category = 'all';

  const all = INGREDIENT_DB.map(entryToIngredient)
    .sort((a, b) => a.name.localeCompare(b.name));
  const categories = [...new Set(all.map((i) => i.category))].sort();

  function matches(ing) {
    if (category !== 'all' && ing.category !== category) return false;
    if (!query) return true;
    const q = query.toLowerCase().trim();
    // Route the query through the normalizer so "E322" or "HFCS" find their
    // canonical entries.
    const qn = normalizeIngredientName(q).normalizedName.toLowerCase();
    const hit = (term) =>
      ing.name.toLowerCase().includes(term) ||
      ing.aliases.some((a) => a.includes(term) || term.includes(a)) ||
      ing.plainLanguageExplanation.toLowerCase().includes(term);
    return hit(q) || (qn !== q && hit(qn));
  }

  function draw() {
    const shown = all.filter(matches);
    el.innerHTML = `
      <h1>Ingredient library</h1>
      <p class="muted small">Every entry in Ingrado's knowledge base — the same explanations, evidence grades, and sources your reports use. ${all.length} entries and growing.</p>

      <label class="field-label" for="lib-search" style="position:absolute;left:-9999px;">Search ingredients</label>
      <input type="search" id="lib-search" placeholder="Search by name or alias (e.g. lecithin, E322, dye)…" value="${esc(query)}" />

      <label class="field-label" for="lib-cat" style="margin-top:10px;">Category</label>
      <select id="lib-cat">
        <option value="all" ${category === 'all' ? 'selected' : ''}>All categories (${all.length})</option>
        ${categories.map((c) => `<option value="${esc(c)}" ${category === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}
      </select>

      <div style="margin-top:14px;">
        ${shown.length === 0
          ? `<div class="card empty-state"><span class="empty-emoji" aria-hidden="true">🔍</span>
             <p>No entries match. Ingredients not in the library yet still get honest "unknown" handling in reports.</p></div>`
          : shown.map((ing, i) => ingredientCard(ing, i)).join('')}
      </div>
      <p class="small muted center" style="margin-top:12px;">Spotted something outdated? Corrections land in the knowledge base with the next release.</p>
    `;

    bindIngredientCards(el);
    const search = el.querySelector('#lib-search');
    search.addEventListener('input', () => {
      query = search.value;
      const pos = search.selectionStart;
      draw();
      const next = el.querySelector('#lib-search');
      next.focus();
      next.setSelectionRange(pos, pos);
    });
    el.querySelector('#lib-cat').addEventListener('change', (e) => {
      category = e.target.value;
      draw();
    });
  }

  draw();
}
