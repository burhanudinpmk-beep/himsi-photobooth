/**
 * ============================================================
 * HIMSI META PHOTOBOOTH
 * app.js
 * ============================================================
 *
 * Main Application Controller
 *
 * Mengatur:
 * - Landing
 * - Frame selection
 * - Camera
 * - External webcam
 * - Mirror preview
 * - Mirror output
 * - Fullscreen camera
 * - Capture
 * - Preview
 * - Retake
 * - Processing
 * - Result
 * - Cloud upload
 * - QR preparation
 */


/* ============================================================
   IMPORT
============================================================ */

import {
  frameList,
  getFrame
} from './frames.js';


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


import {
  runCountdown
} from './countdown.js';


import {
  runProcessing
} from './processing.js';


import {
  renderPreviewGrid
} from './preview.js';


import {
  renderResult,
  downloadResult,
  processResult,
  getUploadedPhoto,
  getPublicUrl,
  resetResult
} from './result.js';


import {
  qs,
  qsa,
  wait,
  pulseElement
} from './utils.js';


/* ============================================================
   CONSTANT
============================================================ */

const FLASH_MESSAGES = {

  start:
    'READY?',

  keepGoing:
    'NICE! KEEP GOING!',

  almostDone:
    'ONE MORE!',

  done:
    'AWESOME!'

};


/* ============================================================
   SCREEN MANAGEMENT
============================================================ */

function showScreen(
  screenName
) {

  /*
   * Update application state.
   */

  setScreen(
    screenName
  );


  /*
   * Hide semua screen.
   */

  qsa(
    '[data-screen]'
  ).forEach(
    screen => {

      screen.classList.add(
        'is-hidden'
      );

    }
  );


  /*
   * Cari screen tujuan.
   */

  const targetScreen =
    qs(
      `[data-screen="${screenName}"]`
    );


  if (!targetScreen) {

    console.error(
      `[HIMSI] Screen tidak ditemukan: ${screenName}`
    );

    return;

  }


  /*
   * Tampilkan screen.
   */

  targetScreen.classList.remove(
    'is-hidden'
  );


  /*
   * Scroll kembali ke atas.
   */

  window.scrollTo({
    top: 0,
    left: 0,
    behavior: 'instant'
  });

}


/* ============================================================
   SCREEN CHANGE LISTENER
============================================================ */

onScreenChange(
  screenName => {

    document.body.dataset.screen =
      screenName;

  }
);


/* ============================================================
   BOOT
============================================================ */

async function runBoot() {

  const bootScreen =
    qs('#boot-screen');


  if (!bootScreen) {

    return;

  }


  bootScreen.classList.remove(
    'is-hidden'
  );


  /*
   * Beri waktu animasi boot.
   */

  await wait(
    900
  );


  bootScreen.classList.add(
    'is-hidden'
  );

}


/* ============================================================
   LANDING
============================================================ */

function initLanding() {

  const startButton =
    qs('#btn-start');


  if (!startButton) {

    console.warn(
      '[HIMSI] #btn-start tidak ditemukan.'
    );

    return;

  }


  startButton.addEventListener(
    'click',
    () => {

      /*
       * Pastikan sesi sebelumnya
       * sudah bersih.
       */

      resetResult();

      resetSession();


      /*
       * Masuk pemilihan frame.
       */

      showScreen(
        'frames'
      );

    }
  );

}


/* ============================================================
   FRAME SELECTION
============================================================ */

function renderFrames() {

  const container =
    qs('#frame-list');


  if (!container) {

    console.error(
      '[HIMSI] #frame-list tidak ditemukan.'
    );

    return;

  }


  container.innerHTML =
    '';


  frameList.forEach(
    frame => {

      const card =
        document.createElement(
          'button'
        );


      card.type =
        'button';


      card.className =
        'frame-card';


      card.dataset.frameId =
        frame.id;


      /*
       * Preview frame.
       */

      const image =
        document.createElement(
          'img'
        );


      image.src =
        frame.preview ||
        frame.src ||
        frame.image;


      image.alt =
        `Frame ${frame.name || frame.id}`;


      image.loading =
        'lazy';


      /*
       * Frame information.
       */

      const info =
        document.createElement(
          'div'
        );


      info.className =
        'frame-card-info';


      const title =
        document.createElement(
          'span'
        );


      title.className =
        'frame-card-title';


      title.textContent =
        frame.name ||
        frame.id.toUpperCase();


      const count =
        document.createElement(
          'span'
        );


      count.className =
        'frame-card-count';


      count.textContent =
        `${frame.photoCount} PHOTO`;


      info.appendChild(
        title
      );


      info.appendChild(
        count
      );


      card.appendChild(
        image
      );


      card.appendChild(
        info
      );


      /*
       * Frame click.
       */

      card.addEventListener(
        'click',
        () => {

          handleFrameSelection(
            frame.id
          );

        }
      );


      container.appendChild(
        card
      );

    }
  );

}


/* ============================================================
   HIGHLIGHT SELECTED FRAME
============================================================ */

function highlightSelectedFrame(
  frameId
) {

  qsa(
    '.frame-card'
  ).forEach(
    card => {

      const selected =
        card.dataset.frameId ===
        frameId;


      card.classList.toggle(
        'is-selected',
        selected
      );

    }
  );

}


/* ============================================================
   HANDLE FRAME SELECTION
============================================================ */

function handleFrameSelection(
  frameId
) {

  const frame =
    getFrame(
      frameId
    );


  if (!frame) {

    console.error(
      '[HIMSI] Frame tidak ditemukan:',
      frameId
    );

    return;

  }


  /*
   * Simpan frame.
   */

  setSelectedFrame(
    frameId
  );


  /*
   * Visual selection.
   */

  highlightSelectedFrame(
    frameId
  );


  /*
   * Aktifkan tombol continue.
   */

  const continueButton =
    qs('#btn-frame-continue');


  if (continueButton) {

    continueButton.disabled =
      false;

  }

}


/* ============================================================
   INIT FRAMES
============================================================ */

function initFrames() {

  renderFrames();


  const continueButton =
    qs('#btn-frame-continue');


  if (continueButton) {

    continueButton.disabled =
      true;


    continueButton.addEventListener(
      'click',
      () => {

        const state =
          getState();


        if (
          !state.selectedFrameId
        ) {

          console.warn(
            '[HIMSI] Pilih frame terlebih dahulu.'
          );

          return;

        }


        /*
         * Bersihkan foto dari sesi sebelumnya.
         */

        clearCapturedPhotos();


        /*
         * Masuk kamera.
         */

        enterCameraScreen({
          isRetake: false
        });

      }
    );

  }


  /*
   * Back to landing.
   */

  const backButton =
    qs('#btn-frames-back');


  if (backButton) {

    backButton.addEventListener(
      'click',
      () => {

        resetSession();

        resetResult();

        highlightSelectedFrame(
          null
        );

        showScreen(
          'landing'
        );

      }
    );

  }

}


/* ============================================================
   FLASH MESSAGE
============================================================ */

function nextFlashMessage(
  photoCount,
  total
) {

  if (
    photoCount >= total
  ) {

    return FLASH_MESSAGES.done;

  }


  if (
    photoCount ===
    total - 1
  ) {

    return FLASH_MESSAGES.almostDone;

  }


  if (
    photoCount === 0
  ) {

    return FLASH_MESSAGES.start;

  }


  return FLASH_MESSAGES.keepGoing;

}


/* ============================================================
   CAMERA THUMBNAILS
============================================================ */

function renderCameraThumbs(
  frame
) {

  const wrap =
    qs('#camera-thumbs');


  if (!wrap) {

    return;

  }


  wrap.innerHTML =
    '';


  const state =
    getState();


  for (
    let i = 0;
    i < frame.photoCount;
    i++
  ) {

    const thumb =
      document.createElement(
        'div'
      );


    const taken =
      i <
      state.photos.length;


    thumb.className =
      `camera-thumb ${
        taken
          ? 'is-taken'
          : ''
      }`;


    thumb.textContent =
      String(i + 1)
        .padStart(
          2,
          '0'
        );


    wrap.appendChild(
      thumb
    );

  }

}

/* ============================================================
   CAMERA STATUS
============================================================ */

function setCameraStatus(
  status
) {

  const indicator =
    qs('#live-indicator');

  const text =
    qs('#live-indicator-text');


  if (!indicator || !text) {

    return;

  }


  indicator.classList.remove(
    'live-indicator--live',
    'live-indicator--connecting',
    'live-indicator--error',
    'live-indicator--off'
  );


  indicator.classList.add(
    `live-indicator--${status}`
  );


  const labels = {

    live:
      'LIVE',

    connecting:
      'CONNECTING...',

    error:
      'CAMERA ERROR',

    off:
      'CAMERA OFF'

  };


  text.textContent =
    labels[status] ||
    labels.off;


  /*
   * Fullscreen hanya aktif
   * ketika kamera LIVE.
   */

  const fullButton =
    qs('#btn-full-camera');


  if (
    fullButton &&
    !fullButton.classList.contains(
      'is-hidden'
    )
  ) {

    fullButton.disabled =
      status !== 'live';

  }

}


/* ============================================================
   PHOTO COUNTER
============================================================ */

function updatePhotoCounter(
  current,
  total
) {

  const currentText =
    String(current)
      .padStart(
        2,
        '0'
      );


  const totalText =
    String(total)
      .padStart(
        2,
        '0'
      );


  /*
   * Normal camera UI
   */

  const currentEl =
    qs('#camera-photo-current');


  const totalEl =
    qs('#camera-photo-total');


  if (currentEl) {

    currentEl.textContent =
      currentText;

  }


  if (totalEl) {

    totalEl.textContent =
      totalText;

  }


  /*
   * Fullscreen camera UI
   */

  const currentFs =
    qs('#camera-photo-current-fs');


  const totalFs =
    qs('#camera-photo-total-fs');


  if (currentFs) {

    currentFs.textContent =
      currentText;

  }


  if (totalFs) {

    totalFs.textContent =
      totalText;

  }

}


/* ============================================================
   FULLSCREEN SUPPORT
============================================================ */

function isFullscreenSupported() {

  return Boolean(
    document.fullscreenEnabled ||
    document.webkitFullscreenEnabled
  );

}


/* ============================================================
   OPEN CAMERA FULLSCREEN
============================================================ */

async function openCameraFullscreen() {

  const container =
    qs('#camera-live');


  if (!container) {

    console.warn(
      '[camera] Camera live container tidak ditemukan.'
    );

    return;

  }


  try {

    /*
     * Jangan request fullscreen
     * kalau sudah fullscreen.
     */

    if (
      document.fullscreenElement ||
      document.webkitFullscreenElement
    ) {

      return;

    }


    if (
      container.requestFullscreen
    ) {

      await container
        .requestFullscreen();

    } else if (
      container.webkitRequestFullscreen
    ) {

      await container
        .webkitRequestFullscreen();

    } else {

      console.warn(
        '[camera] Fullscreen API tidak didukung.'
      );

    }

  } catch (error) {

    console.error(
      '[camera] Fullscreen gagal:',
      error
    );

  }

}


/* ============================================================
   EXIT CAMERA FULLSCREEN
============================================================ */

async function exitCameraFullscreen() {

  try {

    if (
      document.fullscreenElement
    ) {

      await document
        .exitFullscreen();

    } else if (
      document.webkitFullscreenElement
    ) {

      await document
        .webkitExitFullscreen();

    }

  } catch (error) {

    console.error(
      '[camera] Gagal keluar fullscreen:',
      error
    );

  }

}


/* ============================================================
   FULLSCREEN CHANGE
============================================================ */

function handleFullscreenChange() {

  const isFullscreen =
    Boolean(
      document.fullscreenElement ||
      document.webkitFullscreenElement
    );


  const cameraLive =
    qs('#camera-live');


  if (cameraLive) {

    cameraLive.classList.toggle(
      'is-fullscreen-camera',
      isFullscreen
    );

  }


  const exitButton =
    qs('#btn-exit-fullscreen');


  if (exitButton) {

    exitButton.classList.toggle(
      'is-hidden',
      !isFullscreen
    );

  }

}


/* ============================================================
   CAMERA SOURCE STATE
============================================================ */

let unsubscribeDeviceList =
  null;


let unsubscribeStreamEnded =
  null;


/* ============================================================
   POPULATE CAMERA SOURCE SELECT
============================================================ */

async function populateCameraSourceSelect() {

  const wrap =
    qs('#camera-source-wrap');


  const select =
    qs('#camera-source-select');


  if (
    !wrap ||
    !select
  ) {

    return;

  }


  let devices =
    [];


  try {

    devices =
      await listVideoInputDevices();

  } catch (error) {

    console.error(
      '[camera] Gagal membaca daftar webcam:',
      error
    );

  }


  /*
   * Tidak ada webcam.
   */

  if (
    devices.length === 0
  ) {

    wrap.classList.add(
      'is-hidden'
    );

    return;

  }


  wrap.classList.remove(
    'is-hidden'
  );


  const state =
    getState();


  const currentId =
    state.selectedDeviceId;


  /*
   * Pastikan device yang tersimpan
   * masih tersedia.
   */

  const deviceStillExists =
    currentId &&
    devices.some(
      device =>
        device.deviceId ===
        currentId
    );


  /*
   * Kalau belum ada device pilihan,
   * gunakan webcam pertama.
   */

  const activeId =
    deviceStillExists
      ? currentId
      : devices[0].deviceId;


  if (
    !deviceStillExists
  ) {

    setSelectedDeviceId(
      activeId
    );

  }


  /*
   * Render select webcam.
   */

  select.innerHTML =
    '';


  devices.forEach(
    (
      device,
      index
    ) => {

      const option =
        document.createElement(
          'option'
        );


      option.value =
        device.deviceId;


      option.textContent =
        device.label ||
        `Camera ${index + 1}`;


      if (
        device.deviceId ===
        activeId
      ) {

        option.selected =
          true;

      }


      select.appendChild(
        option
      );

    }
  );


  /*
   * Kalau cuma ada satu kamera,
   * dropdown tidak perlu aktif.
   */

  select.disabled =
    devices.length <= 1;

}


/* ============================================================
   CAMERA LISTENER CLEANUP
============================================================ */

function teardownCameraListeners() {

  if (
    unsubscribeDeviceList
  ) {

    unsubscribeDeviceList();

    unsubscribeDeviceList =
      null;

  }


  if (
    unsubscribeStreamEnded
  ) {

    unsubscribeStreamEnded();

    unsubscribeStreamEnded =
      null;

  }

}


/* ============================================================
   STOP CAMERA + LISTENER
============================================================ */

function stopCameraAndListeners(
  video
) {

  teardownCameraListeners();


  if (video) {

    stopCamera(
      video
    );

  }


  exitCameraFullscreen();

}


/* ============================================================
   STREAM DISCONNECTED
============================================================ */

function handleStreamDisconnected() {

  console.warn(
    '[camera] Webcam terputus.'
  );


  setCaptureEnabled(
    false
  );


  setCameraStatus(
    'off'
  );


  const disconnected =
    qs('#camera-disconnected');


  if (disconnected) {

    disconnected.classList.remove(
      'is-hidden'
    );

  }


  if (
    unsubscribeStreamEnded
  ) {

    unsubscribeStreamEnded();

    unsubscribeStreamEnded =
      null;

  }

}


/* ============================================================
   ENTER CAMERA SCREEN
============================================================ */

async function enterCameraScreen({
  isRetake = false
} = {}) {

  showScreen(
    'camera'
  );


  const state =
    getState();


  const frame =
    getFrame(
      state.selectedFrameId
    );


  if (!frame) {

    console.error(
      '[camera] Frame belum dipilih.'
    );

    showScreen(
      'frames'
    );

    return;

  }


  /*
   * Nama frame.
   */

  const frameName =
    qs('#camera-frame-name');


  if (frameName) {

    frameName.textContent =
      `${frame.id.toUpperCase()}.PNG`;

  }


  /*
   * Total photo.
   */

  const total =
    String(
      frame.photoCount
    ).padStart(
      2,
      '0'
    );


  const totalNormal =
    qs('#camera-photo-total');


  const totalFullscreen =
    qs('#camera-photo-total-fs');


  if (totalNormal) {

    totalNormal.textContent =
      total;

  }


  if (totalFullscreen) {

    totalFullscreen.textContent =
      total;

  }


  const gate =
    qs('#camera-permission');


  const errorEl =
    qs('#camera-error');


  const liveEl =
    qs('#camera-live');


  /*
   * Reset camera error UI.
   */

  if (errorEl) {

    errorEl.classList.add(
      'is-hidden'
    );

  }


  const disconnected =
    qs('#camera-disconnected');


  if (disconnected) {

    disconnected.classList.add(
      'is-hidden'
    );

  }


  setCameraStatus(
    'off'
  );


  /*
   * RETAKE:
   * tidak perlu menampilkan permission gate
   * lagi.
   */

  if (isRetake) {

    if (gate) {

      gate.classList.add(
        'is-hidden'
      );

    }


    await activateCamera(
      frame
    );


    return;

  }


  /*
   * NORMAL SESSION:
   * tampilkan permission gate.
   */

  if (gate) {

    gate.classList.remove(
      'is-hidden'
    );

  }


  if (liveEl) {

    liveEl.classList.add(
      'is-hidden'
    );

  }

}


/* ============================================================
   MIRROR PREVIEW
============================================================ */

function applyMirrorPreviewClass() {

  const video =
    qs('#camera-video');


  if (!video) {

    return;

  }


  /*
   * Mirror Preview hanya mengubah
   * tampilan video secara visual.
   *
   * Tidak mengubah file hasil foto.
   */

  video.classList.toggle(
    'is-mirrored',
    Boolean(
      getState()
        .mirrorPreview
    )
  );

}


/* ============================================================
   SYNC MIRROR TOGGLES
============================================================ */

function syncMirrorToggles() {

  const state =
    getState();


  const previewToggle =
    qs('#toggle-mirror-preview');


  const outputToggle =
    qs('#toggle-mirror-output');


  if (previewToggle) {

    previewToggle.checked =
      Boolean(
        state.mirrorPreview
      );

  }


  if (outputToggle) {

    outputToggle.checked =
      Boolean(
        state.mirrorOutput
      );

  }


  applyMirrorPreviewClass();

}


/* ============================================================
   ACTIVATE CAMERA
============================================================ */

async function activateCamera(
  frame
) {

  const gate =
    qs('#camera-permission');


  const errorEl =
    qs('#camera-error');


  const liveEl =
    qs('#camera-live');


  const video =
    qs('#camera-video');


  if (!video) {

    console.error(
      '[camera] #camera-video tidak ditemukan.'
    );

    return;

  }


  /*
   * Bersihkan listener lama.
   */

  teardownCameraListeners();


  const disconnected =
    qs('#camera-disconnected');


  if (disconnected) {

    disconnected.classList.add(
      'is-hidden'
    );

  }


  setCameraStatus(
    'connecting'
  );


  try {

    /*
     * startCamera akan menggunakan
     * selectedDeviceId jika tersedia.
     */

    await startCamera(
      video,
      getState()
        .selectedDeviceId
    );


    /*
     * Camera berhasil aktif.
     */

    if (gate) {

      gate.classList.add(
        'is-hidden'
      );

    }


    if (errorEl) {

      errorEl.classList.add(
        'is-hidden'
      );

    }


    if (liveEl) {

      liveEl.classList.remove(
        'is-hidden'
      );

    }


    setCameraStatus(
      'live'
    );


    /*
     * Terapkan mirror preview.
     */

    syncMirrorToggles();


    /*
     * Setelah permission diberikan,
     * label webcam biasanya baru tersedia.
     */

    await populateCameraSourceSelect();


    /*
     * Pantau webcam eksternal jika
     * tiba-tiba dicabut.
     */

    unsubscribeStreamEnded =
      watchStreamDisconnect(
        getState().mediaStream,
        handleStreamDisconnected
      );


    /*
     * Pantau perubahan daftar webcam.
     */

    if (
      !unsubscribeDeviceList
    ) {

      unsubscribeDeviceList =
        onDeviceListChange(
          () => {

            populateCameraSourceSelect();

          }
        );

    }


    /*
     * Update counter.
     */

    const state =
      getState();


    updatePhotoCounter(
      Math.min(
        state.photos.length + 1,
        frame.photoCount
      ),
      frame.photoCount
    );


    /*
     * Flash message.
     */

    const flashMessage =
      qs('#camera-flash-message');


    if (flashMessage) {

      flashMessage.textContent =
        nextFlashMessage(
          state.photos.length,
          frame.photoCount
        );

    }


    /*
     * Thumbnail.
     */

    renderCameraThumbs(
      frame
    );


    /*
     * Capture aktif.
     */

    setCaptureEnabled(
      true
    );

  } catch (error) {

    console.error(
      '[camera] getUserMedia gagal:',
      error
    );


    const {
      title,
      message
    } =
      getCameraErrorMessage(
        error
      );


    if (gate) {

      gate.classList.add(
        'is-hidden'
      );

    }


    if (liveEl) {

      liveEl.classList.add(
        'is-hidden'
      );

    }


    setCameraStatus(
      'error'
    );


    const errorTitle =
      qs('#camera-error-title');


    const errorMessage =
      qs('#camera-error-message');


    if (errorTitle) {

      errorTitle.textContent =
        title;

    }


    if (errorMessage) {

      errorMessage.textContent =
        message;

    }


    if (errorEl) {

      errorEl.classList.remove(
        'is-hidden'
      );

    }

  }

}


/* ============================================================
   SWITCH EXTERNAL CAMERA
============================================================ */

async function handleCameraSourceChange(
  event
) {

  const newDeviceId =
    event.target.value;


  if (!newDeviceId) {

    return;

  }


  const video =
    qs('#camera-video');


  if (!video) {

    return;

  }


  /*
   * Simpan device baru.
   */

  setSelectedDeviceId(
    newDeviceId
  );


  setCameraStatus(
    'connecting'
  );


  /*
   * Stop listener stream lama.
   */

  if (
    unsubscribeStreamEnded
  ) {

    unsubscribeStreamEnded();

    unsubscribeStreamEnded =
      null;

  }


  try {

    /*
     * Pindah webcam.
     */

    await switchCamera(
      video,
      newDeviceId
    );


    setCameraStatus(
      'live'
    );


    /*
     * Mirror harus tetap diterapkan
     * setelah pergantian webcam.
     */

    applyMirrorPreviewClass();


    /*
     * Pantau stream webcam baru.
     */

    unsubscribeStreamEnded =
      watchStreamDisconnect(
        getState().mediaStream,
        handleStreamDisconnected
      );


    console.log(
      '[camera] Webcam berhasil diganti:',
      newDeviceId
    );

  } catch (error) {

    console.error(
      '[camera] switchCamera gagal:',
      error
    );


    const {
      title,
      message
    } =
      getCameraErrorMessage(
        error
      );


    setCameraStatus(
      'error'
    );


    const live =
      qs('#camera-live');


    if (live) {

      live.classList.add(
        'is-hidden'
      );

    }


    const errorTitle =
      qs('#camera-error-title');


    const errorMessage =
      qs('#camera-error-message');


    const errorBox =
      qs('#camera-error');


    if (errorTitle) {

      errorTitle.textContent =
        title;

    }


    if (errorMessage) {

      errorMessage.textContent =
        message;

    }


    if (errorBox) {

      errorBox.classList.remove(
        'is-hidden'
      );

    }

  }

}


/* ============================================================
   REFRESH CAMERA
============================================================ */

function handleRefreshCamera() {

  const disconnected =
    qs('#camera-disconnected');


  if (disconnected) {

    disconnected.classList.add(
      'is-hidden'
    );

  }


  const frame =
    getFrame(
      getState()
        .selectedFrameId
    );


  if (!frame) {

    console.error(
      '[camera] Frame tidak tersedia.'
    );

    return;

  }


  activateCamera(
    frame
  );

}


/* ============================================================
   FULLSCREEN EVENT LISTENERS
============================================================ */

document.addEventListener(
  'fullscreenchange',
  handleFullscreenChange
);


document.addEventListener(
  'webkitfullscreenchange',
  handleFullscreenChange
);

/* ============================================================
   CAPTURE BUTTON STATE
============================================================ */

function setCaptureEnabled(
  enabled
) {

  const button =
    qs('#btn-capture');


  if (!button) {
    return;
  }


  button.disabled =
    !enabled;

}


/* ============================================================
   HANDLE CAPTURE
============================================================ */

async function handleCapture() {

  const state =
    getState();


  const frame =
    getFrame(
      state.selectedFrameId
    );


  const video =
    qs('#camera-video');


  if (!frame) {

    console.error(
      '[camera] Frame tidak tersedia.'
    );

    return;

  }


  if (!video) {

    console.error(
      '[camera] Video element tidak ditemukan.'
    );

    return;

  }


  /*
   * Cegah double click capture.
   */

  setCaptureEnabled(
    false
  );


  try {

    /* ========================================================
       COUNTDOWN
    ======================================================== */

    await runCountdown({

      overlay:
        qs('#countdown-overlay'),

      label:
        qs('#countdown-label'),

      flash:
        qs('#countdown-flash')

    });


    /* ========================================================
       CAPTURE VIDEO → BLOB
    ======================================================== */

    /*
     * PENTING:
     *
     * mirrorPreview
     * hanya mengatur tampilan live camera.
     *
     * mirrorOutput
     * mengatur orientasi FILE FOTO.
     *
     * Kalau ingin hasil foto tidak terbalik,
     * mirrorOutput sebaiknya FALSE.
     */

    const photoBlob =
      await captureFrameToBlob(
        video,
        getState().mirrorOutput
      );


    if (
      !(photoBlob instanceof Blob)
    ) {

      throw new Error(
        'Camera tidak menghasilkan Blob foto.'
      );

    }


    const currentState =
      getState();


    /* ========================================================
       RETAKE MODE
    ======================================================== */

    if (
      currentState.retakeIndex !==
      null
    ) {

      /*
       * Ganti foto lama dengan foto baru.
       */

      replacePhotoAt(
        currentState.retakeIndex,
        photoBlob
      );


      /*
       * Keluar dari mode retake.
       */

      clearRetakeIndex();


      /*
       * Matikan camera.
       */

      stopCameraAndListeners(
        video
      );


      /*
       * Kembali ke Preview.
       */

      goToPreview();


      return;

    }


    /* ========================================================
       NORMAL CAPTURE
    ======================================================== */

    addPhoto(
      photoBlob
    );


    const updatedState =
      getState();


    /*
     * Update thumbnail.
     */

    renderCameraThumbs(
      frame
    );


    /* ========================================================
       ALL PHOTOS COMPLETE
    ======================================================== */

    if (
      updatedState.photos.length >=
      frame.photoCount
    ) {

      const message =
        qs('#camera-flash-message');


      if (message) {

        message.textContent =
          FLASH_MESSAGES.done;


        pulseElement(
          message
        );

      }


      /*
       * Sedikit delay agar user
       * melihat pesan selesai.
       */

      await wait(
        500
      );


      /*
       * Stop webcam.
       */

      stopCameraAndListeners(
        video
      );


      /*
       * Preview.
       */

      goToPreview();


      return;

    }


    /* ========================================================
       NEXT PHOTO
    ======================================================== */

    updatePhotoCounter(
      updatedState.photos.length + 1,
      frame.photoCount
    );


    const flashMessage =
      qs('#camera-flash-message');


    if (flashMessage) {

      flashMessage.textContent =
        nextFlashMessage(
          updatedState.photos.length,
          frame.photoCount
        );


      pulseElement(
        flashMessage
      );

    }


    /*
     * Capture siap lagi.
     */

    setCaptureEnabled(
      true
    );


  } catch (error) {

    console.error(
      '[camera] Capture gagal:',
      error
    );


    /*
     * Kalau terjadi error,
     * aktifkan kembali tombol.
     */

    setCaptureEnabled(
      true
    );

  }

}


/* ============================================================
   INIT CAMERA
============================================================ */

function initCamera() {

  /* ==========================================================
     FULLSCREEN SUPPORT
  ========================================================== */

  const fullscreenButton =
    qs('#btn-full-camera');


  if (
    fullscreenButton &&
    isFullscreenSupported()
  ) {

    fullscreenButton.classList.remove(
      'is-hidden'
    );


    fullscreenButton.addEventListener(
      'click',
      openCameraFullscreen
    );

  }


  /* ==========================================================
     EXIT FULLSCREEN
  ========================================================== */

  const exitFullscreenButton =
    qs('#btn-exit-fullscreen');


  if (exitFullscreenButton) {

    exitFullscreenButton.addEventListener(
      'click',
      exitCameraFullscreen
    );

  }


  /* ==========================================================
     BACK TO FRAME
  ========================================================== */

  const backToFrames =
    qs('#btn-back-to-frames');


  if (backToFrames) {

    backToFrames.addEventListener(
      'click',
      () => {

        const video =
          qs('#camera-video');


        /*
         * Matikan webcam jika aktif.
         */

        if (video) {

          stopCameraAndListeners(
            video
          );

        } else {

          teardownCameraListeners();

        }


        /*
         * Hapus foto sesi saat ini.
         */

        clearCapturedPhotos();


        /*
         * Pastikan mode retake bersih.
         */

        clearRetakeIndex();


        /*
         * Keluar fullscreen.
         */

        exitCameraFullscreen();


        /*
         * Kembali ke frame selection.
         */

        showScreen(
          'frames'
        );

      }
    );

  }


  /* ==========================================================
     MIRROR PREVIEW
  ========================================================== */

  const mirrorPreviewToggle =
    qs('#toggle-mirror-preview');


  if (mirrorPreviewToggle) {

    mirrorPreviewToggle.addEventListener(
      'change',
      event => {

        /*
         * Hanya tampilan camera.
         */

        setMirrorPreview(
          event.target.checked
        );


        applyMirrorPreviewClass();

      }
    );

  }


  /* ==========================================================
     MIRROR OUTPUT
  ========================================================== */

  const mirrorOutputToggle =
    qs('#toggle-mirror-output');


  if (mirrorOutputToggle) {

    mirrorOutputToggle.addEventListener(
      'change',
      event => {

        /*
         * Menentukan apakah hasil file
         * foto ikut mirror.
         */

        setMirrorOutput(
          event.target.checked
        );

      }
    );

  }


  /* ==========================================================
     EXTERNAL WEBCAM SELECT
  ========================================================== */

  const cameraSource =
    qs('#camera-source-select');


  if (cameraSource) {

    cameraSource.addEventListener(
      'change',
      handleCameraSourceChange
    );

  }


  /* ==========================================================
     REFRESH CAMERA
  ========================================================== */

  const refreshButton =
    qs('#btn-refresh-camera');


  if (refreshButton) {

    refreshButton.addEventListener(
      'click',
      handleRefreshCamera
    );

  }


  /* ==========================================================
     ENABLE CAMERA
  ========================================================== */

  const enableCameraButton =
    qs('#btn-enable-camera');


  if (enableCameraButton) {

    enableCameraButton.addEventListener(
      'click',
      () => {

        const frame =
          getFrame(
            getState()
              .selectedFrameId
          );


        if (!frame) {

          console.error(
            '[camera] Frame belum dipilih.'
          );

          return;

        }


        activateCamera(
          frame
        );

      }
    );

  }


  /* ==========================================================
     RETRY CAMERA
  ========================================================== */

  const retryCameraButton =
    qs('#btn-retry-camera');


  if (retryCameraButton) {

    retryCameraButton.addEventListener(
      'click',
      () => {

        const frame =
          getFrame(
            getState()
              .selectedFrameId
          );


        if (!frame) {

          return;

        }


        activateCamera(
          frame
        );

      }
    );

  }


  /* ==========================================================
     CAPTURE
  ========================================================== */

  const captureButton =
    qs('#btn-capture');


  if (captureButton) {

    captureButton.addEventListener(
      'click',
      handleCapture
    );

  }

}


/* ============================================================
   GO TO PREVIEW
============================================================ */

function goToPreview() {

  /*
   * Tampilkan Preview Screen.
   */

  showScreen(
    'preview'
  );


  const state =
    getState();


  /*
   * Pastikan ada foto.
   */

  if (
    !state.photos ||
    state.photos.length === 0
  ) {

    console.warn(
      '[preview] Tidak ada foto untuk ditampilkan.'
    );

    return;

  }


  const previewGrid =
    qs('#preview-grid');


  if (!previewGrid) {

    console.error(
      '[preview] #preview-grid tidak ditemukan.'
    );

    return;

  }


  /*
   * Render seluruh hasil capture.
   */

  renderPreviewGrid(
    previewGrid,
    state.photos,
    handleRetakeRequest
  );

}


/* ============================================================
   RETAKE PHOTO
============================================================ */

function handleRetakeRequest(
  index
) {

  const state =
    getState();


  /*
   * Validasi index.
   */

  if (
    index < 0 ||
    index >= state.photos.length
  ) {

    console.error(
      '[preview] Retake index tidak valid:',
      index
    );

    return;

  }


  /*
   * Simpan index foto yang
   * ingin diulang.
   */

  setRetakeIndex(
    index
  );


  /*
   * Masuk camera dalam Retake Mode.
   */

  enterCameraScreen({
    isRetake: true
  });

}


/* ============================================================
   INIT PREVIEW
============================================================ */

function initPreview() {

  /* ==========================================================
     BACK TO CAMERA
  ========================================================== */

  const backButton =
    qs('#btn-back-to-camera');


  if (backButton) {

    backButton.addEventListener(
      'click',
      () => {

        /*
         * Tombol ini berarti user
         * ingin mengulang sesi foto.
         */

        clearCapturedPhotos();


        clearRetakeIndex();


        enterCameraScreen({
          isRetake: true
        });

      }
    );

  }


  /* ==========================================================
     CONTINUE → PROCESSING
  ========================================================== */

  const continueButton =
    qs('#btn-continue');


  if (continueButton) {

    continueButton.addEventListener(
      'click',
      handleContinueToProcessing
    );

  }

}


/* ============================================================
   PROCESSING PLACEHOLDER
============================================================ */

/*
 * Fungsi lengkapnya berada pada Tahap 4.
 *
 * Kita deklarasikan sebagai function declaration,
 * sehingga initPreview() dapat memanggilnya
 * walaupun definisi lengkap berada di bawah.
 */

async function handleContinueToProcessing() {

  /*
   * ISI FINAL ADA DI TAHAP 4.
   *
   * Jangan menambahkan kode di sini dahulu.
   */

  console.warn(
    '[HIMSI] Processing handler belum dipasang. Lanjutkan ke Tahap 4.'
  );

}

/* ============================================================
   PROCESSING → RESULT
============================================================ */

async function handleContinueToProcessing() {

  /*
   * Cegah tombol Continue ditekan
   * berkali-kali ketika processing.
   */

  const continueButton =
    qs('#btn-continue');


  if (continueButton) {

    continueButton.disabled =
      true;

  }


  try {

    /* ========================================================
       VALIDATE STATE
    ======================================================== */

    const state =
      getState();


    const frame =
      getFrame(
        state.selectedFrameId
      );


    if (!frame) {

      throw new Error(
        'Frame tidak ditemukan.'
      );

    }


    if (
      !state.photos ||
      state.photos.length === 0
    ) {

      throw new Error(
        'Tidak ada foto yang dapat diproses.'
      );

    }


    /*
     * Pastikan jumlah foto sesuai
     * kebutuhan frame.
     */

    if (
      state.photos.length <
      frame.photoCount
    ) {

      throw new Error(
        `Foto belum lengkap. Dibutuhkan ${frame.photoCount} foto.`
      );

    }


    /* ========================================================
       PROCESSING SCREEN
    ======================================================== */

    showScreen(
      'processing'
    );


    console.log(
      '[HIMSI] Processing final photo...'
    );


    /* ========================================================
       GENERATE FINAL PHOTO
    ======================================================== */

    const finalBlob =
      await runProcessing(
        frame,
        state.photos,
        {

          progressBar:
            qs(
              '#processing-progress-bar'
            ),

          progressPercent:
            qs(
              '#processing-progress-percent'
            ),

          checklist:
            qs(
              '#processing-checklist'
            )

        }
      );


    /* ========================================================
       VALIDATE FINAL BLOB
    ======================================================== */

    if (
      !(finalBlob instanceof Blob)
    ) {

      throw new Error(
        'Processing tidak menghasilkan Blob foto.'
      );

    }


    console.log(
      '[HIMSI] Final Blob:',
      finalBlob
    );


    console.log(
      '[HIMSI] Final photo size:',
      (
        finalBlob.size /
        1024 /
        1024
      ).toFixed(2),
      'MB'
    );


    /* ========================================================
       SAVE RESULT TO STATE
    ======================================================== */

    setResult(
      finalBlob
    );


    const finalState =
      getState();


    if (
      !finalState.resultUrl
    ) {

      throw new Error(
        'Result URL tidak berhasil dibuat.'
      );

    }


    /* ========================================================
       RESET PREVIOUS CLOUD RESULT
    ======================================================== */

    resetResult();


    /* ========================================================
       SHOW RESULT SCREEN
    ======================================================== */

    showScreen(
      'result'
    );


    /*
     * Jangan menunggu upload untuk
     * menampilkan foto.
     *
     * Pengunjung harus langsung
     * melihat hasil fotonya.
     */

    renderResult(
      qs('#result-image'),
      finalState.resultUrl
    );


    /* ========================================================
       DOWNLOAD BUTTON EFFECT
    ======================================================== */

    const downloadButton =
      qs('#btn-download');


    if (downloadButton) {

      pulseElement(
        downloadButton,
        'btn-pulse-once'
      );

    }


    /* ========================================================
       CLOUD UPLOAD
    ======================================================== */

    /*
     * Upload dipisahkan dari processing utama.
     *
     * Kalau internet gagal:
     * - foto tetap tampil
     * - local download tetap bekerja
     *
     * Ini penting untuk penggunaan
     * photobooth di acara.
     */

    try {

      console.log(
        '[HIMSI] Uploading final photo...'
      );


      /*
       * processResult:
       *
       * 1. render
       * 2. simpan Blob
       * 3. upload
       * 4. simpan Public URL
       *
       * Render kedua tidak masalah,
       * tetapi menggunakan URL yang sama.
       */

      const uploadedPhoto =
        await processResult(
          qs('#result-image'),
          finalState.resultUrl,
          finalState.resultBlob
        );


      if (
        !uploadedPhoto ||
        !uploadedPhoto.url
      ) {

        throw new Error(
          'Upload selesai tetapi Public URL tidak tersedia.'
        );

      }


      console.log(
        '[HIMSI] ================================='
      );


      console.log(
        '[HIMSI] PHOTO UPLOAD SUCCESS'
      );


      console.log(
        '[HIMSI] Public URL:',
        uploadedPhoto.url
      );


      console.log(
        '[HIMSI] ================================='
      );


      /*
       * result.js sudah menyimpan:
       *
       * window.HimsiLastUploadedPhoto
       *
       * dan mengirim event:
       *
       * himsi-photo-uploaded
       *
       * Jadi JANGAN dispatch event kedua
       * di app.js.
       */


    } catch (
      uploadError
    ) {

      /*
       * Upload gagal tidak boleh
       * merusak halaman Result.
       */

      console.error(
        '[HIMSI] Cloud upload gagal:',
        uploadError
      );


      /*
       * Foto tetap ada karena
       * finalState.resultBlob dan
       * finalState.resultUrl tersimpan
       * di state aplikasi.
       */

    }


  } catch (
    processingError
  ) {

    console.error(
      '[HIMSI] Processing gagal:',
      processingError
    );


    alert(
      'Terjadi kesalahan saat memproses foto. Silakan coba kembali.'
    );


    /*
     * Jangan biarkan user
     * terjebak di Processing Screen.
     */

    showScreen(
      'preview'
    );


  } finally {

    /*
     * Aktifkan kembali Continue.
     */

    if (continueButton) {

      continueButton.disabled =
        false;

    }

  }

}


/* ============================================================
   RESULT
============================================================ */

function initResult() {

  /* ==========================================================
     DOWNLOAD PHOTO
  ========================================================== */

  const downloadButton =
    qs('#btn-download');


  if (downloadButton) {

    downloadButton.addEventListener(
      'click',
      () => {

        const state =
          getState();


        /*
         * Download tetap menggunakan
         * Blob lokal.
         *
         * Tidak tergantung internet.
         */

        if (
          !(state.resultBlob instanceof Blob)
        ) {

          console.error(
            '[HIMSI] Result Blob tidak tersedia.'
          );


          alert(
            'Foto belum tersedia untuk diunduh.'
          );


          return;

        }


        downloadResult(
          state.resultBlob
        );

      }
    );

  }


  /* ==========================================================
     TAKE ANOTHER PHOTO
  ========================================================== */

  const takeAnotherButton =
    qs('#btn-take-another');


  if (takeAnotherButton) {

    takeAnotherButton.addEventListener(
      'click',
      () => {

        /*
         * Reset cloud result.
         */

        resetResult();


        /*
         * Reset photobooth session.
         */

        resetSession();


        /*
         * Bersihkan selected frame UI.
         */

        highlightSelectedFrame(
          null
        );


        /*
         * Kembali memilih frame.
         */

        showScreen(
          'frames'
        );

      }
    );

  }


  /* ==========================================================
     BACK TO HOME
  ========================================================== */

  const backHomeButton =
    qs('#btn-back-home');


  if (backHomeButton) {

    backHomeButton.addEventListener(
      'click',
      () => {

        /*
         * Reset result.
         */

        resetResult();


        /*
         * Reset session.
         */

        resetSession();


        /*
         * Reset visual frame selection.
         */

        highlightSelectedFrame(
          null
        );


        /*
         * Kembali ke landing paling awal.
         */

        showScreen(
          'landing'
        );

      }
    );

  }

}


/* ============================================================
   GLOBAL DEBUG API
============================================================ */

/*
 * API ini berguna saat development.
 *
 * Bisa dites dari Browser Console.
 */

window.HimsiPhotobooth = {

  /* ==========================================================
     GET APPLICATION STATE
  ========================================================== */

  getState() {

    return getState();

  },


  /* ==========================================================
     CHANGE SCREEN
  ========================================================== */

  showScreen(
    screenName
  ) {

    showScreen(
      screenName
    );

  },


  /* ==========================================================
     GET LAST UPLOADED PHOTO
  ========================================================== */

  getLastUploadedPhoto() {

    return (
      getUploadedPhoto() ||
      window.HimsiLastUploadedPhoto ||
      null
    );

  },


  /* ==========================================================
     GET PUBLIC PHOTO URL
  ========================================================== */

  getPublicPhotoUrl() {

    return (
      getPublicUrl() ||
      null
    );

  },


  /* ==========================================================
     GET RESULT SYSTEM
  ========================================================== */

  getResultSystem() {

    return (
      window.HimsiResult ||
      null
    );

  },


  /* ==========================================================
     GET UPLOAD SYSTEM
  ========================================================== */

  getUploadSystem() {

    return (
      window.HimsiPhotoUpload ||
      null
    );

  }

};


/* ============================================================
   APPLICATION DEPENDENCY CHECK
============================================================ */

function checkDependencies() {

  let ready =
    true;


  /* ==========================================================
     UPLOAD SYSTEM
  ========================================================== */

  if (
    !window.HimsiPhotoUpload
  ) {

    console.warn(
      '[HIMSI] HimsiPhotoUpload belum tersedia.'
    );


    console.warn(
      '[HIMSI] Pastikan upload.js dimuat sebelum app.js.'
    );


    ready =
      false;

  } else {

    console.log(
      '[HIMSI] Upload system ready.'
    );

  }


  /* ==========================================================
     RESULT SYSTEM
  ========================================================== */

  if (
    !window.HimsiResult
  ) {

    /*
     * Tidak fatal karena result.js
     * juga di-import sebagai module.
     */

    console.warn(
      '[HIMSI] Global HimsiResult tidak ditemukan.'
    );

  } else {

    console.log(
      '[HIMSI] Result system ready.'
    );

  }


  return ready;

}


/* ============================================================
   APPLICATION INITIALIZATION
============================================================ */

async function init() {

  try {

    console.log(
      '[HIMSI] ================================='
    );


    console.log(
      '[HIMSI] HIMSI META PHOTOBOOTH'
    );


    console.log(
      '[HIMSI] Initializing...'
    );


    console.log(
      '[HIMSI] ================================='
    );


    /* ========================================================
       RESET RESULT
    ======================================================== */

    resetResult();


    /* ========================================================
       DEPENDENCY CHECK
    ======================================================== */

    checkDependencies();


    /* ========================================================
       INITIALIZE UI
    ======================================================== */

    initLanding();


    initFrames();


    initCamera();


    initPreview();


    initResult();


    /* ========================================================
       BOOT ANIMATION
    ======================================================== */

    await runBoot();


    /* ========================================================
       SHOW LANDING
    ======================================================== */

    showScreen(
      'landing'
    );


    /* ========================================================
       READY
    ======================================================== */

    console.log(
      '[HIMSI] ================================='
    );


    console.log(
      '[HIMSI] Photobooth ready.'
    );


    console.log(
      '[HIMSI] ================================='
    );


  } catch (
    error
  ) {

    console.error(
      '[HIMSI] Initialization error:',
      error
    );


    /*
     * Jangan diam kalau startup gagal.
     */

    alert(
      'Photobooth gagal dimuat. Silakan refresh halaman.'
    );

  }

}


/* ============================================================
   START APPLICATION
============================================================ */

init();