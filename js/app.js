/**
 * app.js
 * Entry point & orchestrator HIMSI Photobooth (Photo.exe).
 * Menghubungkan state.js, frames.js, camera.js, countdown.js,
 * compositor.js, processing.js, preview.js, result.js dengan DOM.
 */

import { frameList, getFrame } from './frames.js';
import {
  getState,
  setScreen,
  onScreenChange,
  setSelectedFrame,
  addPhoto,
  replacePhotoAt,
  setRetakeIndex,
  clearRetakeIndex,
  setResult,
  resetSession,
  setMirrorPreview,
  setMirrorOutput,
  clearCapturedPhotos,
} from './state.js';
import { startCamera, stopCamera, captureFrameToBlob, getCameraErrorMessage } from './camera.js';
import { runCountdown } from './countdown.js';
import { runProcessing } from './processing.js';
import { renderPreviewGrid } from './preview.js';
import { renderResult, downloadResult } from './result.js';
import { qs, qsa, wait, pulseElement } from './utils.js';

/* -------------------------------------------------------------------- */
/*  SCREEN SWITCHING                                                      */
/* -------------------------------------------------------------------- */

const screenEls = qsa('.screen');

function showScreen(name) {
  setScreen(name);
}

onScreenChange((name) => {
  screenEls.forEach((el) => {
    el.classList.toggle('is-active', el.dataset.screen === name);
  });
});

/* -------------------------------------------------------------------- */
/*  BOOT SCREEN                                                           */
/* -------------------------------------------------------------------- */

async function runBoot() {
  const bar = qs('#boot-progress-bar');
  const percentEl = qs('#boot-percent');
  const duration = 900;
  const start = performance.now();

  return new Promise((resolve) => {
    function tick(now) {
      const elapsed = now - start;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      bar.style.width = `${pct}%`;
      percentEl.textContent = `${pct}%`;
      if (pct < 100) {
        requestAnimationFrame(tick);
      } else {
        resolve();
      }
    }
    requestAnimationFrame(tick);
  });
}

/* -------------------------------------------------------------------- */
/*  LANDING SCREEN                                                        */
/* -------------------------------------------------------------------- */

function initLanding() {
  qs('#btn-yuk-foto').addEventListener('click', () => {
    showScreen('frames');
  });
}

/* -------------------------------------------------------------------- */
/*  FRAMES SCREEN                                                         */
/* -------------------------------------------------------------------- */

function renderFrameGrid() {
  const grid = qs('#frame-grid');
  grid.innerHTML = '';

  frameList.forEach((frame) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'frame-card';
    card.dataset.frameId = frame.id;

    card.innerHTML = `
      <div class="frame-card__thumb-wrap">
        <img src="${frame.thumbnail}" alt="${frame.name}" class="frame-card__thumb" />
        <span class="frame-card__check">&#10003;</span>
      </div>
      <p class="frame-card__name">${frame.photoCount} FOTO</p>
      <p class="frame-card__size">${frame.width} &times; ${frame.height} px</p>
    `;

    card.addEventListener('click', () => openFrameDialog(frame));
    grid.appendChild(card);
  });
}

let dialogFrame = null;

function openFrameDialog(frame) {
  dialogFrame = frame;
  qs('#frame-dialog-img').src = frame.overlay;
  qs('#frame-dialog-meta').textContent = `${frame.id.toUpperCase()}.PNG — ${frame.photoCount} PHOTOS — ${frame.width} × ${frame.height}`;
  qs('#frame-dialog').classList.add('is-active');
}

function closeFrameDialog() {
  qs('#frame-dialog').classList.remove('is-active');
  dialogFrame = null;
}

function initFrames() {
  renderFrameGrid();

  qs('#btn-back-to-landing').addEventListener('click', () => {
    showScreen('landing');
  });

  qs('#frame-dialog-close').addEventListener('click', closeFrameDialog);
  qs('#frame-dialog-back').addEventListener('click', closeFrameDialog);
  qs('#frame-dialog').addEventListener('click', (e) => {
    if (e.target.id === 'frame-dialog') closeFrameDialog();
  });

  qs('#frame-dialog-use').addEventListener('click', () => {
    if (!dialogFrame) return;
    const chosenFrameId = dialogFrame.id;
    setSelectedFrame(chosenFrameId);
    closeFrameDialog();
    highlightSelectedFrame(chosenFrameId);
    enterCameraScreen({ isRetake: false });
  });
}

function highlightSelectedFrame(frameId) {
  qsa('.frame-card').forEach((card) => {
    card.classList.toggle('is-selected', card.dataset.frameId === frameId);
  });
}

/* -------------------------------------------------------------------- */
/*  CAMERA SCREEN                                                         */
/* -------------------------------------------------------------------- */

const FLASH_MESSAGES = {
  start: 'Cari pose terbaikmu!',
  nice: 'Nice shot!',
  keepGoing: 'Keep going!',
  oneMore: 'One more!',
  done: 'Memory captured!',
};

function nextFlashMessage(photosTaken, total) {
  if (photosTaken >= total) return FLASH_MESSAGES.done;
  const remaining = total - photosTaken;
  if (remaining === 1) return FLASH_MESSAGES.oneMore;
  if (photosTaken === 1) return FLASH_MESSAGES.nice;
  return FLASH_MESSAGES.keepGoing;
}

function renderCameraThumbs(frame) {
  const wrap = qs('#camera-thumbs');
  wrap.innerHTML = '';
  const state = getState();

  for (let i = 0; i < frame.photoCount; i++) {
    const thumb = document.createElement('div');
    const taken = i < state.photos.length;
    thumb.className = `camera-thumb ${taken ? 'is-taken' : ''}`;
    thumb.textContent = String(i + 1).padStart(2, '0');
    wrap.appendChild(thumb);
  }
}

async function enterCameraScreen({ isRetake }) {
  showScreen('camera');

  const frame = getFrame(getState().selectedFrameId);
  qs('#camera-frame-name').textContent = `${frame.id.toUpperCase()}.PNG`;
  qs('#camera-photo-total').textContent = String(frame.photoCount).padStart(2, '0');

  const gate = qs('#camera-permission');
  const errorEl = qs('#camera-error');
  const liveEl = qs('#camera-live');

  errorEl.classList.add('is-hidden');
  qs('#live-indicator').classList.add('is-hidden');

  if (isRetake) {
    gate.classList.add('is-hidden');
    await activateCamera(frame);
  } else {
    gate.classList.remove('is-hidden');
    liveEl.classList.add('is-hidden');
  }
}

function syncMirrorToggles() {
  const state = getState();
  qs('#toggle-mirror-preview').checked = state.mirrorPreview;
  qs('#toggle-mirror-output').checked = state.mirrorOutput;
  applyMirrorPreviewClass();
}

function applyMirrorPreviewClass() {
  const video = qs('#camera-video');
  video.classList.toggle('is-mirrored', getState().mirrorPreview);
}

async function activateCamera(frame) {
  const gate = qs('#camera-permission');
  const errorEl = qs('#camera-error');
  const liveEl = qs('#camera-live');
  const video = qs('#camera-video');

  try {
    await startCamera(video);
    gate.classList.add('is-hidden');
    errorEl.classList.add('is-hidden');
    liveEl.classList.remove('is-hidden');
    qs('#live-indicator').classList.remove('is-hidden');
    syncMirrorToggles();

    const state = getState();
    const photosTaken = state.retakeIndex !== null ? state.photos.length : state.photos.length;
    qs('#camera-photo-current').textContent = String(Math.min(photosTaken + 1, frame.photoCount)).padStart(2, '0');
    qs('#camera-flash-message').textContent =
      state.photos.length === 0 ? FLASH_MESSAGES.start : nextFlashMessage(state.photos.length, frame.photoCount);
    renderCameraThumbs(frame);
    setCaptureEnabled(true);
  } catch (err) {
    console.error('[camera] getUserMedia error:', err);
    const { title, message } = getCameraErrorMessage(err);
    gate.classList.add('is-hidden');
    liveEl.classList.add('is-hidden');
    qs('#live-indicator').classList.add('is-hidden');
    qs('#camera-error-title').textContent = title;
    qs('#camera-error-message').textContent = message;
    errorEl.classList.remove('is-hidden');
  }
}

function setCaptureEnabled(enabled) {
  qs('#btn-capture').disabled = !enabled;
}

async function handleCapture() {
  const frame = getFrame(getState().selectedFrameId);
  const video = qs('#camera-video');

  setCaptureEnabled(false);

  await runCountdown({
    overlay: qs('#countdown-overlay'),
    label: qs('#countdown-label'),
    flash: qs('#countdown-flash'),
  });

  const blob = await captureFrameToBlob(video, getState().mirrorOutput);
  const state = getState();

  if (state.retakeIndex !== null) {
    replacePhotoAt(state.retakeIndex, blob);
    clearRetakeIndex();
    stopCamera(video);
    goToPreview();
    return;
  }

  addPhoto(blob);
  const updated = getState();
  renderCameraThumbs(frame);

  if (updated.photos.length >= frame.photoCount) {
    qs('#camera-flash-message').textContent = FLASH_MESSAGES.done;
    pulseElement(qs('#camera-flash-message'));
    await wait(500);
    stopCamera(video);
    goToPreview();
  } else {
    qs('#camera-photo-current').textContent = String(updated.photos.length + 1).padStart(2, '0');
    qs('#camera-flash-message').textContent = nextFlashMessage(updated.photos.length, frame.photoCount);
    pulseElement(qs('#camera-flash-message'));
    setCaptureEnabled(true);
  }
}

function initCamera() {
  qs('#btn-back-to-frames').addEventListener('click', () => {
    clearCapturedPhotos();
    showScreen('frames');
  });

  qs('#toggle-mirror-preview').addEventListener('change', (e) => {
    setMirrorPreview(e.target.checked);
    applyMirrorPreviewClass();
  });

  qs('#toggle-mirror-output').addEventListener('change', (e) => {
    setMirrorOutput(e.target.checked);
  });

  qs('#btn-enable-camera').addEventListener('click', () => {
    const frame = getFrame(getState().selectedFrameId);
    activateCamera(frame);
  });

  qs('#btn-retry-camera').addEventListener('click', () => {
    const frame = getFrame(getState().selectedFrameId);
    activateCamera(frame);
  });

  qs('#btn-capture').addEventListener('click', handleCapture);
}

/* -------------------------------------------------------------------- */
/*  PREVIEW SCREEN                                                        */
/* -------------------------------------------------------------------- */

function goToPreview() {
  showScreen('preview');
  const state = getState();
  renderPreviewGrid(qs('#preview-grid'), state.photos, handleRetakeRequest);
}

function handleRetakeRequest(index) {
  setRetakeIndex(index);
  enterCameraScreen({ isRetake: true });
}

function initPreview() {
  qs('#btn-back-to-camera').addEventListener('click', () => {
    clearCapturedPhotos();
    enterCameraScreen({ isRetake: true }); // isRetake=true = langsung live, skip gate (izin sudah didapat)
  });

  qs('#btn-continue').addEventListener('click', async () => {
    showScreen('processing');
    const frame = getFrame(getState().selectedFrameId);
    const state = getState();

    const blob = await runProcessing(frame, state.photos, {
      progressBar: qs('#processing-progress-bar'),
      progressPercent: qs('#processing-progress-percent'),
      checklist: qs('#processing-checklist'),
    });

    setResult(blob);
    showScreen('result');
    renderResult(qs('#result-image'), getState().resultUrl);
    pulseElement(qs('#btn-download'), 'btn-pulse-once');
  });
}

/* -------------------------------------------------------------------- */
/*  RESULT SCREEN                                                         */
/* -------------------------------------------------------------------- */

function initResult() {
  qs('#btn-download').addEventListener('click', () => {
    const state = getState();
    if (state.resultBlob) downloadResult(state.resultBlob);
  });

  qs('#btn-take-another').addEventListener('click', () => {
    resetSession();
    highlightSelectedFrame(null);
    showScreen('frames');
  });

  qs('#btn-back-home').addEventListener('click', () => {
    resetSession();
    highlightSelectedFrame(null);
    showScreen('landing');
  });
}

/* -------------------------------------------------------------------- */
/*  INIT                                                                  */
/* -------------------------------------------------------------------- */

async function init() {
  initLanding();
  initFrames();
  initCamera();
  initPreview();
  initResult();

  await runBoot();
  showScreen('landing');
}

init();
