// compare.js — side-by-side comparison of two saved scans.

import { esc } from '../ui.js';
import { getScans, getScan } from '../store.js';
import { nutrientLevel } from '../scoring.js';

const ROWS = [
  ['addedSugarGrams', 'Added sugar', 'g', 'lower'],
  ['sodiumMg', 'Sodium', 'mg', 'lower'],
  ['saturatedFatGrams', 'Saturated fat', 'g', 'lower'],
  ['fiberGrams', 'Fiber', 'g', 'higher'],
  ['proteinGrams', 'Protein', 'g', 'higher'],
];

export function renderCompare(el, preselectedId) {
  const scans = getScans();
  let idA = preselectedId && getScan(preselectedId) ? preselectedId : (scans[0]?.id || '');
  let idB = scans.find((s) => s.id !== idA)?.id || '';

  function draw() {
    const a = getScan(idA);
    const b = getScan(idB);

    el.innerHTML = `
      <h1>Compare products</h1>
      <p class="muted small">Pick two saved scans to compare side by side.</p>

      ${scans.length < 2 ? `
        <div class="card empty-state">
          <span class="empty-emoji" aria-hidden="true">⚖️</span>
          <p>You need at least two saved scans to compare. Scan a product or open a demo product from Home.</p>
          <a class="btn btn-primary" href="#/home">Go to Home</a>
        </div>` : `
        <div class="card">
          <label class="field-label" for="sel-a">Product A</label>
          <select id="sel-a">${options(idA)}</select>
          <label class="field-label" for="sel-b" style="margin-top:12px;">Product B</label>
          <select id="sel-b">${options(idB)}</select>
        </div>
        ${a && b && a.id !== b.id ? comparison(a, b) : '<p class="card small muted">Choose two different products to see the comparison.</p>'}
      `}
    `;

    const selA = el.querySelector('#sel-a');
    const selB = el.querySelector('#sel-b');
    if (selA) selA.addEventListener('change', () => { idA = selA.value; draw(); });
    if (selB) selB.addEventListener('change', () => { idB = selB.value; draw(); });
  }

  function options(selected) {
    return scans.map((s) =>
      `<option value="${esc(s.id)}" ${s.id === selected ? 'selected' : ''}>${esc(s.productName || 'Unnamed')}${s.demo ? ' (demo)' : ''}</option>`).join('');
  }

  function fmt(v, unit) {
    return v === null || v === undefined ? '—' : `${v} ${unit}`;
  }

  function comparison(a, b) {
    const na = a.analysis.nutrition;
    const nb = b.analysis.nutrition;

    const rows = ROWS.map(([key, label, unit, better]) => {
      const va = na[key];
      const vb = nb[key];
      let winA = false;
      let winB = false;
      if (va !== null && vb !== null && va !== vb) {
        winA = better === 'lower' ? va < vb : va > vb;
        winB = !winA;
      }
      return `
        <tr>
          <th scope="row">${label}</th>
          <td class="${winA ? 'compare-better' : ''}">${fmt(va, unit)}${winA ? ' ✓' : ''}</td>
          <td class="${winB ? 'compare-better' : ''}">${fmt(vb, unit)}${winB ? ' ✓' : ''}</td>
        </tr>`;
    }).join('');

    const lenA = a.analysis.ingredients.length;
    const lenB = b.analysis.ingredients.length;

    return `
      <div class="card">
        <table class="compare-table">
          <caption style="text-align:left;font-weight:600;padding-bottom:8px;">Per serving (✓ = better on that measure)</caption>
          <thead>
            <tr>
              <th scope="col"></th>
              <th scope="col">${esc(a.productName)}</th>
              <th scope="col">${esc(b.productName)}</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
            <tr>
              <th scope="row">Ingredients</th>
              <td class="${lenA && lenB && lenA < lenB ? 'compare-better' : ''}">${lenA || '—'}${lenA && lenB && lenA < lenB ? ' ✓' : ''}</td>
              <td class="${lenA && lenB && lenB < lenA ? 'compare-better' : ''}">${lenB || '—'}${lenA && lenB && lenB < lenA ? ' ✓' : ''}</td>
            </tr>
            <tr>
              <th scope="row">Allergens</th>
              <td class="small">${a.analysis.allergens.join(', ') || 'None detected'}</td>
              <td class="small">${b.analysis.allergens.join(', ') || 'None detected'}</td>
            </tr>
            <tr>
              <th scope="row">Overall rating</th>
              <td><strong>${a.analysis.overallScore}/10</strong><br /><span class="small muted">${esc(a.analysis.overallLabel)}</span></td>
              <td><strong>${b.analysis.overallScore}/10</strong><br /><span class="small muted">${esc(b.analysis.overallLabel)}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="card">
        <h2>Bottom line</h2>
        <p class="small">${esc(conclusion(a, b))}</p>
        <p class="small muted" style="margin:0;">"Better" here means better on the specific measures shown — neither product is universally healthier, and neither comparison covers allergy safety.</p>
      </div>`;
  }

  function conclusion(a, b) {
    const na = a.analysis.nutrition;
    const nb = b.analysis.nutrition;
    const points = [];

    if (na.addedSugarGrams !== null && nb.addedSugarGrams !== null && na.addedSugarGrams !== nb.addedSugarGrams) {
      const [lo, hi] = na.addedSugarGrams < nb.addedSugarGrams ? [a, b] : [b, a];
      points.push(`${lo.productName} may be the better choice for someone prioritizing lower added sugar`);
      const fa = na.fiberGrams;
      const fb = nb.fiberGrams;
      if (fa !== null && fb !== null && fa !== fb) {
        const fiberWinner = fa > fb ? a : b;
        if (fiberWinner.id !== lo.id) points.push(`while ${fiberWinner.productName} contains more fiber`);
      }
    } else if (na.sodiumMg !== null && nb.sodiumMg !== null && na.sodiumMg !== nb.sodiumMg) {
      const lo = na.sodiumMg < nb.sodiumMg ? a : b;
      points.push(`${lo.productName} is the lower-sodium option`);
    }

    if (points.length === 0) {
      return 'These two products are close on the measures compared — check the ingredient explanations in each report for qualitative differences.';
    }
    return points.join(', ') + '.';
  }

  draw();
}
