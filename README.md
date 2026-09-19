# HIMSI PHOTOBOOTH — Photo.exe

Aplikasi photobooth berbasis browser untuk stand HIMSI (Sistem Informasi) pada PKKMB Universitas PGRI Pontianak.

Dibangun murni dengan **HTML5, CSS3, dan Vanilla JavaScript (ES6+ Modules)** — tanpa framework, tanpa backend, tanpa database. Semua proses (kamera, crop, komposit frame, export) berjalan 100% di browser pengguna.

## Cara menjalankan

Browser modern **tidak mengizinkan** `getUserMedia()` (akses kamera) dibuka langsung dari `file://`. Jalankan lewat local server sederhana, misalnya salah satu dari:

```bash
# Python
python3 -m http.server 8080

# Node (butuh paket http-server / serve terpasang global)
npx serve .
```

Lalu buka `http://localhost:8080` di browser (disarankan Chrome/Edge terbaru).

Untuk demo di laptop stand PKKMB: cukup jalankan salah satu perintah di atas di folder ini sebelum acara dimulai, lalu buka di browser fullscreen (F11).

## Struktur proyek

```
himsi-photobooth/
├── index.html          # Satu-satunya halaman (SPA), berisi semua screen
├── DESIGN.md           # Design system & status aset (baca ini dulu)
├── README.md
├── css/
│   ├── style.css        # Design tokens, boot & landing
│   ├── components.css   # Tombol, kartu, camera/preview/processing/result
│   └── responsive.css   # Breakpoint tablet & mobile
├── js/
│   ├── app.js           # Orkestrator utama & event wiring
│   ├── state.js         # Single source of truth state aplikasi
│   ├── frames.js        # Konfigurasi & koordinat slot tiap frame
│   ├── camera.js        # getUserMedia, live preview, capture frame
│   ├── countdown.js     # Sekuens GET READY! → 3 → 2 → 1 → FLASH
│   ├── preview.js       # Render grid preview + tombol retake
│   ├── compositor.js    # Canvas: gabung foto + overlay frame → PNG
│   ├── processing.js    # Progress nyata (bukan random) untuk layar Processing
│   ├── result.js        # Render hasil akhir & trigger download Blob
│   └── utils.js         # Helper bersama (drawImageCover, dll)
└── assets/
    ├── branding/         # Logo & favicon (final)
    ├── mascot/           # Flash-Bot (welcome = final, processing/error = placeholder)
    ├── frames/           # Frame overlay PNG (placeholder, lihat DESIGN.md)
    └── sounds/           # (kosong — shutter.mp3 belum tersedia)
```

## Status aset — baca sebelum demo/produksi

Beberapa aset masih **placeholder** karena file final dari desainer belum tersedia dalam format PNG transparan terpisah. Detail lengkap ada di `DESIGN.md` bagian "ASSET STATUS". Ringkasnya:

- ✅ Logo, favicon, dan mascot Flash-Bot pose **Welcome** → aset final, sudah dipakai langsung.
- ⚠️ Mascot pose **Processing** & **Error** → placeholder resolusi rendah (diambil dari lembar referensi). Ganti dengan PNG transparan resolusi tinggi bila sudah ada.
- ⚠️ Keempat **frame foto** (03/04/05/06) → placeholder navy/gold buatan sistem, sudah transparan di area foto dan sudah sesuai ukuran final, tapi belum memakai desain artistik asli. Ganti file PNG di `assets/frames/` (nama & ukuran tetap sama) lalu sesuaikan koordinat `slots` di `js/frames.js` jika layout berubah.

Aplikasi tetap berjalan penuh end-to-end dengan placeholder ini — cocok untuk testing alur & development sambil menunggu aset final.

## Fitur yang sudah berfungsi (sudah diuji end-to-end)

- Boot intro → Landing (Photo.exe) → pilih frame → izin kamera → live camera → countdown → capture berurutan → preview → retake individual per foto → processing dengan progress nyata → hasil akhir → download PNG → take another (reset session).
- Retake tidak mereset semua foto, hanya foto yang dipilih.
- Hasil akhir diekspor pada resolusi asli frame (bukan ukuran tampilan CSS), memakai `object-fit: cover` versi Canvas (`drawImageCover`) agar tidak stretch.
- Semua Blob/Object URL di-revoke saat retake, reset, maupun sebelum download selesai — tidak ada kebocoran memori.
- Preview kamera di-mirror (natural selfie-view), tapi hasil akhir **tidak** ikut di-mirror.
- Penanganan error kamera: `NotAllowedError`, `NotFoundError`, `NotReadableError`, `OverconstrainedError`, masing-masing dengan pesan ramah pengguna + tombol TRY AGAIN.
- Responsif: desktop (utama), tablet (kamera di atas, panel di bawah), mobile.
- Tidak ada login, database, upload otomatis, analytics, atau tracking — seluruh foto hanya hidup selama session di browser.

## Belum diimplementasikan (sesuai keputusan desain, bukan bug)

- **QR code sharing** — sengaja tidak dibuat di versi ini karena tanpa backend, Object URL di laptop tidak bisa dibuka dari HP lain. Catatan ini juga tampil di layar hasil akhir aplikasi.
- **Suara shutter** (`assets/sounds/shutter.mp3`) — folder sudah disiapkan, file belum ada. Tinggal taruh file mp3 di sana dan panggil lewat `new Audio('assets/sounds/shutter.mp3').play()` di `camera.js` bila diinginkan.

## Kalibrasi ulang koordinat frame (saat aset final sudah ada)

1. Buka file PNG frame final di Figma/Photoshop.
2. Ukur posisi (x, y) serta lebar/tinggi tiap jendela foto transparan, dalam satuan px sesuai resolusi asli file (bukan ukuran preview).
3. Update array `slots` pada frame terkait di `js/frames.js`. Urutan array = urutan pengambilan foto (slot pertama = foto pertama, dst).
4. Tidak perlu mengubah file JS lain — compositor otomatis memakai data dari `frames.js`.
