// ui.js — shared rendering helpers and small components.

export function esc(str) {
  return String(str ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function toast(message, isError = false) {
  const region = document.getElementById('toast-region');
  const el = document.createElement('div');
  el.className = `toast${isError ? ' toast-error' : ''}`;
  el.textContent = message;
  region.appendChild(el);
  setTimeout(() => el.remove(), 3600);
}

export const DISCLAIMER_TEXT =
  'Ingrado provides general educational information and is not medical advice. ' +
  'Product formulations and labels can change. Always check the package and consult a ' +
  'qualified professional regarding allergies, medical conditions, pregnancy, or dietary treatment.';

export const ALLERGY_WARNING =
  'Ingredient lists and manufacturing practices can change. Always verify the package label if you have a food allergy.';

/** ODbL attribution — required wherever Open Food Facts data is shown. */
export function offAttributionHtml() {
  return '<p class="small muted" style="margin:8px 0 0;">Product data from ' +
    '<a href="https://world.openfoodfacts.org" target="_blank" rel="noopener">Open Food Facts</a> ' +
    '(<a href="https://opendatacommons.org/licenses/odbl/1-0/" target="_blank" rel="noopener">ODbL</a>).</p>';
}

export function disclaimerHtml() {
  return `<p class="disclaimer">${esc(DISCLAIMER_TEXT)}</p>`;
}

/** Level badge: always pairs color with a text label (never color alone). */
export function levelBadge(level) {
  switch (level) {
    case 'low': return '<span class="badge badge-green">Low</span>';
    case 'moderate': return '<span class="badge badge-amber">Moderate</span>';
    case 'high': return '<span class="badge badge-red">High</span>';
    default: return '<span class="badge badge-gray">Not available</span>';
  }
}

export function concernBadge(level) {
  switch (level) {
    case 'low': return '<span class="badge badge-green">Low concern</span>';
    case 'moderate': return '<span class="badge badge-amber">Worth noting</span>';
    case 'high': return '<span class="badge badge-red">Pay attention</span>';
    default: return '<span class="badge badge-gray">Not in database</span>';
  }
}

export function scoreColor(score) {
  if (score >= 8) return 'var(--green)';
  if (score >= 6) return 'var(--blue)';
  if (score >= 4) return 'var(--amber)';
  return 'var(--red)';
}

export function scoreRing(score, size = 92) {
  const pct = Math.max(0, Math.min(1, (score - 1) / 9));
  const color = scoreColor(score);
  return `
    <div class="score-ring" style="background: conic-gradient(${color} ${Math.round(pct * 360)}deg, var(--surface-2) 0deg); width:${size}px; height:${size}px;"
         role="img" aria-label="Overall score ${score} out of 10">
      <div class="score-inner">
        <span class="score-num">${esc(score)}</span>
        <span class="score-max">/ 10</span>
      </div>
    </div>`;
}

export function confidenceBadge(confidence) {
  const map = {
    high: ['badge-green', 'High confidence'],
    medium: ['badge-amber', 'Medium confidence'],
    low: ['badge-red', 'Low confidence — partial label'],
  };
  const [cls, label] = map[confidence] || ['badge-gray', 'Unknown confidence'];
  return `<span class="badge ${cls}">${label}</span>`;
}

export function overallLabelBadge(label) {
  const map = {
    'Strong choice': 'badge-green',
    'Reasonable choice': 'badge-blue',
    'Consider occasionally': 'badge-amber',
    'Compare alternatives': 'badge-red',
  };
  return `<span class="badge ${map[label] || 'badge-gray'}">${esc(label)}</span>`;
}

const CATEGORY_EMOJI = {
  'Common food ingredient': '🥗',
  Nutrient: '💊',
  Preservative: '🧂',
  Sweetener: '🍯',
  Color: '🎨',
  Flavoring: '🌿',
  Emulsifier: '🥄',
  Allergen: '⚠️',
  Other: '❔',
};

export function evidenceGradeBadge(grade) {
  if (!grade) return '';
  const map = {
    A: ['badge-green', 'Evidence: A — strong human/regulatory consensus'],
    B: ['badge-blue', 'Evidence: B — moderate human evidence'],
    C: ['badge-amber', 'Evidence: C — limited or conflicting evidence'],
    D: ['badge-gray', 'Evidence: D — mainly animal/lab studies'],
    E: ['badge-gray', 'Evidence: E — hypothesis or anecdote'],
    Unknown: ['badge-gray', 'Evidence: not assessed'],
  };
  const [cls, label] = map[grade] || map.Unknown;
  return `<span class="badge ${cls}">${label}</span>`;
}

export function ingredientCard(ing, index) {
  const emoji = CATEGORY_EMOJI[ing.category] || '❔';
  const depth = ing.depth || 0;
  // Header shows what's actually on the label (e.g. "Red 40"), with the
  // knowledge-base entry name ("Synthetic food dye") as context underneath.
  const raw = (ing.rawName || '').replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
  const headline = raw && raw.length <= 40
    ? raw.charAt(0).toUpperCase() + raw.slice(1)
    : ing.name;
  const sub = headline.toLowerCase() !== ing.name.toLowerCase() ? ing.name : '';
  return `
    <div class="ing-card" data-open="false" style="${depth ? `margin-left:${Math.min(depth, 3) * 18}px;` : ''}">
      <button class="card-toggle" data-ing-toggle="${index}" aria-expanded="false">
        <span class="row" style="gap:10px; min-width:0;">
          <span aria-hidden="true">${depth ? '↳ ' : ''}${emoji}</span>
          <span style="overflow:hidden; text-overflow:ellipsis; min-width:0;">
            ${esc(headline)}
            ${sub ? `<span class="small muted" style="display:block; font-weight:400;">${esc(sub)}</span>` : ''}
          </span>
        </span>
        <span class="row" style="gap:8px;">
          ${concernBadge(ing.concernLevel)}
          <svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        </span>
      </button>
      <div class="ing-body">
        ${ing.rawName && ing.rawName.toLowerCase() !== ing.name.toLowerCase()
          ? `<p class="small muted">On the label as: “${esc(ing.rawName)}”</p>` : ''}
        ${ing.twoPercentOrLess ? '<p class="small muted">Listed under “contains 2% or less” — a minor ingredient by weight.</p>' : ''}
        <dl>
          <dt>What it is</dt><dd>${esc(ing.plainLanguageExplanation)}</dd>
          <dt>Why it's used</dt><dd>${esc(ing.purpose)}</dd>
          <dt>What the evidence says</dt><dd>${esc(ing.evidenceSummary)} ${evidenceGradeBadge(ing.evidenceGrade)}</dd>
          ${ing.regulatory ? `<dt>Regulatory status</dt><dd>${esc(ing.regulatory)}</dd>` : ''}
          <dt>Who may want to pay closer attention</dt><dd>${esc(ing.whoShouldPayAttention)}</dd>
          <dt>Category</dt><dd>
            <span class="badge badge-gray">${esc(ing.category)}</span>
            ${ing.eNumber ? `<span class="badge badge-gray">${esc(ing.eNumber)}</span>` : ''}
            ${ing.normalizedName && ing.normalizedName.toLowerCase() !== (ing.rawName || '').toLowerCase() && ing.normalizationConfirmed
              ? `<span class="badge badge-blue">= ${esc(ing.normalizedName)}</span>` : ''}
          </dd>
          ${ing.sources && ing.sources.length ? `
            <dt>Sources</dt>
            <dd class="small">${ing.sources.map((s) =>
              `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.org)}: ${esc(s.title)}</a>`).join('<br />')}</dd>` : ''}
        </dl>
      </div>
    </div>`;
}

/** Wire up expandable ingredient cards inside `root`. */
export function bindIngredientCards(root) {
  root.querySelectorAll('[data-ing-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.ing-card');
      const open = card.getAttribute('data-open') === 'true';
      card.setAttribute('data-open', String(!open));
      btn.setAttribute('aria-expanded', String(!open));
    });
  });
}

export function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
}

/** Derive the "main concern" one-liner for history rows. */
export function mainConcernOf(scoreDetail) {
  const worst = [...(scoreDetail?.adjustments || [])]
    .filter((a) => a.delta < 0)
    .sort((a, b) => a.delta - b.delta)[0];
  return worst ? worst.reason : 'No major concerns found';
}
