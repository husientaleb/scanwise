// reconcile.js — field-level reconciliation between the photographed
// package label and a matched database record.
//
// Rules (in order):
//   1. A clear current package value wins over any third-party database.
//   2. A verified database may FILL a field the label didn't show.
//   3. A visible package value is never silently replaced.
//   4. Conflicts are recorded and surfaced, never hidden.
//   5. Missing everywhere stays null — never coerced to zero.

export const RECONCILED_FIELDS = [
  { key: 'productName', kind: 'text' },
  { key: 'brand', kind: 'text' },
  { key: 'servingSize', kind: 'text' },
  { key: 'calories', kind: 'number', tolerance: 0.1 },
  { key: 'addedSugarGrams', kind: 'number', tolerance: 0.15 },
  { key: 'sodiumMg', kind: 'number', tolerance: 0.15 },
  { key: 'saturatedFatGrams', kind: 'number', tolerance: 0.25 },
  { key: 'fiberGrams', kind: 'number', tolerance: 0.25 },
  { key: 'proteinGrams', kind: 'number', tolerance: 0.25 },
  { key: 'ingredientsText', kind: 'text' },
];

const present = (v) => v !== null && v !== undefined && v !== '';

function valuesConflict(spec, labelValue, dbValue) {
  if (!present(labelValue) || !present(dbValue)) return false;
  if (spec.kind === 'number') {
    const denom = Math.max(Math.abs(labelValue), Math.abs(dbValue), 1);
    return Math.abs(labelValue - dbValue) / denom > (spec.tolerance ?? 0.1);
  }
  const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
  return norm(labelValue) !== norm(dbValue) &&
    !norm(labelValue).includes(norm(dbValue)) && !norm(dbValue).includes(norm(labelValue));
}

/**
 * @param {object} labelData    values read from the package (user-reviewed)
 * @param {object|null} dbData  values from the matched database record
 * @param {object} [opts]       { dbTrusted: boolean } — db fills gaps only when trusted match
 * @returns {Array<{field,labelValue,databaseValue,selectedValue,selectedSource,conflict,confidence}>}
 */
export function reconcileFields(labelData, dbData, opts = {}) {
  const dbTrusted = opts.dbTrusted !== false;
  return RECONCILED_FIELDS.map((spec) => {
    const labelValue = present(labelData?.[spec.key]) ? labelData[spec.key] : null;
    const databaseValue = present(dbData?.[spec.key]) ? dbData[spec.key] : null;

    let selectedValue = null;
    let selectedSource = 'unavailable';
    let confidence = 0;

    if (labelValue !== null) {
      selectedValue = labelValue;                 // rule 1 & 3: label wins
      selectedSource = 'package_label';
      confidence = 0.95;
    } else if (databaseValue !== null && dbTrusted) {
      selectedValue = databaseValue;              // rule 2: db fills a gap
      selectedSource = 'product_database';
      confidence = 0.75;
    }

    const conflict = valuesConflict(spec, labelValue, databaseValue);
    if (conflict) confidence = Math.min(confidence, 0.8);

    return {
      field: spec.key,
      labelValue,
      databaseValue,
      selectedValue,
      selectedSource,
      conflict,
      confidence,
    };
  });
}

/** Collapse reconciliation records back into a plain data object. */
export function reconciledValues(records) {
  const out = {};
  for (const r of records) out[r.field] = r.selectedValue;
  return out;
}

/** The records the UI should surface as meaningful conflicts. */
export function meaningfulConflicts(records) {
  return records.filter((r) => r.conflict);
}
