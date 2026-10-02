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
  setSelectedDeviceId,
} from './state.js';
import {
  startCamera,
  stopCamera,
  switchCamera,
  captureFrameToBlob,
  getCameraErrorMessage,
  listVideoInputDevices,
  onDeviceListChange,
  watchStreamDisconnect,
} from './camera.js';
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

/* ---- Status indikator (LIVE / CAMERA OFF / CONNECTING... / CAMERA ERROR) ---- */

function setCameraStatus(status) {
  const indicator = qs('#live-indicator');
  const text = qs('#live-indicator-text');
  indicator.classList.remove('live-indicator--live', 'live-indicator--connecting', 'live-indicator--error', 'live-indicator--off');
  indicator.classList.add(`live-indicator--${status}`);
  const labels = {
    live: 'LIVE',
    connecting: 'CONNECTING...',
    error: 'CAMERA ERROR',
    off: 'CAMERA OFF',
  };
  text.textContent = labels[status] || labels.off;

  // FULL CAMERA cuma masuk akal dipakai saat stream benar-benar live.
  const fullBtn = qs('#btn-full-camera');
  if (fullBtn && !fullBtn.classList.contains('is-hidden')) {
    fullBtn.disabled = status !== 'live';
  }
}

/** Update tampilan PHOTO xx/yy di dua tempat sekaligus (bar bawah + topbar fullscreen). */
function updatePhotoCounter(current, total) {
  const currentStr = String(current).padStart(2, '0');
  const totalStr = String(total).padStart(2, '0');
  qs('#camera-photo-current').textContent = currentStr;
  qs('#camera-photo-total').textContent = totalStr;
  qs('#camera-photo-current-fs').textContent = currentStr;
  qs('#camera-photo-total-fs').textContent = totalStr;
}

/* ---- FULL CAMERA (Fullscreen API pada seluruh container live camera) ---- */

function isFullscreenSupported() {
  return Boolean(document.fullscreenEnabled || document.webkitFullscreenEnabled);
}

async function openCameraFullscreen() {
  const container = qs('#camera-live');
  try {
    if (document.fullscreenElement || document.webkitFullscreenElement) return;
    if (container.requestFullscreen) {
      await container.requestFullscreen();
    } else if (container.webkitRequestFullscreen) {
      await container.webkitRequestFullscreen();
    }
  } catch (err) {
    console.error('[camera] Fullscreen gagal diaktifkan:', err);
  }
}

async function exitCameraFullscreen() {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else if (document.webkitFullscreenElement) {
      await document.webkitExitFullscreen();
    }
  } catch (err) {
    console.error('[camera] Gagal keluar fullscreen:', err);
  }
}

/* ---- CAMERA SOURCE (enumerasi & pilih webcam internal/USB eksternal) ---- */

let unsubscribeDeviceList = null;
let unsubscribeStreamEnded = null;

async function populateCameraSourceSelect() {
  const wrap = qs('#camera-source-wrap');
  const select = qs('#camera-source-select');
  let devices = [];
  try {
    devices = await listVideoInputDevices();
  } catch (err) {
    console.error('[camera] enumerateDevices error:', err);
  }

  if (devices.length === 0) {
    wrap.classList.add('is-hidden');
    return;
  }

  wrap.classList.remove('is-hidden');
  const state = getState();
  const currentId = state.selectedDeviceId;
  const stillExists = currentId && devices.some((d) => d.deviceId === currentId);
  const activeId = stillExists ? currentId : devices[0].deviceId;
  if (!stillExists) setSelectedDeviceId(activeId);

  select.innerHTML = '';
  devices.forEach((device, i) => {
    const opt = document.createElement('option');
    opt.value = device.deviceId;
    opt.textContent = device.label || `Camera ${i + 1}`;
    if (device.deviceId === activeId) opt.selected = true;
    select.appendChild(opt);
  });
  select.disabled = devices.length <= 1;
}

function teardownCameraListeners() {
  if (unsubscribeDeviceList) {
    unsubscribeDeviceList();
    unsubscribeDeviceList = null;
  }
  if (unsubscribeStreamEnded) {
    unsubscribeStreamEnded();
    unsubscribeStreamEnded = null;
  }
}

function stopCameraAndListeners(video) {
  teardownCameraListeners();
  stopCamera(video);
  // Jangan biarkan browser "nyangkut" fullscreen begitu user meninggalkan
  // Camera.exe (foto selesai / kembali ke Frames). exitCameraFullscreen()
  // menelan errornya sendiri kalau memang sedang tidak fullscreen.
  exitCameraFullscreen();
}

function handleStreamDisconnected() {
  // Webcam tercabut fisik saat stream aktif. JANGAN hapus foto yang sudah
  // diambil, JANGAN reset frame — hanya tampilkan status & biarkan user
  // menyambungkan ulang lalu REFRESH CAMERA.
  console.warn('[camera] stream ended unexpectedly (webcam disconnected?)');
  setCaptureEnabled(false);
  setCameraStatus('off');
  qs('#camera-disconnected').classList.remove('is-hidden');
  if (unsubscribeStreamEnded) {
    unsubscribeStreamEnded();
    unsubscribeStreamEnded = null;
  }
}

async function enterCameraScreen({ isRetake }) {
  showScreen('camera');

  const frame = getFrame(getState().selectedFrameId);
  qs('#camera-frame-name').textContent = `${frame.id.toUpperCase()}.PNG`;
  qs('#camera-photo-total').textContent = String(frame.photoCount).padStart(2, '0');
  qs('#camera-photo-total-fs').textContent = String(frame.photoCount).padStart(2, '0');

  const gate = qs('#camera-permission');
  const errorEl = qs('#camera-error');
  const liveEl = qs('#camera-live');

  errorEl.classList.add('is-hidden');
  qs('#camera-disconnected').classList.add('is-hidden');
  setCameraStatus('off');

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

  teardownCameraListeners();
  qs('#camera-disconnected').classList.add('is-hidden');
  setCameraStatus('connecting');

  try {
    await startCamera(video, getState().selectedDeviceId);
    gate.classList.add('is-hidden');
    errorEl.classList.add('is-hidden');
    liveEl.classList.remove('is-hidden');
    setCameraStatus('live');
    syncMirrorToggles();
    await populateCameraSourceSelect();

    unsubscribeStreamEnded = watchStreamDisconnect(getState().mediaStream, handleStreamDisconnected);
    if (!unsubscribeDeviceList) {
      unsubscribeDeviceList = onDeviceListChange(() => populateCameraSourceSelect());
    }

    const state = getState();
    const photosTaken = state.retakeIndex !== null ? state.photos.length : state.photos.length;
    updatePhotoCounter(Math.min(photosTaken + 1, frame.photoCount), frame.photoCount);
    qs('#camera-flash-message').textContent =
      state.photos.length === 0 ? FLASH_MESSAGES.start : nextFlashMessage(state.photos.length, frame.photoCount);
    renderCameraThumbs(frame);
    setCaptureEnabled(true);
  } catch (err) {
    console.error('[camera] getUserMedia error:', err);
    const { title, message } = getCameraErrorMessage(err);
    gate.classList.add('is-hidden');
    liveEl.classList.add('is-hidden');
    setCameraStatus('error');
    qs('#camera-error-title').textContent = title;
    qs('#camera-error-message').textContent = message;
    errorEl.classList.remove('is-hidden');
  }
}

async function handleCameraSourceChange(e) {
  const newDeviceId = e.target.value;
  const video = qs('#camera-video');
  setSelectedDeviceId(newDeviceId);
  setCameraStatus('connecting');
  if (unsubscribeStreamEnded) {
    unsubscribeStreamEnded();
    unsubscribeStreamEnded = null;
  }

  try {
    await switchCamera(video, newDeviceId);
    setCameraStatus('live');
    applyMirrorPreviewClass(); // deviceId baru tidak mengubah mirror setting, pastikan class tetap sesuai
    unsubscribeStreamEnded = watchStreamDisconnect(getState().mediaStream, handleStreamDisconnected);
  } catch (err) {
    console.error('[camera] switchCamera error:', err);
    const { title, message } = getCameraErrorMessage(err);
    setCameraStatus('error');
    qs('#camera-live').classList.add('is-hidden');
    qs('#camera-error-title').textContent = title;
    qs('#camera-error-message').textContent = message;
    qs('#camera-error').classList.remove('is-hidden');
  }
}

function handleRefreshCamera() {
  qs('#camera-disconnected').classList.add('is-hidden');
  const frame = getFrame(getState().selectedFrameId);
  activateCamera(frame);
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
    stopCameraAndListeners(video);
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
    stopCameraAndListeners(video);
    goToPreview();
  } else {
    updatePhotoCounter(updated.photos.length + 1, frame.photoCount);
    qs('#camera-flash-message').textContent = nextFlashMessage(updated.photos.length, frame.photoCount);
    pulseElement(qs('#camera-flash-message'));
    setCaptureEnabled(true);
  }
}

function initCamera() {
  // Fitur Full Camera hanya ditawarkan kalau browser benar-benar mendukung
  // Fullscreen API (section 36: jangan sampai error di browser yang tak
  // mendukung — tombolnya disembunyikan total, bukan dibiarkan rusak).
  if (isFullscreenSupported()) {
    qs('#btn-full-camera').classList.remove('is-hidden');
  }

  qs('#btn-full-camera').addEventListener('click', openCameraFullscreen);
  qs('#btn-exit-fullscreen').addEventListener('click', exitCameraFullscreen);

  qs('#btn-back-to-frames').addEventListener('click', () => {
    teardownCameraListeners();
    clearCapturedPhotos();
    exitCameraFullscreen();
    showScreen('frames');
  });

  qs('#toggle-mirror-preview').addEventListener('change', (e) => {
    setMirrorPreview(e.target.checked);
    applyMirrorPreviewClass();
  });

  qs('#toggle-mirror-output').addEventListener('change', (e) => {
    setMirrorOutput(e.target.checked);
  });

  qs('#camera-source-select').addEventListener('change', handleCameraSourceChange);
  qs('#btn-refresh-camera').addEventListener('click', handleRefreshCamera);

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
