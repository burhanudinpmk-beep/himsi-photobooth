/**
 * state.js
 * Single source of truth untuk state aplikasi HIMSI Photobooth.
 * Modul lain membaca/mengubah state lewat fungsi di sini, bukan
 * lewat variabel global tersebar.
 */

import { urlManager } from './utils.js';

const SCREENS = [
  'boot',
  'landing',
  'frames',
  'camera',
  'preview',
  'processing',
  'result',
];

function createInitialState() {
  return {
    currentScreen: 'boot',
    selectedFrameId: null,
    /** @type {{ blob: Blob, url: string }[]} */
    photos: [],
    retakeIndex: null, // null = capture normal, angka = sedang retake foto ke-N
    mediaStream: null,
    resultBlob: null,
    resultUrl: null,
    // Mirror Preview = tampilan live camera terasa seperti kaca (natural saat berpose).
    // Mirror Output = foto/hasil akhir ikut dibalik atau tidak. Default: preview ON, output OFF.
    mirrorPreview: true,
    mirrorOutput: false,
  };
}

let state = createInitialState();

/** Subscriber sederhana kalau ada modul yang ingin bereaksi pada perubahan screen. */
const listeners = new Set();

export function onScreenChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getState() {
  return state;
}

export function setScreen(screenName) {
  if (!SCREENS.includes(screenName)) {
    console.error(`[state] Screen tidak dikenal: ${screenName}`);
    return;
  }
  state.currentScreen = screenName;
  for (const fn of listeners) fn(screenName);
}

export function setSelectedFrame(frameId) {
  state.selectedFrameId = frameId;
}

export function setMediaStream(stream) {
  state.mediaStream = stream;
}

export function stopMediaStream() {
  if (state.mediaStream) {
    state.mediaStream.getTracks().forEach((track) => track.stop());
    state.mediaStream = null;
  }
}

export function addPhoto(blob) {
  const url = urlManager.create(blob);
  state.photos.push({ blob, url });
}

export function replacePhotoAt(index, blob) {
  const old = state.photos[index];
  if (old) urlManager.revoke(old.url);
  const url = urlManager.create(blob);
  state.photos[index] = { blob, url };
}

export function setRetakeIndex(index) {
  state.retakeIndex = index;
}

export function clearRetakeIndex() {
  state.retakeIndex = null;
}

export function setMirrorPreview(value) {
  state.mirrorPreview = Boolean(value);
}

export function setMirrorOutput(value) {
  state.mirrorOutput = Boolean(value);
}

/**
 * Hapus semua foto yang sudah diambil untuk frame saat ini (dipakai oleh
 * navigasi "back" dari Camera/Preview) tanpa mereset seluruh sesi —
 * selectedFrameId dan pengaturan mirror TETAP dipertahankan.
 */
export function clearCapturedPhotos() {
  stopMediaStream();
  for (const p of state.photos) urlManager.revoke(p.url);
  state.photos = [];
  state.retakeIndex = null;
}

export function setResult(blob) {
  if (state.resultUrl) urlManager.revoke(state.resultUrl);
  state.resultBlob = blob;
  state.resultUrl = urlManager.create(blob);
}

/**
 * Reset penuh session: revoke semua object URL foto & hasil, kembali ke
 * state awal (tapi TIDAK menyentuh screen — pemanggil yang menentukan
 * screen tujuan setelah reset, sesuai section 25 master prompt).
 */
export function resetSession() {
  stopMediaStream();
  for (const p of state.photos) urlManager.revoke(p.url);
  if (state.resultUrl) urlManager.revoke(state.resultUrl);

  const preservedScreen = state.currentScreen;
  state = createInitialState();
  state.currentScreen = preservedScreen;
}