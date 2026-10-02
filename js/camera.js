/**
 * camera.js
 * Mengelola akses MediaDevices (getUserMedia), live preview, dan capture
 * frame video ke Canvas untuk dijadikan foto.
 */

import { getCameraErrorMessage } from './utils.js';
import { setMediaStream, stopMediaStream } from './state.js';

/**
 * Bangun constraints video. Jika deviceId diberikan (user memilih webcam
 * tertentu, mis. USB eksternal lewat CAMERA SOURCE), pakai `deviceId: exact`
 * TANPA facingMode (keduanya tidak boleh dicampur — beberapa browser akan
 * melempar OverconstrainedError). Tanpa deviceId (kondisi awal / belum
 * memilih), pakai facingMode:'user' sebagai default yang wajar.
 */
function buildConstraints(deviceId) {
  const video = {
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    frameRate: { ideal: 30 },
  };
  if (deviceId) {
    video.deviceId = { exact: deviceId };
  } else {
    video.facingMode = 'user';
  }
  return { video, audio: false };
}

/**
 * Minta akses kamera dan pasang stream ke elemen <video>.
 * @param {HTMLVideoElement} videoEl
 * @param {string|null} [deviceId] - deviceId videoinput tertentu (CAMERA SOURCE).
 *   Dibiarkan kosong/null supaya browser memilih default (mis. saat pertama
 *   kali meminta izin, sebelum device di-enumerate).
 * @returns {Promise<MediaStream>}
 */
export async function startCamera(videoEl, deviceId = null) {
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia(buildConstraints(deviceId));
  } catch (err) {
    // Fallback: coba tanpa constraint resolusi/deviceId kalau device tidak mendukung
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
 * Ganti kamera aktif ke device lain TANPA reload halaman dan TANPA
 * menyentuh foto yang sudah diambil / frame terpilih / mirror setting.
 * Menghentikan seluruh track stream lama dulu, baru minta stream baru.
 * @param {HTMLVideoElement} videoEl
 * @param {string} deviceId
 * @returns {Promise<MediaStream>}
 */
export async function switchCamera(videoEl, deviceId) {
  stopCamera(videoEl);
  return startCamera(videoEl, deviceId);
}

/**
 * Ambil daftar kamera (videoinput) yang tersedia. Label device hanya terisi
 * SETELAH permission diberikan — kalau dipanggil sebelum izin, label bisa
 * kosong untuk sebagian browser (itu wajar, bukan bug).
 * @returns {Promise<MediaDeviceInfo[]>}
 */
export async function listVideoInputDevices() {
  if (!navigator.mediaDevices?.enumerateDevices) return [];
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter((d) => d.kind === 'videoinput');
}

/**
 * Daftarkan listener untuk event `devicechange` (webcam dicolok/dicabut).
 * Mengembalikan fungsi untuk melepas listener tsb (dipanggil saat
 * meninggalkan Camera.exe supaya tidak menumpuk listener tiap kali masuk
 * screen kamera berulang kali).
 * @param {() => void} handler
 * @returns {() => void} unsubscribe
 */
export function onDeviceListChange(handler) {
  if (!navigator.mediaDevices?.addEventListener) return () => {};
  navigator.mediaDevices.addEventListener('devicechange', handler);
  return () => navigator.mediaDevices.removeEventListener('devicechange', handler);
}

/**
 * Pasang listener agar tahu kalau track video AKTIF berhenti sendiri
 * (mis. webcam USB dicabut fisik) — ini cara paling andal mendeteksi
 * disconnect pada stream yang sedang dipakai, berbeda dari `devicechange`
 * yang hanya memberi tahu daftar device berubah secara umum.
 * @param {MediaStream} stream
 * @param {() => void} onEnded
 * @returns {() => void} unsubscribe
 */
export function watchStreamDisconnect(stream, onEnded) {
  const tracks = stream.getVideoTracks();
  tracks.forEach((track) => track.addEventListener('ended', onEnded));
  return () => tracks.forEach((track) => track.removeEventListener('ended', onEnded));
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
