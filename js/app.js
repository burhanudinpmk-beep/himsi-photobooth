/**
 * ============================================================
 * HIMSI META PHOTOBOOTH
 * app.js
 * ============================================================
 *
 * Entry point & orchestrator HIMSI Photobooth (Photo.exe).
 *
 * Menghubungkan:
 * - state.js
 * - frames.js
 * - camera.js
 * - countdown.js
 * - compositor / processing
 * - preview.js
 * - result.js
 * - upload.js
 *
 * Alur:
 *
 * Landing
 *   ↓
 * Pilih Frame
 *   ↓
 * Camera
 *   ↓
 * Preview
 *   ↓
 * Processing
 *   ↓
 * Result
 *   ↓
 * Upload ke Cloud
 *   ↓
 * Public URL
 *   ↓
 * QR Code (tahap berikutnya)
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
  uploadResult
} from './result.js';


import {
  qs,
  qsa,
  wait,
  pulseElement
} from './utils.js';



/* ============================================================
   SCREEN SWITCHING
============================================================ */

const screenEls = qsa('.screen');


function showScreen(name) {

  setScreen(name);

}


onScreenChange((name) => {

  screenEls.forEach((el) => {

    el.classList.toggle(
      'is-active',
      el.dataset.screen === name
    );

  });

});



/* ============================================================
   BOOT SCREEN
============================================================ */

async function runBoot() {

  const bar =
    qs('#boot-progress-bar');

  const percentEl =
    qs('#boot-percent');


  const duration = 900;

  const start =
    performance.now();


  return new Promise((resolve) => {

    function tick(now) {

      const elapsed =
        now - start;


      const pct =
        Math.min(
          100,
          Math.round(
            (elapsed / duration) * 100
          )
        );


      bar.style.width =
        `${pct}%`;


      percentEl.textContent =
        `${pct}%`;


      if (pct < 100) {

        requestAnimationFrame(tick);

      } else {

        resolve();

      }

    }


    requestAnimationFrame(tick);

  });

}



/* ============================================================
   LANDING SCREEN
============================================================ */

function initLanding() {

  qs('#btn-yuk-foto')
    .addEventListener(
      'click',
      () => {

        showScreen('frames');

      }
    );

}



/* ============================================================
   FRAME SCREEN
============================================================ */

function renderFrameGrid() {

  const grid =
    qs('#frame-grid');


  grid.innerHTML = '';


  frameList.forEach((frame) => {

    const card =
      document.createElement('button');


    card.type =
      'button';


    card.className =
      'frame-card';


    card.dataset.frameId =
      frame.id;


    card.innerHTML = `

      <div class="frame-card__thumb-wrap">

        <img
          src="${frame.thumbnail}"
          alt="${frame.name}"
          class="frame-card__thumb"
        />

        <span class="frame-card__check">
          &#10003;
        </span>

      </div>

      <p class="frame-card__name">
        ${frame.photoCount} FOTO
      </p>

      <p class="frame-card__size">
        ${frame.width} × ${frame.height} px
      </p>

    `;


    card.addEventListener(
      'click',
      () => openFrameDialog(frame)
    );


    grid.appendChild(card);

  });

}



let dialogFrame = null;



function openFrameDialog(frame) {

  dialogFrame =
    frame;


  qs('#frame-dialog-img').src =
    frame.overlay;


  qs('#frame-dialog-meta').textContent =
    `${frame.id.toUpperCase()}.PNG — ${frame.photoCount} PHOTOS — ${frame.width} × ${frame.height}`;


  qs('#frame-dialog')
    .classList
    .add('is-active');

}



function closeFrameDialog() {

  qs('#frame-dialog')
    .classList
    .remove('is-active');


  dialogFrame = null;

}



function initFrames() {

  renderFrameGrid();


  qs('#btn-back-to-landing')
    .addEventListener(
      'click',
      () => {

        showScreen('landing');

      }
    );


  qs('#frame-dialog-close')
    .addEventListener(
      'click',
      closeFrameDialog
    );


  qs('#frame-dialog-back')
    .addEventListener(
      'click',
      closeFrameDialog
    );


  qs('#frame-dialog')
    .addEventListener(
      'click',
      (e) => {

        if (
          e.target.id ===
          'frame-dialog'
        ) {

          closeFrameDialog();

        }

      }
    );


  qs('#frame-dialog-use')
    .addEventListener(
      'click',
      () => {

        if (!dialogFrame) {
          return;
        }


        const chosenFrameId =
          dialogFrame.id;


        setSelectedFrame(
          chosenFrameId
        );


        closeFrameDialog();


        highlightSelectedFrame(
          chosenFrameId
        );


        enterCameraScreen({
          isRetake: false
        });

      }
    );

}



function highlightSelectedFrame(frameId) {

  qsa('.frame-card')
    .forEach((card) => {

      card.classList.toggle(
        'is-selected',
        card.dataset.frameId === frameId
      );

    });

}



/* ============================================================
   CAMERA
============================================================ */

const FLASH_MESSAGES = {

  start:
    'Cari pose terbaikmu!',

  nice:
    'Nice shot!',

  keepGoing:
    'Keep going!',

  oneMore:
    'One more!',

  done:
    'Memory captured!'

};



function nextFlashMessage(
  photosTaken,
  total
) {

  if (photosTaken >= total) {

    return FLASH_MESSAGES.done;

  }


  const remaining =
    total - photosTaken;


  if (remaining === 1) {

    return FLASH_MESSAGES.oneMore;

  }


  if (photosTaken === 1) {

    return FLASH_MESSAGES.nice;

  }


  return FLASH_MESSAGES.keepGoing;

}



/* ============================================================
   CAMERA THUMBNAILS
============================================================ */

function renderCameraThumbs(frame) {

  const wrap =
    qs('#camera-thumbs');


  wrap.innerHTML = '';


  const state =
    getState();


  for (
    let i = 0;
    i < frame.photoCount;
    i++
  ) {

    const thumb =
      document.createElement('div');


    const taken =
      i < state.photos.length;


    thumb.className =
      `camera-thumb ${taken ? 'is-taken' : ''}`;


    thumb.textContent =
      String(i + 1)
        .padStart(2, '0');


    wrap.appendChild(thumb);

  }

}



/* ============================================================
   CAMERA STATUS
============================================================ */

function setCameraStatus(status) {

  const indicator =
    qs('#live-indicator');


  const text =
    qs('#live-indicator-text');


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


  const fullBtn =
    qs('#btn-full-camera');


  if (
    fullBtn &&
    !fullBtn.classList.contains(
      'is-hidden'
    )
  ) {

    fullBtn.disabled =
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

  const currentStr =
    String(current)
      .padStart(2, '0');


  const totalStr =
    String(total)
      .padStart(2, '0');


  qs('#camera-photo-current')
    .textContent =
    currentStr;


  qs('#camera-photo-total')
    .textContent =
    totalStr;


  qs('#camera-photo-current-fs')
    .textContent =
    currentStr;


  qs('#camera-photo-total-fs')
    .textContent =
    totalStr;

}



/* ============================================================
   FULLSCREEN CAMERA
============================================================ */

function isFullscreenSupported() {

  return Boolean(
    document.fullscreenEnabled ||
    document.webkitFullscreenEnabled
  );

}



async function openCameraFullscreen() {

  const container =
    qs('#camera-live');


  try {

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

    }

  } catch (error) {

    console.error(
      '[camera] Fullscreen gagal:',
      error
    );

  }

}



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
   CAMERA SOURCE
============================================================ */

let unsubscribeDeviceList =
  null;


let unsubscribeStreamEnded =
  null;



async function populateCameraSourceSelect() {

  const wrap =
    qs('#camera-source-wrap');


  const select =
    qs('#camera-source-select');


  let devices = [];


  try {

    devices =
      await listVideoInputDevices();

  } catch (error) {

    console.error(
      '[camera] enumerateDevices:',
      error
    );

  }


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


  const stillExists =
    currentId &&
    devices.some(
      device =>
        device.deviceId ===
        currentId
    );


  const activeId =
    stillExists
      ? currentId
      : devices[0].deviceId;


  if (!stillExists) {

    setSelectedDeviceId(
      activeId
    );

  }


  select.innerHTML = '';


  devices.forEach(
    (device, index) => {

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


  select.disabled =
    devices.length <= 1;

}



/* ============================================================
   CAMERA LISTENER
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



function stopCameraAndListeners(
  video
) {

  teardownCameraListeners();

  stopCamera(video);

  exitCameraFullscreen();

}



function handleStreamDisconnected() {

  console.warn(
    '[camera] Webcam disconnected.'
  );


  setCaptureEnabled(false);

  setCameraStatus('off');


  qs('#camera-disconnected')
    .classList
    .remove('is-hidden');


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
  isRetake
}) {

  showScreen('camera');


  const frame =
    getFrame(
      getState().selectedFrameId
    );


  qs('#camera-frame-name')
    .textContent =
    `${frame.id.toUpperCase()}.PNG`;


  qs('#camera-photo-total')
    .textContent =
    String(frame.photoCount)
      .padStart(2, '0');


  qs('#camera-photo-total-fs')
    .textContent =
    String(frame.photoCount)
      .padStart(2, '0');


  const gate =
    qs('#camera-permission');


  const errorEl =
    qs('#camera-error');


  const liveEl =
    qs('#camera-live');


  errorEl.classList.add(
    'is-hidden'
  );


  qs('#camera-disconnected')
    .classList
    .add('is-hidden');


  setCameraStatus('off');


  if (isRetake) {

    gate.classList.add(
      'is-hidden'
    );


    await activateCamera(
      frame
    );

  } else {

    gate.classList.remove(
      'is-hidden'
    );


    liveEl.classList.add(
      'is-hidden'
    );

  }

}



/* ============================================================
   MIRROR
============================================================ */

function syncMirrorToggles() {

  const state =
    getState();


  qs('#toggle-mirror-preview')
    .checked =
    state.mirrorPreview;


  qs('#toggle-mirror-output')
    .checked =
    state.mirrorOutput;


  applyMirrorPreviewClass();

}



function applyMirrorPreviewClass() {

  const video =
    qs('#camera-video');


  video.classList.toggle(
    'is-mirrored',
    getState().mirrorPreview
  );

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


  teardownCameraListeners();


  qs('#camera-disconnected')
    .classList
    .add('is-hidden');


  setCameraStatus(
    'connecting'
  );


  try {

    await startCamera(
      video,
      getState().selectedDeviceId
    );


    gate.classList.add(
      'is-hidden'
    );


    errorEl.classList.add(
      'is-hidden'
    );


    liveEl.classList.remove(
      'is-hidden'
    );


    setCameraStatus('live');


    syncMirrorToggles();


    await populateCameraSourceSelect();


    unsubscribeStreamEnded =
      watchStreamDisconnect(
        getState().mediaStream,
        handleStreamDisconnected
      );


    if (
      !unsubscribeDeviceList
    ) {

      unsubscribeDeviceList =
        onDeviceListChange(
          () =>
            populateCameraSourceSelect()
        );

    }


    const state =
      getState();


    updatePhotoCounter(
      Math.min(
        state.photos.length + 1,
        frame.photoCount
      ),
      frame.photoCount
    );


    qs('#camera-flash-message')
      .textContent =
      state.photos.length === 0
        ? FLASH_MESSAGES.start
        : nextFlashMessage(
            state.photos.length,
            frame.photoCount
          );


    renderCameraThumbs(
      frame
    );


    setCaptureEnabled(true);

  } catch (error) {

    console.error(
      '[camera] getUserMedia:',
      error
    );


    const {
      title,
      message
    } =
      getCameraErrorMessage(
        error
      );


    gate.classList.add(
      'is-hidden'
    );


    liveEl.classList.add(
      'is-hidden'
    );


    setCameraStatus(
      'error'
    );


    qs('#camera-error-title')
      .textContent =
      title;


    qs('#camera-error-message')
      .textContent =
      message;


    errorEl.classList.remove(
      'is-hidden'
    );

  }

}



/* ============================================================
   SWITCH CAMERA
============================================================ */

async function handleCameraSourceChange(
  event
) {

  const newDeviceId =
    event.target.value;


  const video =
    qs('#camera-video');


  setSelectedDeviceId(
    newDeviceId
  );


  setCameraStatus(
    'connecting'
  );


  if (
    unsubscribeStreamEnded
  ) {

    unsubscribeStreamEnded();

    unsubscribeStreamEnded =
      null;

  }


  try {

    await switchCamera(
      video,
      newDeviceId
    );


    setCameraStatus(
      'live'
    );


    applyMirrorPreviewClass();


    unsubscribeStreamEnded =
      watchStreamDisconnect(
        getState().mediaStream,
        handleStreamDisconnected
      );

  } catch (error) {

    console.error(
      '[camera] switchCamera:',
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


    qs('#camera-live')
      .classList
      .add('is-hidden');


    qs('#camera-error-title')
      .textContent =
      title;


    qs('#camera-error-message')
      .textContent =
      message;


    qs('#camera-error')
      .classList
      .remove('is-hidden');

  }

}



/* ============================================================
   REFRESH CAMERA
============================================================ */

function handleRefreshCamera() {

  qs('#camera-disconnected')
    .classList
    .add('is-hidden');


  const frame =
    getFrame(
      getState().selectedFrameId
    );


  activateCamera(
    frame
  );

}



/* ============================================================
   CAPTURE
============================================================ */

function setCaptureEnabled(
  enabled
) {

  qs('#btn-capture')
    .disabled =
    !enabled;

}



async function handleCapture() {

  const frame =
    getFrame(
      getState().selectedFrameId
    );


  const video =
    qs('#camera-video');


  setCaptureEnabled(false);


  try {

    await runCountdown({

      overlay:
        qs('#countdown-overlay'),

      label:
        qs('#countdown-label'),

      flash:
        qs('#countdown-flash')

    });


    /*
     * mirrorOutput menentukan
     * apakah FILE HASIL ikut mirror.
     *
     * mirrorPreview hanya mengubah
     * tampilan video.
     */

    const blob =
      await captureFrameToBlob(
        video,
        getState().mirrorOutput
      );


    const state =
      getState();


    /*
     * RETAKE
     */

    if (
      state.retakeIndex !== null
    ) {

      replacePhotoAt(
        state.retakeIndex,
        blob
      );


      clearRetakeIndex();


      stopCameraAndListeners(
        video
      );


      goToPreview();

      return;

    }


    /*
     * NORMAL CAPTURE
     */

    addPhoto(blob);


    const updated =
      getState();


    renderCameraThumbs(
      frame
    );


    if (
      updated.photos.length >=
      frame.photoCount
    ) {

      qs('#camera-flash-message')
        .textContent =
        FLASH_MESSAGES.done;


      pulseElement(
        qs(
          '#camera-flash-message'
        )
      );


      await wait(500);


      stopCameraAndListeners(
        video
      );


      goToPreview();

    } else {

      updatePhotoCounter(
        updated.photos.length + 1,
        frame.photoCount
      );


      qs('#camera-flash-message')
        .textContent =
        nextFlashMessage(
          updated.photos.length,
          frame.photoCount
        );


      pulseElement(
        qs(
          '#camera-flash-message'
        )
      );


      setCaptureEnabled(true);

    }

  } catch (error) {

    console.error(
      '[camera] Capture gagal:',
      error
    );


    setCaptureEnabled(true);

  }

}



/* ============================================================
   INIT CAMERA
============================================================ */

function initCamera() {

  if (
    isFullscreenSupported()
  ) {

    qs('#btn-full-camera')
      .classList
      .remove('is-hidden');

  }


  qs('#btn-full-camera')
    .addEventListener(
      'click',
      openCameraFullscreen
    );


  qs('#btn-exit-fullscreen')
    .addEventListener(
      'click',
      exitCameraFullscreen
    );


  qs('#btn-back-to-frames')
    .addEventListener(
      'click',
      () => {

        teardownCameraListeners();

        clearCapturedPhotos();

        exitCameraFullscreen();

        showScreen('frames');

      }
    );


  qs('#toggle-mirror-preview')
    .addEventListener(
      'change',
      (event) => {

        setMirrorPreview(
          event.target.checked
        );


        applyMirrorPreviewClass();

      }
    );


  qs('#toggle-mirror-output')
    .addEventListener(
      'change',
      (event) => {

        setMirrorOutput(
          event.target.checked
        );

      }
    );


  qs('#camera-source-select')
    .addEventListener(
      'change',
      handleCameraSourceChange
    );


  qs('#btn-refresh-camera')
    .addEventListener(
      'click',
      handleRefreshCamera
    );


  qs('#btn-enable-camera')
    .addEventListener(
      'click',
      () => {

        const frame =
          getFrame(
            getState()
              .selectedFrameId
          );


        activateCamera(
          frame
        );

      }
    );


  qs('#btn-retry-camera')
    .addEventListener(
      'click',
      () => {

        const frame =
          getFrame(
            getState()
              .selectedFrameId
          );


        activateCamera(
          frame
        );

      }
    );


  qs('#btn-capture')
    .addEventListener(
      'click',
      handleCapture
    );

}



/* ============================================================
   PREVIEW
============================================================ */

function goToPreview() {

  showScreen('preview');


  const state =
    getState();


  renderPreviewGrid(
    qs('#preview-grid'),
    state.photos,
    handleRetakeRequest
  );

}



function handleRetakeRequest(
  index
) {

  setRetakeIndex(
    index
  );


  enterCameraScreen({
    isRetake: true
  });

}



/* ============================================================
   PREVIEW INITIALIZATION
============================================================ */

function initPreview() {

  qs('#btn-back-to-camera')
    .addEventListener(
      'click',
      () => {

        clearCapturedPhotos();


        enterCameraScreen({
          isRetake: true
        });

      }
    );


  qs('#btn-continue')
    .addEventListener(
      'click',
      async () => {

        try {

          /* ==============================
             PROCESSING SCREEN
          ============================== */

          showScreen(
            'processing'
          );


          const frame =
            getFrame(
              getState()
                .selectedFrameId
            );


          const state =
            getState();


          /* ==============================
             GENERATE FINAL PHOTO
          ============================== */

          const blob =
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


          /* ==============================
             SAVE RESULT
          ============================== */

          setResult(
            blob
          );


          const finalState =
            getState();


          /* ==============================
             SHOW RESULT
          ============================== */

          showScreen(
            'result'
          );


          renderResult(
            qs('#result-image'),
            finalState.resultUrl
          );


          pulseElement(
            qs('#btn-download'),
            'btn-pulse-once'
          );


          /* ==============================
             RESET PREVIOUS CLOUD RESULT
          ============================== */

          window.HimsiLastUploadedPhoto =
            null;


          /* ==============================
             UPLOAD TO CLOUD
          ============================== */

          try {

            console.log(
              '[HIMSI] Uploading final photo...'
            );


            const uploadedPhoto =
              await uploadResult(
                finalState.resultBlob
              );


            /*
             * Simpan hasil upload global.
             *
             * QR system nanti membaca:
             *
             * window.HimsiLastUploadedPhoto.url
             */

            window.HimsiLastUploadedPhoto =
              uploadedPhoto;


            console.log(
              '[HIMSI] Upload berhasil:',
              uploadedPhoto
            );


            console.log(
              '[HIMSI] Public photo URL:',
              uploadedPhoto.url
            );


            /*
             * Custom Event.
             *
             * qr.js nantinya dapat mendengarkan:
             *
             * window.addEventListener(
             *   'himsi-photo-uploaded',
             *   ...
             * )
             */

            window.dispatchEvent(
              new CustomEvent(
                'himsi-photo-uploaded',
                {
                  detail:
                    uploadedPhoto
                }
              )
            );


          } catch (
            uploadError
          ) {

            /*
             * Upload gagal TIDAK BOLEH
             * menghancurkan Result Screen.
             *
             * User masih dapat download
             * file secara lokal.
             */

            console.error(
              '[HIMSI] Upload cloud gagal:',
              uploadError
            );


            window.dispatchEvent(
              new CustomEvent(
                'himsi-photo-upload-error',
                {
                  detail:
                    uploadError
                }
              )
            );

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
           * terjebak di processing screen.
           */

          showScreen(
            'preview'
          );

        }

      }
    );

}



/* ============================================================
   RESULT
============================================================ */

function initResult() {

  /*
   * DOWNLOAD LOCAL
   */

  qs('#btn-download')
    .addEventListener(
      'click',
      () => {

        const state =
          getState();


        if (
          state.resultBlob
        ) {

          downloadResult(
            state.resultBlob
          );

        }

      }
    );


  /*
   * TAKE ANOTHER
   */

  qs('#btn-take-another')
    .addEventListener(
      'click',
      () => {

        resetSession();


        window.HimsiLastUploadedPhoto =
          null;


        highlightSelectedFrame(
          null
        );


        showScreen(
          'frames'
        );

      }
    );


  /*
   * BACK HOME
   */

  qs('#btn-back-home')
    .addEventListener(
      'click',
      () => {

        resetSession();


        window.HimsiLastUploadedPhoto =
          null;


        highlightSelectedFrame(
          null
        );


        showScreen(
          'landing'
        );

      }
    );

}



/* ============================================================
   GLOBAL DEBUG
============================================================ */

/*
 * Berguna selama development.
 *
 * Console:
 *
 * window.HimsiPhotobooth.getState()
 *
 * window.HimsiLastUploadedPhoto
 */

window.HimsiPhotobooth = {

  getState,

  showScreen,

  getLastUploadedPhoto() {

    return (
      window.HimsiLastUploadedPhoto ||
      null
    );

  }

};



/* ============================================================
   INIT
============================================================ */

async function init() {

  try {

    console.log(
      '[HIMSI] Initializing Photobooth...'
    );


    /*
     * Reset cloud result
     */

    window.HimsiLastUploadedPhoto =
      null;


    /*
     * Initialize UI
     */

    initLanding();

    initFrames();

    initCamera();

    initPreview();

    initResult();


    /*
     * Boot animation
     */

    await runBoot();


    /*
     * Landing
     */

    showScreen(
      'landing'
    );


    console.log(
      '[HIMSI] Photobooth ready.'
    );


  } catch (error) {

    console.error(
      '[HIMSI] Initialization error:',
      error
    );

  }

}



/* ============================================================
   START APPLICATION
============================================================ */

init();