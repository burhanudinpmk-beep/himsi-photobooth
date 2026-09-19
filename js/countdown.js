/**
 * countdown.js
 * Menjalankan urutan "GET READY! -> 3 -> 2 -> 1 -> FLASH" sebelum foto
 * benar-benar diambil. Timing mengikuti DESIGN section 14.
 */

import { wait } from './utils.js';

const STEP_MS = 900;
const FLASH_MS = 180;

/**
 * @param {object} els
 * @param {HTMLElement} els.overlay - kontainer overlay countdown
 * @param {HTMLElement} els.label - elemen teks ("GET READY!", angka, dst)
 * @param {HTMLElement} els.flash - elemen flash putih full-screen
 * @param {() => void} [onEachStep] - dipanggil tiap step, berguna untuk disable tombol capture
 */
export async function runCountdown({ overlay, label, flash }, onEachStep) {
  overlay.classList.add('is-active');
  flash.classList.remove('is-flashing');

  const steps = ['GET READY!', '3', '2', '1'];

  for (const step of steps) {
    label.textContent = step;
    label.classList.remove('countdown-pulse');
    // force reflow supaya animasi pulse restart tiap step
    void label.offsetWidth;
    label.classList.add('countdown-pulse');
    if (onEachStep) onEachStep(step);
    await wait(STEP_MS);
  }

  // FLASH
  flash.classList.add('is-flashing');
  await wait(FLASH_MS);
  flash.classList.remove('is-flashing');
  overlay.classList.remove('is-active');
}