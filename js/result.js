/**
 * ============================================================
 * HIMSI META PHOTOBOOTH
 * result.js
 * ============================================================
 *
 * Fungsi:
 * - Menampilkan hasil foto
 * - Download hasil foto
 * - Upload hasil foto ke cloud
 * - Menyimpan data upload terakhir
 * - Menyediakan Public URL untuk QR Code
 */


/* ============================================================
   STATE INTERNAL
============================================================ */

let currentResult = {
  blob: null,
  objectUrl: null,
  uploadedPhoto: null,
};


/* ============================================================
   TIMESTAMP
============================================================ */

function formatTimestamp() {
  const now = new Date();

  const year = now.getFullYear();

  const month =
    String(now.getMonth() + 1)
      .padStart(2, '0');

  const day =
    String(now.getDate())
      .padStart(2, '0');

  const hours =
    String(now.getHours())
      .padStart(2, '0');

  const minutes =
    String(now.getMinutes())
      .padStart(2, '0');

  const seconds =
    String(now.getSeconds())
      .padStart(2, '0');

  return (
    `${year}${month}${day}_` +
    `${hours}${minutes}${seconds}`
  );
}


/* ============================================================
   RENDER RESULT
============================================================ */

export function renderResult(
  imgEl,
  resultUrl
) {
  if (!(imgEl instanceof HTMLImageElement)) {
    console.error(
      '[result] Element preview hasil tidak valid.'
    );

    return;
  }

  if (
    !resultUrl ||
    typeof resultUrl !== 'string'
  ) {
    console.error(
      '[result] Result URL tidak tersedia.'
    );

    return;
  }

  imgEl.src = resultUrl;

  currentResult.objectUrl =
    resultUrl;

  console.log(
    '[result] Preview hasil ditampilkan.'
  );
}


/* ============================================================
   DOWNLOAD RESULT
============================================================ */

export function downloadResult(
  resultBlob
) {
  if (!(resultBlob instanceof Blob)) {
    console.error(
      '[result] Result Blob tidak valid.'
    );

    return;
  }

  const objectUrl =
    URL.createObjectURL(
      resultBlob
    );

  const anchor =
    document.createElement('a');

  anchor.href =
    objectUrl;

  anchor.download =
    `HIMSI_PHOTOBOOTH_${formatTimestamp()}.png`;

  anchor.style.display =
    'none';

  document.body.appendChild(
    anchor
  );

  anchor.click();

  anchor.remove();

  setTimeout(
    () => {
      URL.revokeObjectURL(
        objectUrl
      );
    },
    1000
  );

  console.log(
    '[result] Download dimulai.'
  );
}


/* ============================================================
   UPLOAD RESULT
============================================================ */

export async function uploadResult(
  resultBlob
) {
  if (!(resultBlob instanceof Blob)) {
    throw new Error(
      'Result Blob tidak valid.'
    );
  }

  /*
   * upload.js harus sudah dimuat
   * sebelum app.js.
   */

  if (
    !window.HimsiPhotoUpload ||
    typeof window.HimsiPhotoUpload.upload !==
      'function'
  ) {
    throw new Error(
      'HimsiPhotoUpload tidak tersedia. ' +
      'Pastikan upload.js sudah dimuat.'
    );
  }

  console.log(
    '[result] Uploading final photo...'
  );

  try {
    const uploadedPhoto =
      await window.HimsiPhotoUpload.upload(
        resultBlob
      );

    if (
      !uploadedPhoto ||
      !uploadedPhoto.url
    ) {
      throw new Error(
        'Server tidak mengembalikan Public URL.'
      );
    }

    currentResult.blob =
      resultBlob;

    currentResult.uploadedPhoto =
      uploadedPhoto;

    window.HimsiLastUploadedPhoto =
      uploadedPhoto;

    console.log(
      '[result] Upload berhasil:',
      uploadedPhoto
    );

    console.log(
      '[result] Public URL:',
      uploadedPhoto.url
    );

    /*
     * Event ini nantinya
     * digunakan qr.js.
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

    return uploadedPhoto;
  } catch (error) {
    console.error(
      '[result] Upload gagal:',
      error
    );

    window.HimsiLastUploadedPhoto =
      null;

    window.dispatchEvent(
      new CustomEvent(
        'himsi-photo-upload-error',
        {
          detail:
            error
        }
      )
    );

    throw error;
  }
}


/* ============================================================
   PROCESS RESULT
============================================================ */

export async function processResult(
  imgEl,
  resultUrl,
  resultBlob
) {
  if (!(resultBlob instanceof Blob)) {
    throw new Error(
      'Result Blob tidak tersedia.'
    );
  }

  renderResult(
    imgEl,
    resultUrl
  );

  currentResult.blob =
    resultBlob;

  const uploadedPhoto =
    await uploadResult(
      resultBlob
    );

  return uploadedPhoto;
}


/* ============================================================
   GET CURRENT RESULT
============================================================ */

export function getCurrentResult() {
  return {
    ...currentResult
  };
}


/* ============================================================
   GET UPLOADED PHOTO
============================================================ */

export function getUploadedPhoto() {
  return (
    currentResult.uploadedPhoto ||
    null
  );
}


/* ============================================================
   GET PUBLIC URL
============================================================ */

export function getPublicUrl() {
  return (
    currentResult
      .uploadedPhoto
      ?.url ||
    null
  );
}


/* ============================================================
   RESET RESULT
============================================================ */

export function resetResult() {
  currentResult = {
    blob: null,
    objectUrl: null,
    uploadedPhoto: null,
  };

  window.HimsiLastUploadedPhoto =
    null;

  console.log(
    '[result] Result state direset.'
  );
}


/* ============================================================
   OPTIONAL GLOBAL DEBUG API
============================================================ */

window.HimsiResult = {
  render:
    renderResult,

  download:
    downloadResult,

  upload:
    uploadResult,

  process:
    processResult,

  get:
    getCurrentResult,

  getUploadedPhoto,

  getPublicUrl,

  reset:
    resetResult,
};

/* ============================================================
   ES MODULE EXPORTS
============================================================ */

export {
  renderResult,
  downloadResult,
  uploadResult,
  processResult,
  getCurrentResult,
  getUploadedPhoto,
  getPublicUrl,
  resetResult
};

console.log(
  '[HIMSI] Result system loaded.'
);