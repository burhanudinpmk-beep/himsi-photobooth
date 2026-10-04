/**
 * ============================================
 * HIMSI META PHOTOBOOTH
 * Result System
 * ============================================
 *
 * File:
 * js/result.js
 *
 * Fungsi:
 * - Menampilkan hasil foto
 * - Download foto
 * - Upload foto ke server
 * - Menyimpan URL hasil upload
 */


/**
 * ============================================
 * Helper Timestamp
 * ============================================
 */

function formatTimestamp() {
  const now = new Date();

  const year = now.getFullYear();

  const month = String(
    now.getMonth() + 1
  ).padStart(2, '0');

  const day = String(
    now.getDate()
  ).padStart(2, '0');

  const hours = String(
    now.getHours()
  ).padStart(2, '0');

  const minutes = String(
    now.getMinutes()
  ).padStart(2, '0');

  const seconds = String(
    now.getSeconds()
  ).padStart(2, '0');

  return `${year}${month}${day}_${hours}${minutes}${seconds}`;
}


/**
 * ============================================
 * Render Result
 * ============================================
 */

export function renderResult(imgEl, resultUrl) {

  if (!imgEl) {
    console.error(
      '[result] Element gambar tidak ditemukan.'
    );

    return;
  }

  if (!resultUrl) {
    console.error(
      '[result] URL hasil foto tidak tersedia.'
    );

    return;
  }

  imgEl.src = resultUrl;
}


/**
 * ============================================
 * Download Result
 * ============================================
 */

export function downloadResult(resultBlob) {

  if (!(resultBlob instanceof Blob)) {

    console.error(
      '[result] Blob hasil foto tidak valid.'
    );

    return;
  }


  const url =
    URL.createObjectURL(resultBlob);


  const anchor =
    document.createElement('a');


  anchor.href = url;

  anchor.download =
    `HIMSI_PHOTOBOOTH_${formatTimestamp()}.png`;


  document.body.appendChild(anchor);

  anchor.click();

  anchor.remove();


  setTimeout(() => {

    URL.revokeObjectURL(url);

  }, 1000);
}


/**
 * ============================================
 * Upload Result
 * ============================================
 */

export async function uploadResult(resultBlob) {

  if (!(resultBlob instanceof Blob)) {

    throw new Error(
      'Blob hasil foto tidak valid.'
    );
  }


  if (
    !window.HimsiPhotoUpload ||
    typeof window.HimsiPhotoUpload.upload !== 'function'
  ) {

    throw new Error(
      'HimsiPhotoUpload belum tersedia.'
    );
  }


  console.log(
    '[result] Uploading final photo...'
  );


  try {

    const photo =
      await window.HimsiPhotoUpload.upload(
        resultBlob
      );


    console.log(
      '[result] Upload berhasil:',
      photo
    );


    return photo;

  } catch (error) {

    console.error(
      '[result] Upload gagal:',
      error
    );


    throw error;
  }
}


/**
 * ============================================
 * Process Result
 * ============================================
 *
 * Bisa digunakan untuk:
 *
 * processing
 * ↓
 * result
 * ↓
 * upload
 * ↓
 * QR
 */

export async function processResult(
  imgEl,
  resultUrl,
  resultBlob
) {

  renderResult(
    imgEl,
    resultUrl
  );


  if (!(resultBlob instanceof Blob)) {

    throw new Error(
      'Result Blob tidak tersedia.'
    );
  }


  const uploadedPhoto =
    await uploadResult(
      resultBlob
    );


  return uploadedPhoto;
}


/**
 * ============================================
 * Global Compatibility
 * ============================================
 *
 * Tetap menyediakan window.HimsiResult
 * supaya bisa dites lewat Console.
 */

window.HimsiResult = {

  render:
    renderResult,

  download:
    downloadResult,

  upload:
    uploadResult,

  process:
    processResult

};


console.log(
  'HIMSI Result system loaded.'
);