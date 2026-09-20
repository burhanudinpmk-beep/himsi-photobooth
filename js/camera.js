/**
 * camera.js
 * Mengelola akses MediaDevices (getUserMedia), live preview, dan capture
 * frame video ke Canvas untuk dijadikan foto.
 */

import { getCameraErrorMessage } from './utils.js';
import { setMediaStream, stopMediaStream } from './state.js';

const CAMERA_CONSTRAINTS = {
  video: {
    facingMode: 'user',
    width: { ideal: 1920 },
    height: { ideal: 1080 },
  },
  audio: false,
};

/**
 * Minta akses kamera dan pasang stream ke elemen <video>.
 * @param {HTMLVideoElement} videoEl
 * @returns {Promise<MediaStream>}
 */
export async function startCamera(videoEl) {
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia(CAMERA_CONSTRAINTS);
  } catch (err) {
    // Fallback: coba tanpa constraint resolusi ideal kalau device tidak mendukung
    if (err.name === 'OverconstrainedError') {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    } else {
      throw err;
    }
  }

  videoEl.srcObject = stream;
  await videoEl.play();
  setMediaStream(stream);
  return stream;
}

export function stopCamera(videoEl) {
  stopMediaStream();
  if (videoEl) videoEl.srcObject = null;
}

/**
 * Ambil frame saat ini dari elemen video ke dalam sebuah Canvas offscreen,
 * lalu kembalikan sebagai Blob (PNG). Tidak melakukan crop ke slot frame —
 * itu tugas compositor.js saat proses akhir.
 *
 * Mirror Output dikontrol lewat parameter `mirrorOutput` (lihat state.js /
 * MIRROR SETTINGS di Camera.exe) — bukan konstanta tetap, karena pengguna
 * dapat mengubahnya sendiri. Mirror hanya diterapkan SEKALI di sini, saat
 * capture; compositor.js men-draw ulang blob ini apa adanya tanpa mirror
 * kedua kalinya.
 * @param {HTMLVideoElement} videoEl
 * @param {boolean} [mirrorOutput=false]
 * @returns {Promise<Blob>}
 */
export function captureFrameToBlob(videoEl, mirrorOutput = false) {
  const canvas = document.createElement('canvas');
  canvas.width = videoEl.videoWidth;
  canvas.height = videoEl.videoHeight;
  const ctx = canvas.getContext('2d');

  if (mirrorOutput) {
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
    ctx.restore();
  } else {
    ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png', 1.0);
  });
}

export { getCameraErrorMessage };
