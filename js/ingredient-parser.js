// ingredient-parser.js — hierarchical ingredient-list parser.
//
// Produces a tree: compound ingredients ("chocolate chips (cane sugar, …)")
// become a parent with child records; every sub-ingredient gets its own
// record. Advisory statements ("Contains:", "May contain", facility
// warnings) are separated out — they are not ingredients and are never
// researched as if they were.

/**
 * @typedef {object} ParsedIngredient
 * @property {string} labelName    text as printed (this node only)
 * @property {string} originalText full original span including sub-list
 * @property {number} order        position within its parent (0-based)
 * @property {number} depth        0 = top-level
 * @property {ParsedIngredient[]} children
 * @property {boolean} explicit    always true for printed items
 * @property {boolean} twoPercentOrLess  appeared after a "2% or less" marker
 */

const ADVISORY_PATTERNS = [
  { type: 'contains', re: /\bcontains\s*:/i },
  { type: 'may_contain', re: /\bmay contain\b/i },
  { type: 'shared_equipment', re: /\b(made|manufactured|produced) on (shared|the same) equipment\b/i },
  { type: 'shared_facility', re: /\b(made|manufactured|produced|processed) in a (shared )?facility\b/i },
];

/** Split a string on top-level separators, respecting (), [] nesting. */
function splitTopLevel(text, separators = [',', ';', '.']) {
  const parts = [];
  let depth = 0;
  let current = '';
  for (const ch of text) {
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1);
    if (depth === 0 && separators.includes(ch)) {
      if (current.trim()) parts.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

/** Extract "name (sub, list)" → { name, subText } handling nesting. */
function splitNameAndSublist(item) {
  const open = item.search(/[([]/);
  if (open === -1) return { name: item.trim(), subText: null };
  const openCh = item[open];
  const closeCh = openCh === '(' ? ')' : ']';
  let depth = 0;
  let close = -1;
  for (let i = open; i < item.length; i++) {
    if (item[i] === openCh || item[i] === '(' || item[i] === '[') depth++;
    else if (item[i] === closeCh || item[i] === ')' || item[i] === ']') {
      depth--;
      if (depth === 0) { close = i; break; }
    }
  }
  if (close === -1) close = item.length; // unbalanced OCR — take the rest
  const name = item.slice(0, open).trim();
  const inner = item.slice(open + 1, close).trim();
  const tail = item.slice(close + 1).trim();

  // Parenthetical that is a clarifier, not a sub-list: "(to preserve
  // freshness)", "(vitamin B1)", "(color)" — single item with no separator
  // AND reading as an annotation. Keep it attached to the name.
  const looksLikeList = /[,;]/.test(inner) ||
    (name && inner.split(/\s+/).length <= 6 && /^(cane sugar|sugar|salt|cocoa|milk|soy|wheat)/i.test(inner));
  if (!looksLikeList) {
    return { name: `${name} (${inner})${tail ? ' ' + tail : ''}`.trim(), subText: null };
  }
  return { name: (name || inner).trim() + (tail ? ' ' + tail : ''), subText: name ? inner : null };
}

function parseItems(text, depth, twoPercent) {
  const items = [];
  let marker = twoPercent;
  for (const rawPart of splitTopLevel(text, depth === 0 ? [',', ';', '.'] : [',', ';'])) {
    let part = rawPart;
    // "Contains 2% or less of: salt, …" — marker applies to the rest.
    const m = part.match(/^contains\s+(?:2|two)\s*%\s*or\s*less\s*(?:of)?\s*[:]?\s*(.*)$/i)
      || part.match(/^contains\s+less\s+than\s+(?:2|two)\s*%\s*(?:of)?\s*[:]?\s*(.*)$/i);
    if (m) {
      marker = true;
      part = m[1];
      if (!part.trim()) continue;
    }
    part = part.replace(/^\s*(made with|and|including)\s+/i, '');
    if (!part.trim() || part.trim().length < 2) continue;

    const { name, subText } = splitNameAndSublist(part);
    if (!name || name.length < 2 || name.length > 140) continue;
    const node = {
      labelName: name.replace(/\s+/g, ' ').replace(/[*†]+$/, '').trim(),
      originalText: rawPart.trim(),
      order: items.length,
      depth,
      children: [],
      explicit: true,
      twoPercentOrLess: marker,
    };
    if (subText) {
      node.children = parseItems(subText, depth + 1, marker);
      node.children.forEach((c, i) => { c.order = i; });
    }
    items.push(node);
  }
  return items;
}

/**
 * Parse a full ingredient statement.
 * @returns {{ ingredients: ParsedIngredient[], advisories: Array<{type:string,text:string}> }}
 */
export function parseIngredientTree(text) {
  if (!text) return { ingredients: [], advisories: [] };

  let body = text
    .replace(/^\s*ingredients?\s*[:.]?\s*/i, '')
    .replace(/\band\/or\b/gi, ' or ');

  // Peel advisory statements off (they can appear mid-text after a period).
  const advisories = [];
  for (const sentence of splitTopLevel(body, ['.'])) {
    const hit = ADVISORY_PATTERNS.find((p) => p.re.test(sentence));
    if (hit) advisories.push({ type: hit.type, text: sentence.trim() });
  }
  // Remove advisory sentences from the ingredient body.
  body = splitTopLevel(body, ['.'])
    .filter((sentence) => !ADVISORY_PATTERNS.some((p) => p.re.test(sentence)))
    .join(', ');

  const ingredients = parseItems(body, 0, false);
  return { ingredients, advisories };
}

/** Depth-first flatten with parent references (parentIndex into result). */
export function flattenIngredientTree(tree) {
  const flat = [];
  const walk = (nodes, parentIndex) => {
    for (const node of nodes) {
      const record = { ...node, parentIndex, childCount: node.children.length };
      delete record.children;
      const idx = flat.push(record) - 1;
      walk(node.children, idx);
    }
  };
  walk(tree, null);
  return flat;
}
