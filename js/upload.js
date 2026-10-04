/**
 * ============================================
 * HIMSI META PHOTOBOOTH
 * Photo Upload Client
 * ============================================
 *
 * File:
 * js/upload.js
 *
 * Fungsi:
 * Mengirim hasil final photo dari browser
 * ke /api/upload.
 */


/**
 * Upload final photo ke server.
 *
 * @param {Blob} photoBlob
 * @returns {Promise<Object>}
 */
async function uploadPhotoboothPhoto(photoBlob) {

    // ==========================================
    // 1. Validasi Blob
    // ==========================================

    if (!(photoBlob instanceof Blob)) {

        throw new Error(
            "Final photo harus berupa Blob."
        );

    }


    // ==========================================
    // 2. Validasi tipe file
    // ==========================================

    const allowedTypes = [
        "image/png",
        "image/jpeg",
        "image/webp"
    ];


    if (!allowedTypes.includes(photoBlob.type)) {

        throw new Error(
            `Format foto tidak didukung: ${photoBlob.type}`
        );

    }


    // ==========================================
    // 3. Validasi ukuran
    // ==========================================

    const MAX_FILE_SIZE =
        4 * 1024 * 1024;

    if (photoBlob.size > MAX_FILE_SIZE) {

        throw new Error(
            "Ukuran foto terlalu besar. Maksimal 4 MB."
        );

    }


    // ==========================================
    // 4. Upload
    // ==========================================

    let response;

    try {

        response = await fetch(
            "/api/upload",
            {
                method: "POST",

                headers: {
                    "Content-Type": photoBlob.type
                },

                body: photoBlob
            }
        );

    } catch (networkError) {

        console.error(
            "Network upload error:",
            networkError
        );

        throw new Error(
            "Tidak dapat terhubung ke server upload."
        );

    }


    // ==========================================
    // 5. Ambil response JSON
    // ==========================================

    let result;

    try {

        result = await response.json();

    } catch (error) {

        throw new Error(
            "Response server upload tidak valid."
        );

    }


    // ==========================================
    // 6. Cek response server
    // ==========================================

    if (!response.ok) {

        throw new Error(
            result.message ||
            "Upload foto gagal."
        );

    }


    if (!result.success) {

        throw new Error(
            result.message ||
            "Upload foto gagal."
        );

    }


    if (!result.photo?.url) {

        throw new Error(
            "Server tidak mengembalikan URL foto."
        );

    }


    // ==========================================
    // 7. Return data foto
    // ==========================================

    return result.photo;
}


/**
 * ============================================
 * Utility Canvas → Blob
 * ============================================
 *
 * Gunakan fungsi ini jika final photo
 * masih berbentuk HTMLCanvasElement.
 */

function canvasToPhotoBlob(
    canvas,
    type = "image/png",
    quality = 0.95
) {

    return new Promise(
        (resolve, reject) => {

            if (!(canvas instanceof HTMLCanvasElement)) {

                reject(
                    new Error(
                        "Canvas final photo tidak valid."
                    )
                );

                return;

            }


            canvas.toBlob(
                (blob) => {

                    if (!blob) {

                        reject(
                            new Error(
                                "Gagal membuat Blob dari Canvas."
                            )
                        );

                        return;

                    }


                    resolve(blob);

                },

                type,
                quality
            );

        }
    );

}


/**
 * ============================================
 * Upload langsung dari Canvas
 * ============================================
 */

async function uploadCanvasPhoto(canvas) {

    try {

        console.log(
            "Membuat final photo Blob..."
        );


        const photoBlob =
            await canvasToPhotoBlob(
                canvas,
                "image/png"
            );


        console.log(
            "Ukuran final photo:",
            (
                photoBlob.size /
                1024 /
                1024
            ).toFixed(2),
            "MB"
        );


        console.log(
            "Meng-upload final photo..."
        );


        const photo =
            await uploadPhotoboothPhoto(
                photoBlob
            );


        console.log(
            "Upload berhasil:",
            photo
        );


        return photo;

    } catch (error) {

        console.error(
            "Upload Canvas gagal:",
            error
        );


        throw error;

    }

}


/**
 * ============================================
 * Export
 * ============================================
 *
 * Project sekarang menggunakan Vanilla JS.
 * Supaya fungsi dapat dipanggil dari script
 * existing tanpa harus langsung mengubah semua
 * file menjadi ES Module, expose melalui window.
 */

window.HimsiPhotoUpload = {

    upload:
        uploadPhotoboothPhoto,

    canvasToBlob:
        canvasToPhotoBlob,

    uploadCanvas:
        uploadCanvasPhoto

};