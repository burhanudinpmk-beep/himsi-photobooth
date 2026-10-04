/**
 * ============================================
 * HIMSI META PHOTOBOOTH
 * Result Handler
 * ============================================
 *
 * File:
 * js/result.js
 *
 * Fungsi:
 * 1. Menampilkan hasil final photobooth
 * 2. Download hasil foto
 * 3. Upload hasil foto ke Vercel melalui upload.js
 * 4. Menyimpan URL hasil upload untuk QR Code
 *
 * Project menggunakan Vanilla JS.
 * Tidak menggunakan import/export ES Module.
 */


/**
 * ============================================
 * FORMAT TIMESTAMP
 * ============================================
 *
 * Digunakan untuk membuat nama file unik.
 */

function formatResultTimestamp() {

    const now = new Date();

    const year =
        now.getFullYear();

    const month =
        String(now.getMonth() + 1)
            .padStart(2, "0");

    const day =
        String(now.getDate())
            .padStart(2, "0");

    const hours =
        String(now.getHours())
            .padStart(2, "0");

    const minutes =
        String(now.getMinutes())
            .padStart(2, "0");

    const seconds =
        String(now.getSeconds())
            .padStart(2, "0");


    return (
        `${year}${month}${day}_` +
        `${hours}${minutes}${seconds}`
    );
}


/**
 * ============================================
 * DOWNLOAD BLOB
 * ============================================
 *
 * Menggantikan fungsi downloadBlob
 * yang sebelumnya di-import dari utils.js.
 */

function downloadResultBlob(blob, filename) {

    if (!(blob instanceof Blob)) {

        console.error(
            "Download gagal: data bukan Blob."
        );

        return;

    }


    const url =
        URL.createObjectURL(blob);


    const link =
        document.createElement("a");


    link.href =
        url;

    link.download =
        filename;


    document.body.appendChild(link);

    link.click();

    link.remove();


    setTimeout(
        () => {

            URL.revokeObjectURL(url);

        },
        1000
    );

}


/**
 * ============================================
 * RENDER RESULT
 * ============================================
 *
 * Menampilkan hasil akhir photobooth.
 *
 * @param {HTMLImageElement} imgEl
 * @param {string} resultUrl
 */

function renderResult(
    imgEl,
    resultUrl
) {

    if (!(imgEl instanceof HTMLImageElement)) {

        console.error(
            "Elemen preview hasil tidak valid."
        );

        return;

    }


    if (!resultUrl) {

        console.error(
            "URL hasil foto tidak tersedia."
        );

        return;

    }


    imgEl.src =
        resultUrl;

}


/**
 * ============================================
 * DOWNLOAD RESULT
 * ============================================
 *
 * Download final photo ke perangkat user.
 *
 * @param {Blob} resultBlob
 */

function downloadResult(
    resultBlob
) {

    if (!(resultBlob instanceof Blob)) {

        console.error(
            "Final photo bukan Blob."
        );

        return;

    }


    const filename =
        `HIMSI_PHOTOBOOTH_${formatResultTimestamp()}.png`;


    downloadResultBlob(
        resultBlob,
        filename
    );

}


/**
 * ============================================
 * UPLOAD RESULT
 * ============================================
 *
 * Mengirim final photo ke sistem upload.js.
 *
 * Hasil upload nantinya berupa URL publik
 * yang dapat digunakan untuk QR Code.
 *
 * @param {Blob} resultBlob
 * @returns {Promise<Object>}
 */

async function uploadResult(
    resultBlob
) {

    // ------------------------------------------
    // Validasi Blob
    // ------------------------------------------

    if (!(resultBlob instanceof Blob)) {

        throw new Error(
            "Final photo bukan Blob."
        );

    }


    // ------------------------------------------
    // Pastikan upload.js sudah dimuat
    // ------------------------------------------

    if (!window.HimsiPhotoUpload) {

        throw new Error(
            "HimsiPhotoUpload tidak tersedia. " +
            "Pastikan upload.js dimuat sebelum result.js."
        );

    }


    if (
        typeof window.HimsiPhotoUpload.upload
        !== "function"
    ) {

        throw new Error(
            "Fungsi upload foto tidak tersedia."
        );

    }


    console.log(
        "Meng-upload hasil photobooth..."
    );


    try {

        const photo =
            await window.HimsiPhotoUpload.upload(
                resultBlob
            );


        console.log(
            "Upload hasil photobooth berhasil:",
            photo
        );


        /**
         * Simpan informasi hasil upload.
         *
         * Data ini nanti digunakan qr.js
         * untuk membuat QR Code.
         */

        window.HimsiPhotoResult =
            window.HimsiPhotoResult || {};


        window.HimsiPhotoResult.photo =
            photo;


        window.HimsiPhotoResult.url =
            photo.url;


        window.HimsiPhotoResult.downloadUrl =
            photo.downloadUrl ||
            photo.url;


        return photo;

    } catch (error) {

        console.error(
            "Upload hasil photobooth gagal:",
            error
        );


        throw error;

    }

}


/**
 * ============================================
 * PROCESS FINAL RESULT
 * ============================================
 *
 * Fungsi utama setelah proses compose selesai.
 *
 * Fungsi ini:
 *
 * 1. Menampilkan preview
 * 2. Menyimpan Blob final
 * 3. Menyimpan Object URL
 * 4. Upload foto
 * 5. Menyimpan public URL
 *
 * QR Code nantinya menggunakan URL tersebut.
 *
 * @param {HTMLImageElement} imgEl
 * @param {Blob} resultBlob
 */

async function processFinalResult(
    imgEl,
    resultBlob
) {

    if (!(resultBlob instanceof Blob)) {

        throw new Error(
            "Final result harus berupa Blob."
        );

    }


    // ------------------------------------------
    // Buat preview URL
    // ------------------------------------------

    const resultUrl =
        URL.createObjectURL(
            resultBlob
        );


    // ------------------------------------------
    // Tampilkan hasil
    // ------------------------------------------

    renderResult(
        imgEl,
        resultUrl
    );


    // ------------------------------------------
    // Simpan state hasil final
    // ------------------------------------------

    window.HimsiPhotoResult =
        window.HimsiPhotoResult || {};


    window.HimsiPhotoResult.blob =
        resultBlob;


    window.HimsiPhotoResult.previewUrl =
        resultUrl;


    // ------------------------------------------
    // Upload ke server
    // ------------------------------------------

    try {

        const uploadedPhoto =
            await uploadResult(
                resultBlob
            );


        console.log(
            "Public photo URL:",
            uploadedPhoto.url
        );


        /**
         * Kalau qr.js sudah tersedia,
         * QR bisa dibuat otomatis.
         *
         * Untuk sekarang kita hanya mengirim URL.
         */

        if (
            window.HimsiQRCode &&
            typeof window.HimsiQRCode.generate
                === "function"
        ) {

            window.HimsiQRCode.generate(
                uploadedPhoto.downloadUrl ||
                uploadedPhoto.url
            );

        }


        return uploadedPhoto;

    } catch (error) {

        /**
         * Upload gagal tidak boleh membuat
         * fungsi download lokal ikut gagal.
         */

        console.error(
            "Cloud upload gagal. " +
            "Download lokal tetap tersedia.",
            error
        );


        return null;

    }

}


/**
 * ============================================
 * GET RESULT
 * ============================================
 *
 * Utility untuk mengambil informasi hasil
 * photobooth dari script lain.
 */

function getResult() {

    return (
        window.HimsiPhotoResult ||
        null
    );

}


/**
 * ============================================
 * CLEANUP RESULT
 * ============================================
 *
 * Jalankan ketika user memilih
 * "Take Another".
 */

function cleanupResult() {

    const result =
        window.HimsiPhotoResult;


    if (
        result &&
        result.previewUrl
    ) {

        URL.revokeObjectURL(
            result.previewUrl
        );

    }


    window.HimsiPhotoResult = null;


    console.log(
        "Photobooth result dibersihkan."
    );

}


/**
 * ============================================
 * EXPORT GLOBAL
 * ============================================
 *
 * Karena project menggunakan Vanilla JS,
 * expose fungsi melalui window.
 */

window.HimsiResult = {

    render:
        renderResult,

    download:
        downloadResult,

    upload:
        uploadResult,

    process:
        processFinalResult,

    get:
        getResult,

    cleanup:
        cleanupResult

};


console.log(
    "HIMSI Result system loaded."
);