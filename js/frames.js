/**
 * frames.js
 * Konfigurasi seluruh frame HIMSI Photobooth.
 *
 * PENTING (baca sebelum mengganti aset frame):
 * File assets/frames/frame-0X.png saat ini adalah PLACEHOLDER yang dibuat
 * otomatis (navy + gold, mengikuti DESIGN.md) karena aset final dari
 * desainer belum tersedia dalam format PNG transparan terpisah.
 * Placeholder ini SUDAH transparan pada area foto (slots), jadi aplikasi
 * berjalan penuh end-to-end. Saat aset final sudah ada:
 *   1. Ganti file PNG di assets/frames/ (nama file & ukuran tetap sama).
 *   2. Ukur ulang koordinat slot pada gambar final (misal dibuka di
 *      Photoshop/Figma dengan satuan px sesuai width/height canvas),
 *      lalu update array `slots` di bawah ini.
 * Jangan menebak koordinat tanpa mengukur dari file asli.
 */

export const frames = {
  'frame-03': {
    id: 'frame-03',
    name: 'HIMSI Frame 03 — Strip 3 Foto',
    photoCount: 3,
    width: 600,
    height: 1800,
    overlay: 'assets/frames/frame-03.png',
    thumbnail: 'assets/frames/frame-03.png',
    slots: [
      { x: 70, y: 210, width: 460, height: 430 },
      { x: 70, y: 674, width: 460, height: 430 },
      { x: 70, y: 1138, width: 460, height: 430 },
    ],
  },

  'frame-04': {
    id: 'frame-04',
    name: 'HIMSI Frame 04 — Grid 4 Foto',
    photoCount: 4,
    width: 1200,
    height: 1800,
    overlay: 'assets/frames/frame-04.png',
    thumbnail: 'assets/frames/frame-04.png',
    slots: [
      { x: 70, y: 230, width: 500, height: 560 },
      { x: 630, y: 230, width: 500, height: 560 },
      { x: 70, y: 840, width: 500, height: 560 },
      { x: 630, y: 840, width: 500, height: 560 },
    ],
  },

  'frame-05': {
    id: 'frame-05',
    name: 'HIMSI Frame 05 — Mix 5 Foto',
    photoCount: 5,
    width: 800,
    height: 2000,
    overlay: 'assets/frames/frame-05.png',
    thumbnail: 'assets/frames/frame-05.png',
    slots: [
      { x: 55, y: 230, width: 330, height: 400 },
      { x: 415, y: 230, width: 330, height: 400 },
      { x: 60, y: 660, width: 680, height: 480 },
      { x: 55, y: 1170, width: 330, height: 400 },
      { x: 415, y: 1170, width: 330, height: 400 },
    ],
  },

  'frame-06': {
    id: 'frame-06',
    name: 'HIMSI Frame 06 — Grid 6 Foto',
    photoCount: 6,
    width: 1200,
    height: 1800,
    overlay: 'assets/frames/frame-06.png',
    thumbnail: 'assets/frames/frame-06.png',
    slots: [
      { x: 70, y: 190, width: 500, height: 350 },
      { x: 630, y: 190, width: 500, height: 350 },
      { x: 70, y: 574, width: 500, height: 350 },
      { x: 630, y: 574, width: 500, height: 350 },
      { x: 70, y: 958, width: 500, height: 350 },
      { x: 630, y: 958, width: 500, height: 350 },
    ],
  },
};

export const frameList = Object.values(frames);

export function getFrame(id) {
  return frames[id] || null;
}
