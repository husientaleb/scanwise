// ocr.js — client-side OCR via Tesseract.js (loaded on demand from a CDN).
// If the library can't load (offline) or recognition fails, callers fall back
// to manual text entry — the app never blocks on OCR.

const TESSERACT_SRC = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';

let loadPromise = null;

function loadTesseract() {
  if (window.Tesseract) return Promise.resolve(window.Tesseract);
  if (loadPromise) return loadPromise;
  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = TESSERACT_SRC;
    script.onload = () => resolve(window.Tesseract);
    script.onerror = () => {
      loadPromise = null;
      reject(new Error('Could not load the text-recognition library. Check your connection, or enter the label text manually.'));
    };
    document.head.appendChild(script);
  });
  return loadPromise;
}

/**
 * Run OCR on an image data URL.
 * @param {string} dataUrl
 * @param {(pct:number, status:string)=>void} [onProgress] 0..1
 * @returns {Promise<{text:string, confidence:number}>}
 */
export async function recognizeImage(dataUrl, onProgress) {
  const Tesseract = await loadTesseract();
  const result = await Tesseract.recognize(dataUrl, 'eng', {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) onProgress(m.progress, 'Reading label…');
      else if (onProgress) onProgress(0, 'Preparing…');
    },
  });
  return {
    text: (result.data.text || '').trim(),
    confidence: (result.data.confidence || 0) / 100,
  };
}

/**
 * Heuristically split raw OCR text into label sections for the review screen.
 * Anything not confidently identified stays in the ingredients box for the
 * user to review — nothing is invented.
 */
export function sectionizeOcrText(text) {
  const out = { productName: '', brand: '', ingredientsText: '', nutritionText: '' };
  if (!text) return out;

  const lower = text.toLowerCase();

  const ingIdx = lower.search(/ingredients?\s*[:.]/);
  const nutIdx = lower.search(/nutrition\s*facts|serving\s*size|calories/);

  if (ingIdx >= 0 && nutIdx >= 0) {
    if (ingIdx < nutIdx) {
      out.ingredientsText = text.slice(ingIdx, nutIdx).trim();
      out.nutritionText = text.slice(nutIdx).trim();
    } else {
      out.nutritionText = text.slice(nutIdx, ingIdx).trim();
      out.ingredientsText = text.slice(ingIdx).trim();
    }
  } else if (ingIdx >= 0) {
    out.ingredientsText = text.slice(ingIdx).trim();
  } else if (nutIdx >= 0) {
    out.nutritionText = text.slice(nutIdx).trim();
  } else {
    // Could not identify sections; hand everything to the user to sort out.
    out.ingredientsText = text.trim();
  }

  // A line before the ingredient/nutrition sections is often the product name.
  const headIdx = Math.min(...[ingIdx, nutIdx].filter((i) => i >= 0));
  if (Number.isFinite(headIdx) && headIdx > 0) {
    const headLines = text.slice(0, headIdx).split('\n').map((l) => l.trim()).filter((l) => l.length > 2);
    if (headLines.length) out.productName = headLines[0].slice(0, 80);
    if (headLines.length > 1) out.brand = headLines[1].slice(0, 80);
  }
  return out;
}
