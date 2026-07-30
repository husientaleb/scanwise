// scan.js — capture / upload / manual entry, with preview, rotate, crop,
// then OCR hand-off to the review screen.

import { esc, toast } from '../ui.js';
import { session } from '../main.js';
import { recognizeImage, sectionizeOcrText } from '../ocr.js';
import { detectBarcodeInImage, normalizeBarcode } from '../barcode.js';

const MAX_FILE_MB = 10;
const MAX_DIM = 1600;

let state = null; // { canvas, ctx, image, rotation, cropRect, dragStart }

export function renderScan(el) {
  state = { rotation: 0, cropRect: null };
  const mode = (location.hash.split('?mode=')[1] || '').trim();

  el.innerHTML = `
    <a href="#/home" class="small">← Back</a>
    <h1 style="margin-top:8px;">Scan a product</h1>
    <p class="muted">Photograph the ingredient list and nutrition label clearly. Good lighting and a flat label help a lot.</p>

    <div id="scan-options" class="stack">
      <button class="scan-option" id="opt-camera">
        <span class="opt-icon" style="background:var(--green-soft);color:var(--green-deep);">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h3l2-2h6l2 2h3v13H4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="13" r="4" fill="none" stroke="currentColor" stroke-width="2"/></svg>
        </span>
        <span><strong>Take a photo</strong><br /><span class="small muted">Use your camera to capture the label</span></span>
      </button>
      <button class="scan-option" id="opt-upload">
        <span class="opt-icon" style="background:var(--blue-soft);color:var(--blue-deep);">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4m0 0 4 4m-4-4-4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        </span>
        <span><strong>Upload a photo</strong><br /><span class="small muted">Choose an image from your device</span></span>
      </button>
      <button class="scan-option" id="opt-manual">
        <span class="opt-icon" style="background:var(--surface-2);color:var(--ink-soft);">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L20 8l-4-4L4 16v4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>
        </span>
        <span><strong>Enter ingredients manually</strong><br /><span class="small muted">Type or paste the label text</span></span>
      </button>
    </div>

    <input type="file" id="file-camera" accept="image/*" capture="environment" hidden aria-hidden="true" />
    <input type="file" id="file-upload" accept="image/jpeg,image/png,image/webp,image/heic" hidden aria-hidden="true" />

    <div id="preview-area" hidden>
      <div class="preview-wrap" style="margin-bottom:12px;">
        <canvas id="preview-canvas" aria-label="Preview of your label photo"></canvas>
        <div class="crop-hint" id="crop-hint">Drag on the image to crop to the label area</div>
      </div>
      <div class="row" style="flex-wrap:wrap; gap:8px; margin-bottom:12px;">
        <button class="btn btn-ghost" id="btn-rotate">↻ Rotate</button>
        <button class="btn btn-ghost" id="btn-crop" disabled>✂ Apply crop</button>
        <button class="btn btn-ghost" id="btn-reset">Reset</button>
        <button class="btn btn-danger" id="btn-remove">Remove</button>
      </div>
      <button class="btn btn-primary btn-big btn-block" id="btn-analyze">Analyze this label</button>
      <p class="small muted center" style="margin-top:10px;">By analyzing, you confirm you're okay uploading this image for text extraction. Avoid capturing people or personal items in the background. <a href="#/privacy">Privacy</a></p>
    </div>

    <div id="ocr-progress" hidden class="card center">
      <span class="spinner" aria-hidden="true"></span>
      <p id="ocr-status" style="margin:10px 0 8px;">Preparing…</p>
      <div class="progress-bar"><div class="progress-fill" id="ocr-fill" style="width:0%"></div></div>
      <p class="small muted" style="margin-top:10px;">Text is extracted on your device. You'll review it before analysis.</p>
    </div>

    <div id="ocr-error" hidden class="card">
      <h3>We couldn't read that image</h3>
      <p class="muted small" id="ocr-error-msg"></p>
      <div class="stack">
        <button class="btn btn-secondary" id="btn-retry">Try again</button>
        <button class="btn btn-ghost" id="btn-manual-fallback">Enter the text manually instead</button>
      </div>
    </div>
  `;

  const fileCamera = el.querySelector('#file-camera');
  const fileUpload = el.querySelector('#file-upload');

  el.querySelector('#opt-camera').addEventListener('click', () => fileCamera.click());
  el.querySelector('#opt-upload').addEventListener('click', () => fileUpload.click());
  el.querySelector('#opt-manual').addEventListener('click', () => goManual());
  fileCamera.addEventListener('change', () => handleFile(el, fileCamera.files[0]));
  fileUpload.addEventListener('change', () => handleFile(el, fileUpload.files[0]));

  el.querySelector('#btn-rotate').addEventListener('click', () => { state.rotation = (state.rotation + 90) % 360; state.cropRect = null; drawPreview(el); });
  el.querySelector('#btn-crop').addEventListener('click', () => applyCrop(el));
  el.querySelector('#btn-reset').addEventListener('click', () => { state.rotation = 0; state.cropRect = null; state.workingImage = state.image; drawPreview(el); });
  el.querySelector('#btn-remove').addEventListener('click', () => {
    state = { rotation: 0, cropRect: null };
    el.querySelector('#preview-area').hidden = true;
    el.querySelector('#scan-options').hidden = false;
    fileCamera.value = '';
    fileUpload.value = '';
  });
  el.querySelector('#btn-analyze').addEventListener('click', () => analyze(el));
  el.querySelector('#btn-retry').addEventListener('click', () => {
    el.querySelector('#ocr-error').hidden = true;
    el.querySelector('#preview-area').hidden = false;
  });
  el.querySelector('#btn-manual-fallback').addEventListener('click', () => goManual(true));

  bindCropDrag(el);

  if (mode === 'upload') fileUpload.click();
  if (mode === 'manual') goManual();
}

function goManual(keepImage = false) {
  if (!keepImage) {
    session.pendingImage = null;
    session.pendingThumbnail = null;
    session.pendingBarcode = null;
  }
  session.pendingExtracted = {
    productName: '', brand: '', ingredientsText: '', nutritionText: '',
    source: 'manual', ocrConfidence: null,
  };
  location.hash = '#/review';
}

function handleFile(el, file) {
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    toast('That file type isn\'t supported. Please choose a JPEG, PNG, or WebP image.', true);
    return;
  }
  if (file.size > MAX_FILE_MB * 1024 * 1024) {
    toast(`That image is too large (over ${MAX_FILE_MB} MB). Try a smaller photo.`, true);
    return;
  }
  const reader = new FileReader();
  reader.onerror = () => toast('Could not read that file. Please try another image.', true);
  reader.onload = () => {
    const img = new Image();
    img.onerror = () => toast('That image could not be decoded. Please try a JPEG or PNG.', true);
    img.onload = () => {
      state.image = img;
      state.workingImage = img;
      state.rotation = 0;
      state.cropRect = null;
      el.querySelector('#scan-options').hidden = true;
      el.querySelector('#preview-area').hidden = false;
      drawPreview(el);
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

function drawPreview(el) {
  const canvas = el.querySelector('#preview-canvas');
  const img = state.workingImage;
  if (!img) return;

  const rot = state.rotation;
  const swap = rot === 90 || rot === 270;
  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;
  const scale = Math.min(1, MAX_DIM / Math.max(srcW, srcH));
  const w = Math.round(srcW * scale);
  const h = Math.round(srcH * scale);

  canvas.width = swap ? h : w;
  canvas.height = swap ? w : h;
  const ctx = canvas.getContext('2d');
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rot * Math.PI) / 180);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();

  drawCropOverlay(el);
}

function drawCropOverlay(el) {
  const canvas = el.querySelector('#preview-canvas');
  const ctx = canvas.getContext('2d');
  if (state.cropRect) {
    const { x, y, w, h } = state.cropRect;
    ctx.save();
    ctx.fillStyle = 'rgba(11,21,18,0.5)';
    ctx.fillRect(0, 0, canvas.width, y);
    ctx.fillRect(0, y + h, canvas.width, canvas.height - y - h);
    ctx.fillRect(0, y, x, h);
    ctx.fillRect(x + w, y, canvas.width - x - w, h);
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);
    ctx.restore();
  }
  el.querySelector('#btn-crop').disabled = !state.cropRect || state.cropRect.w < 20 || state.cropRect.h < 20;
}

function canvasPoint(canvas, evt) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((evt.clientX - rect.left) / rect.width) * canvas.width,
    y: ((evt.clientY - rect.top) / rect.height) * canvas.height,
  };
}

function bindCropDrag(el) {
  const canvas = el.querySelector('#preview-canvas');
  let start = null;
  canvas.addEventListener('pointerdown', (e) => {
    if (!state.workingImage) return;
    canvas.setPointerCapture(e.pointerId);
    start = canvasPoint(canvas, e);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!start) return;
    const p = canvasPoint(canvas, e);
    state.cropRect = {
      x: Math.round(Math.min(start.x, p.x)),
      y: Math.round(Math.min(start.y, p.y)),
      w: Math.round(Math.abs(p.x - start.x)),
      h: Math.round(Math.abs(p.y - start.y)),
    };
    // Redraw base image then overlay.
    redrawBase(el);
    drawCropOverlay(el);
  });
  const end = () => { start = null; };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
}

function redrawBase(el) {
  const canvas = el.querySelector('#preview-canvas');
  const img = state.workingImage;
  if (!img) return;
  const ctx = canvas.getContext('2d');
  const rot = state.rotation;
  const swap = rot === 90 || rot === 270;
  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;
  const scale = Math.min(1, MAX_DIM / Math.max(srcW, srcH));
  const w = Math.round(srcW * scale);
  const h = Math.round(srcH * scale);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rot * Math.PI) / 180);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
}

function applyCrop(el) {
  const canvas = el.querySelector('#preview-canvas');
  const { x, y, w, h } = state.cropRect;
  // Render the current (rotated) view without overlay, then cut the crop out.
  redrawBase(el);
  const ctx = canvas.getContext('2d');
  const data = ctx.getImageData(x, y, w, h);
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  out.getContext('2d').putImageData(data, 0, 0);

  const img = new Image();
  img.onload = () => {
    state.workingImage = img;
    state.rotation = 0;
    state.cropRect = null;
    drawPreview(el);
    toast('Cropped. You can crop again or analyze.');
  };
  img.src = out.toDataURL('image/jpeg', 0.92);
}

function exportImages(el) {
  redrawBase(el);
  const canvas = el.querySelector('#preview-canvas');
  const full = canvas.toDataURL('image/jpeg', 0.9);

  const thumb = document.createElement('canvas');
  const scale = 220 / Math.max(canvas.width, canvas.height);
  thumb.width = Math.max(1, Math.round(canvas.width * scale));
  thumb.height = Math.max(1, Math.round(canvas.height * scale));
  thumb.getContext('2d').drawImage(canvas, 0, 0, thumb.width, thumb.height);
  return { full, thumbnail: thumb.toDataURL('image/jpeg', 0.7) };
}

async function analyze(el) {
  const { full, thumbnail } = exportImages(el);
  session.pendingImage = full;
  session.pendingThumbnail = thumbnail;

  // Stage: try to read a retail barcode from the photo (best-effort; the
  // review screen always allows manual entry).
  session.pendingBarcode = null;
  try {
    const canvas = el.querySelector('#preview-canvas');
    const detected = await detectBarcodeInImage(canvas);
    if (detected) {
      const bc = normalizeBarcode(detected.rawValue);
      session.pendingBarcode = { ...bc, confidence: bc.valid ? detected.confidence : 'low', source: 'detected' };
    }
  } catch { /* detection is optional */ }

  el.querySelector('#preview-area').hidden = true;
  const progress = el.querySelector('#ocr-progress');
  progress.hidden = false;
  const fill = el.querySelector('#ocr-fill');
  const status = el.querySelector('#ocr-status');

  try {
    const { text, confidence } = await recognizeImage(full, (pct, msg) => {
      fill.style.width = `${Math.round(pct * 100)}%`;
      status.textContent = msg;
    });

    if (!text || text.replace(/\s/g, '').length < 15) {
      throw new Error('We couldn\'t find readable text. The photo may be blurry, dark, or at an angle. Try retaking it closer to the label, or enter the text manually.');
    }

    const sections = sectionizeOcrText(text);
    session.pendingExtracted = { ...sections, source: 'ocr', ocrConfidence: confidence, rawText: text };
    if (confidence < 0.55) {
      toast('The text was hard to read — please double-check it on the next screen.');
    }
    location.hash = '#/review';
  } catch (err) {
    progress.hidden = true;
    const box = el.querySelector('#ocr-error');
    box.hidden = false;
    el.querySelector('#ocr-error-msg').textContent = err.message || 'Something went wrong while reading the image.';
  }
}
