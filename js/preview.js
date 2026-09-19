/**
 * preview.js
 * Render grid foto hasil capture di PREVIEW.EXE, dengan tombol RETAKE
 * per-foto (individual, bukan reset semua — lihat DESIGN section 17).
 */

/**
 * @param {HTMLElement} container - grid container
 * @param {Array<{url: string}>} photos
 * @param {(index: number) => void} onRetake
 */
export function renderPreviewGrid(container, photos, onRetake) {
  container.innerHTML = '';

  photos.forEach((photo, index) => {
    const card = document.createElement('div');
    card.className = 'preview-card';

    const img = document.createElement('img');
    img.src = photo.url;
    img.alt = `Foto ${index + 1}`;
    img.className = 'preview-card__img';

    const label = document.createElement('div');
    label.className = 'preview-card__label';
    label.textContent = `PHOTO ${String(index + 1).padStart(2, '0')}`;

    const retakeBtn = document.createElement('button');
    retakeBtn.type = 'button';
    retakeBtn.className = 'btn btn--retake';
    retakeBtn.textContent = 'RETAKE';
    retakeBtn.addEventListener('click', () => onRetake(index));

    card.appendChild(img);
    card.appendChild(label);
    card.appendChild(retakeBtn);
    container.appendChild(card);
  });
}