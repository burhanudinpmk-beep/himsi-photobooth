/**
 * processing.js
 * Menjalankan layar PROCESSING.EXE: memanggil compositor dan mengikat
 * progress NYATA (bukan random) ke progress bar & checklist UI.
 * Lihat DESIGN section 19.
 */

import { composeFinalImage } from './compositor.js';
import { wait } from './utils.js';

const STEP_LABELS = [
  { threshold: 20, text: 'Preparing photos' },
  { threshold: 40, text: 'Cropping images' },
  { threshold: 60, text: 'Applying frame' },
  { threshold: 80, text: 'Creating result' },
  { threshold: 100, text: 'Ready' },
];

/**
 * @param {object} frame
 * @param {Array} photos
 * @param {object} els
 * @param {HTMLElement} els.progressBar
 * @param {HTMLElement} els.progressPercent
 * @param {HTMLElement} els.checklist - kontainer <li> checklist
 * @returns {Promise<Blob>}
 */
export async function runProcessing(frame, photos, els) {
  const items = Array.from(els.checklist.querySelectorAll('[data-step]'));

  function updateUI(progress, label) {
    els.progressBar.style.width = `${progress}%`;
    els.progressPercent.textContent = `${progress}%`;

    items.forEach((item) => {
      const stepThreshold = Number(item.dataset.step);
      item.classList.remove('is-done', 'is-active');
      if (progress >= stepThreshold) {
        item.classList.add('is-done');
      } else if (progress >= stepThreshold - 20) {
        item.classList.add('is-active');
      }
    });
  }

  updateUI(0, '');

  const blob = await composeFinalImage(frame, photos, async (progress, label) => {
    updateUI(progress, label);
    // Beri jeda kecil supaya progress terlihat oleh mata (bukan fake progress,
    // hanya pacing dari proses nyata agar tidak "berkedip" sekilas).
    await wait(220);
  });

  updateUI(100, 'Ready');
  await wait(300);
  return blob;
}