import { put } from "@vercel/blob";

/**
 * HIMSI META PHOTOBOOTH
 * API Upload Final Photo
 *
 * Endpoint:
 * POST /api/upload
 */

export default async function handler(req, res) {
    // ==========================================
    // 1. Hanya izinkan POST
    // ==========================================

    if (req.method !== "POST") {
        res.setHeader("Allow", ["POST"]);

        return res.status(405).json({
            success: false,
            message: "Method tidak diizinkan."
        });
    }

    try {
        // ==========================================
        // 2. Validasi Content-Type
        // ==========================================

        const contentType = req.headers["content-type"];

        const allowedTypes = [
            "image/png",
            "image/jpeg",
            "image/webp"
        ];

        if (!allowedTypes.includes(contentType)) {
            return res.status(400).json({
                success: false,
                message: "Format foto tidak didukung."
            });
        }

        // ==========================================
        // 3. Validasi body
        // ==========================================

        if (!req.body) {
            return res.status(400).json({
                success: false,
                message: "Data foto tidak ditemukan."
            });
        }

        // ==========================================
        // 4. Tentukan ekstensi file
        // ==========================================

        let extension = "png";

        if (contentType === "image/jpeg") {
            extension = "jpg";
        }

        if (contentType === "image/webp") {
            extension = "webp";
        }

        // ==========================================
        // 5. Generate ID foto unik
        // ==========================================

        const photoId = crypto.randomUUID();

        const filename =
            `himsi-photobooth/${photoId}.${extension}`;

        // ==========================================
        // 6. Upload ke Vercel Blob
        // ==========================================

        const blob = await put(
            filename,
            req.body,
            {
                access: "public",
                contentType: contentType,
                addRandomSuffix: false
            }
        );

        // ==========================================
        // 7. Response ke frontend
        // ==========================================

        return res.status(200).json({
            success: true,

            message: "Foto berhasil di-upload.",

            photo: {
                id: photoId,
                url: blob.url,
                downloadUrl: blob.downloadUrl || blob.url,
                pathname: blob.pathname,
                contentType: contentType
            }
        });

    } catch (error) {

        console.error(
            "HIMSI PHOTOBOOTH UPLOAD ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan saat meng-upload foto."
        });
    }
}