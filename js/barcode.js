// barcode.js — retail barcode normalization, validation, and detection.
// Pure validation logic is separated from the (optional) camera/image
// detection so it is fully unit-testable.

/** Strip to digits, preserving the original for auditing. */
export function normalizeBarcode(raw) {
  const original = String(raw ?? '');
  const normalized = original.replace(/\D/g, '');
  const format = formatForLength(normalized.length);
  if (!format) {
    return { original, normalized, format: null, valid: false, reason: `Unsupported barcode length (${normalized.length} digits)` };
  }
  const valid = checkDigitValid(normalized);
  return { original, normalized, format, valid, reason: valid ? null : 'Check digit does not validate' };
}

function formatForLength(len) {
  switch (len) {
    case 8: return 'EAN-8';       // (UPC-E shares length 8; see expandUpcE)
    case 12: return 'UPC-A';
    case 13: return 'EAN-13';
    case 14: return 'GTIN-14';
    default: return null;
  }
}

/**
 * GS1 check-digit validation (UPC-A / EAN-8 / EAN-13 / GTIN-14 all use the
 * same mod-10 algorithm: from the RIGHT, odd positions ×3, even ×1).
 */
export function checkDigitValid(digits) {
  if (!/^\d{8}$|^\d{12,14}$/.test(digits)) return false;
  const nums = digits.split('').map(Number);
  const check = nums.pop();
  let sum = 0;
  nums.reverse().forEach((d, i) => { sum += d * (i % 2 === 0 ? 3 : 1); });
  return (10 - (sum % 10)) % 10 === check;
}

/** Compute the correct check digit for a body (without its check digit). */
export function computeCheckDigit(body) {
  const nums = body.split('').map(Number);
  let sum = 0;
  nums.reverse().forEach((d, i) => { sum += d * (i % 2 === 0 ? 3 : 1); });
  return (10 - (sum % 10)) % 10;
}

/**
 * Expand an 8-digit UPC-E code to its UPC-A equivalent (GS1 zero-suppression
 * rules). Returns null if the input is not a plausible UPC-E.
 */
export function expandUpcE(upce) {
  const d = upce.replace(/\D/g, '');
  if (d.length !== 8 || (d[0] !== '0' && d[0] !== '1')) return null;
  const [s, x1, x2, x3, x4, x5, x6, c] = d;
  let body;
  switch (x6) {
    case '0': case '1': case '2':
      body = `${s}${x1}${x2}${x6}0000${x3}${x4}${x5}`; break;
    case '3':
      body = `${s}${x1}${x2}${x3}00000${x4}${x5}`; break;
    case '4':
      body = `${s}${x1}${x2}${x3}${x4}00000${x5}`; break;
    default:
      body = `${s}${x1}${x2}${x3}${x4}${x5}0000${x6}`; break;
  }
  const full = body + c;
  return checkDigitValid(full) ? full : null;
}

/** Barcodes as stored for lookups: EAN-13 zero-padded GTIN when sensible. */
export function lookupKeys(normalized) {
  const keys = new Set([normalized]);
  if (normalized.length === 12) keys.add('0' + normalized); // UPC-A → EAN-13
  if (normalized.length === 13 && normalized.startsWith('0')) keys.add(normalized.slice(1));
  return [...keys];
}

/**
 * Detect a retail barcode in an image using the platform BarcodeDetector
 * (available on Chrome/Android — the primary mobile target). Falls back to
 * null with a reason; manual entry is always available in the UI.
 *
 * @param {CanvasImageSource|Blob|ImageData} source
 * @returns {Promise<{rawValue:string, format:string, confidence:'high'|'medium'}|null>}
 */
export async function detectBarcodeInImage(source) {
  if (!('BarcodeDetector' in window)) return null;
  try {
    const supported = await window.BarcodeDetector.getSupportedFormats();
    const wanted = ['upc_a', 'upc_e', 'ean_8', 'ean_13'].filter((f) => supported.includes(f));
    if (!wanted.length) return null;
    const detector = new window.BarcodeDetector({ formats: wanted });
    const results = await detector.detect(source);
    if (!results.length) return null;
    const best = results[0];
    return {
      rawValue: best.rawValue,
      format: best.format,
      // Platform detectors decode with check-digit verification; treat a
      // successful decode as high confidence, multiple conflicting decodes
      // as medium.
      confidence: results.length === 1 ? 'high' : 'medium',
    };
  } catch (err) {
    console.warn('Barcode detection failed:', err);
    return null;
  }
}
