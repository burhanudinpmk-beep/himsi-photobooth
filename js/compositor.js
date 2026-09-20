/**
 * compositor.js
 * Menggabungkan foto-foto yang sudah diambil ke dalam slot frame yang
 * dipilih, lalu menimpa dengan PNG frame (transparan di area foto),
 * dan mengekspor hasil akhir sebagai PNG.
 *
 * Resolusi canvas mengikuti resolusi asli frame (bukan ukuran CSS),
 * sesuai DESIGN section 20.
 */

import { drawImageCover, loadImage, canvasToBlob } from './utils.js';

/**
 * @param {object} frame - entry dari frames.js (width, height, overlay, slots)
 * @param {{ blob: Blob, url: string }[]} photos - urutan sesuai slot
 * @param {(progress: number, label: string) => void} [onProgress]
 * @returns {Promise<Blob>} PNG final
 */
export async function composeFinalImage(frame, photos, onProgress = () => {}) {
  onProgress(20, 'Prepare Canvas');
  const canvas = document.createElement('canvas');
  canvas.width = frame.width;
  canvas.height = frame.height;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  onProgress(40, 'Load Photos');
  const photoImages = await Promise.all(photos.map((p) => loadImage(p.url)));

  onProgress(60, 'Draw Photos');
  frame.slots.forEach((slot, i) => {
    const img = photoImages[i];
    if (!img) return;
    drawImageCover(ctx, img, slot.x, slot.y, slot.width, slot.height, { x: 0.5, y: 0.5 });
  });

  onProgress(80, 'Draw Frame');
  const overlayImg = await loadImage(frame.overlay);
  ctx.drawImage(overlayImg, 0, 0, canvas.width, canvas.height);

  onProgress(100, 'Export');
  const blob = await canvasToBlob(canvas);
  return blob;
}
