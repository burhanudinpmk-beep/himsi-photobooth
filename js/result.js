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
 * - Download hasil foto
 * - Upload hasil foto
 * - Menyimpan informasi foto hasil upload
 * - Menyediakan data untuk QR Code
 *
 * Sistem:
 * Vanilla JavaScript
 * Tanpa import / export ES Module
 */


/**
 * ============================================
 * 1. Helper Timestamp
 * ============================================
 */

function formatTimestamp() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");

    return `${year}${month}${day}_${hours}${minutes}${seconds}`;
}


/**
 * ============================================
 * 2. State Result
 * ============================================
 */

let currentResult = {
    blob: null,
    localUrl: null,
    uploadedPhoto: null
};


/**
 * ============================================
 * 3. Render Result
 * ============================================
 *
 * Menampilkan hasil final photobooth
 * ke elemen <img>.
 */

function renderResult(imgEl, resultUrl) {

    if (!(imgEl instanceof HTMLImageElement)) {
        console.error(
            "[result] Element preview bukan HTMLImageElement."
        );

        return false;
    }


    if (
        typeof resultUrl !== "string" ||
        !resultUrl
    ) {
        console.error(
            "[result] URL hasil foto tidak tersedia."
        );

        return false;
    }


    imgEl.src = resultUrl;

    currentResult.localUrl = resultUrl;


    console.log(
        "[result] Preview hasil foto berhasil ditampilkan."
    );


    return true;
}


/**
 * ============================================
 * 4. Download Result
 * ============================================
 *
 * Download langsung dari Blob.
 */

function downloadResult(resultBlob) {

    const blob =
        resultBlob ||
        currentResult.blob;


    if (!(blob instanceof Blob)) {

        console.error(
            "[result] Blob hasil foto tidak valid."
        );

        return false;
    }


    const downloadUrl =
        URL.createObjectURL(blob);


    const anchor =
        document.createElement("a");


    anchor.href = downloadUrl;

    anchor.download =
        `HIMSI_PHOTOBOOTH_${formatTimestamp()}.png`;


    anchor.style.display = "none";


    document.body.appendChild(anchor);


    anchor.click();


    anchor.remove();


    setTimeout(() => {

        URL.revokeObjectURL(
            downloadUrl
        );

    }, 1000);


    console.log(
        "[result] Download foto dimulai."
    );


    return true;
}


/**
 * ============================================
 * 5. Upload Result
 * ============================================
 *
 * Mengirim hasil foto melalui:
 *
 * window.HimsiPhotoUpload.upload()
 *
 * yang berasal dari:
 *
 * js/upload.js
 */

async function uploadResult(resultBlob) {

    const blob =
        resultBlob ||
        currentResult.blob;


    if (!(blob instanceof Blob)) {

        throw new Error(
            "Blob hasil foto tidak valid."
        );
    }


    if (
        !window.HimsiPhotoUpload ||
        typeof window.HimsiPhotoUpload.upload !== "function"
    ) {

        throw new Error(
            "HimsiPhotoUpload belum tersedia. Pastikan js/upload.js sudah dimuat."
        );
    }


    console.log(
        "[result] Meng-upload final photo..."
    );


    try {

        const photo =
            await window.HimsiPhotoUpload.upload(
                blob
            );


        if (!photo) {

            throw new Error(
                "Server tidak mengembalikan data foto."
            );
        }


        if (!photo.url) {

            throw new Error(
                "Server tidak mengembalikan URL foto."
            );
        }


        /**
         * Simpan ke state result
         */

        currentResult.uploadedPhoto =
            photo;


        /**
         * Simpan secara global.
         *
         * Nantinya dapat digunakan oleh:
         * - QR Code
         * - WhatsApp
         * - Email
         * - tombol share
         */

        window.HimsiLastUploadedPhoto =
            photo;


        console.log(
            "[result] Upload berhasil:",
            photo
        );


        console.log(
            "[result] Public photo URL:",
            photo.url
        );


        return photo;

    } catch (error) {

        console.error(
            "[result] Upload gagal:",
            error
        );


        throw error;
    }
}


/**
 * ============================================
 * 6. Process Result
 * ============================================
 *
 * Alur utama:
 *
 * Foto selesai
 *      ↓
 * Render preview
 *      ↓
 * Simpan Blob
 *      ↓
 * Upload
 *      ↓
 * Dapat public URL
 *      ↓
 * QR Code
 */

async function processResult(
    imgEl,
    resultUrl,
    resultBlob
) {

    console.log(
        "[result] Memproses hasil photobooth..."
    );


    /**
     * Validasi Blob
     */

    if (!(resultBlob instanceof Blob)) {

        throw new Error(
            "Result Blob tidak tersedia."
        );
    }


    /**
     * Simpan Blob
     */

    currentResult.blob =
        resultBlob;


    /**
     * Render preview
     */

    if (
        imgEl &&
        resultUrl
    ) {

        renderResult(
            imgEl,
            resultUrl
        );
    }


    /**
     * Upload foto
     */

    try {

        const uploadedPhoto =
            await uploadResult(
                resultBlob
            );


        console.log(
            "[result] Result processing selesai."
        );


        return uploadedPhoto;

    } catch (error) {

        /**
         * Preview dan download lokal
         * tetap dapat digunakan walaupun
         * upload gagal.
         */

        console.error(
            "[result] Result berhasil dibuat tetapi upload gagal:",
            error
        );


        throw error;
    }
}


/**
 * ============================================
 * 7. Get Current Result
 * ============================================
 */

function getCurrentResult() {

    return {
        blob:
            currentResult.blob,

        localUrl:
            currentResult.localUrl,

        uploadedPhoto:
            currentResult.uploadedPhoto
    };
}


/**
 * ============================================
 * 8. Get Uploaded Photo
 * ============================================
 */

function getUploadedPhoto() {

    return currentResult.uploadedPhoto;
}


/**
 * ============================================
 * 9. Get Public URL
 * ============================================
 *
 * Fungsi ini nantinya berguna untuk QR.
 */

function getPublicUrl() {

    if (
        !currentResult.uploadedPhoto ||
        !currentResult.uploadedPhoto.url
    ) {

        return null;
    }


    return currentResult.uploadedPhoto.url;
}


/**
 * ============================================
 * 10. Reset Result
 * ============================================
 *
 * Dipanggil ketika user memilih
 * TAKE ANOTHER.
 */

function resetResult() {

    currentResult = {
        blob: null,
        localUrl: null,
        uploadedPhoto: null
    };


    window.HimsiLastUploadedPhoto =
        null;


    console.log(
        "[result] Result state telah di-reset."
    );
}


/**
 * ============================================
 * 11. Global Initial State
 * ============================================
 */

window.HimsiLastUploadedPhoto =
    window.HimsiLastUploadedPhoto || null;


/**
 * ============================================
 * 12. Global API
 * ============================================
 *
 * Tidak menggunakan:
 *
 * export
 * import
 *
 * supaya kompatibel dengan struktur
 * Vanilla JS photobooth saat ini.
 */

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

    getUploadedPhoto:
        getUploadedPhoto,

    getPublicUrl:
        getPublicUrl,

    reset:
        resetResult

};


/**
 * ============================================
 * 13. Debug
 * ============================================
 */

console.log(
    "HIMSI Result system loaded."
);

console.log(
    "[result] HimsiResult API:",
    window.HimsiResult
);