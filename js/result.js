/**
 * result.js
 * Render MEMORY.EXE (layar hasil akhir) dan menangani proses download
 * via Blob, tanpa server/upload sama sekali (DESIGN section 22-23).
 */

import { downloadBlob, formatTimestamp } from './utils.js';

/**
 * @param {HTMLImageElement} imgEl - elemen <img> untuk preview hasil akhir
 * @param {string} resultUrl - object URL hasil compose
 */
export function renderResult(imgEl, resultUrl) {
  imgEl.src = resultUrl;
}

/**
 * @param {Blob} resultBlob
 */
export function downloadResult(resultBlob) {
  const filename = `HIMSI_PHOTOBOOTH_${formatTimestamp()}.png`;
  downloadBlob(resultBlob, filename);
}