/**
 * utils.js
 * Fungsi bantu yang dipakai bersama oleh modul lain.
 */

/** Ambil elemen dengan querySelector, throw jika tidak ketemu (memudahkan debug). */
export function qs(selector, root = document) {
  const el = root.querySelector(selector);
  return el;
}

export function qsa(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

/** Delay berbasis Promise, dipakai untuk timing countdown/boot/processing. */
export function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Menggambar image ke canvas dengan perilaku setara CSS `object-fit: cover`,
 * mempertahankan aspect ratio tanpa stretch.
 * focal.x / focal.y (0..1) menentukan titik fokus crop, default center.
 */
export function drawImageCover(ctx, img, dx, dy, dWidth, dHeight, focal = { x: 0.5, y: 0.5 }) {
  const imgRatio = img.width / img.height;
  const targetRatio = dWidth / dHeight;

  let sx, sy, sWidth, sHeight;

  if (imgRatio > targetRatio) {
    // Gambar lebih lebar dari target -> crop kiri/kanan
    sHeight = img.height;
    sWidth = sHeight * targetRatio;
    sx = (img.width - sWidth) * focal.x;
    sy = 0;
  } else {
    // Gambar lebih tinggi dari target -> crop atas/bawah
    sWidth = img.width;
    sHeight = sWidth / targetRatio;
    sx = 0;
    sy = (img.height - sHeight) * focal.y;
  }

  ctx.drawImage(img, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
}

/** Load sebuah URL/Blob URL menjadi HTMLImageElement, return Promise. */
export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

/**
 * Restart sebuah animasi CSS pada elemen dengan melepas lalu menambahkan
 * kembali class-nya (force reflow di antaranya). Dipakai untuk memberi
 * micro-feedback (mis. teks Flash-Bot berubah) tanpa memengaruhi logic lain.
 */
export function pulseElement(el, className = 'pulse-pop') {
  if (!el) return;
  el.classList.remove(className);
  void el.offsetWidth;
  el.classList.add(className);
}

/** Format timestamp untuk nama file: YYYY-MM-DD_HH-MM-SS */
export function formatTimestamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const h = pad(date.getHours());
  const mi = pad(date.getMinutes());
  const s = pad(date.getSeconds());
  return `${y}-${m}-${d}_${h}-${mi}-${s}`;
}

/** Buat & trigger download Blob sebagai file, lalu revoke Object URL setelahnya. */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Beri sedikit waktu agar browser sempat memulai proses download
  // sebelum Object URL di-revoke.
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Konversi HTMLCanvasElement menjadi Blob PNG via Promise. */
export function canvasToBlob(canvas) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png', 1.0);
  });
}

/**
 * Kelas kecil untuk mengelola daftar Object URL agar mudah di-revoke semua
 * sekaligus saat session direset (mencegah memory leak).
 */
export class ObjectUrlManager {
  constructor() {
    this.urls = new Set();
  }

  create(blob) {
    const url = URL.createObjectURL(blob);
    this.urls.add(url);
    return url;
  }

  revoke(url) {
    if (this.urls.has(url)) {
      URL.revokeObjectURL(url);
      this.urls.delete(url);
    }
  }

  revokeAll() {
    for (const url of this.urls) {
      URL.revokeObjectURL(url);
    }
    this.urls.clear();
  }
}

export const urlManager = new ObjectUrlManager();

/** Map nama error MediaDevices ke pesan ramah pengguna (bahasa Indonesia). */
export function getCameraErrorMessage(err) {
  const name = err && err.name ? err.name : 'UnknownError';
  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return {
        title: 'AKSES KAMERA DITOLAK',
        message: 'Izinkan akses kamera pada browser lalu coba lagi.',
      };
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return {
        title: 'KAMERA TIDAK DITEMUKAN',
        message: 'Pastikan perangkat memiliki kamera yang terhubung dan aktif.',
      };
    case 'NotReadableError':
    case 'TrackStartError':
      return {
        title: 'KAMERA SEDANG DIGUNAKAN',
        message: 'Tutup aplikasi lain yang mungkin sedang memakai kamera, lalu coba lagi.',
      };
    case 'OverconstrainedError':
      return {
        title: 'KONFIGURASI KAMERA TIDAK DIDUKUNG',
        message: 'Perangkat kamera tidak mendukung pengaturan yang diminta.',
      };
    default:
      return {
        title: 'UPS!',
        message: 'Kamera belum aktif. Izinkan akses kamera pada browser lalu coba lagi.',
      };
  }
}
