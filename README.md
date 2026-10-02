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
│   ├── camera.js        # getUserMedia, enumerasi/ganti device, live preview, capture, deteksi disconnect
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

- Boot intro → Landing (Photo.exe, fullscreen) → pilih frame → izin kamera → live camera → countdown → capture berurutan → preview → retake individual per foto → processing dengan progress nyata → hasil akhir → download PNG → take another / kembali ke beranda.
- **Semua screen fullscreen** (100vw × 100vh) — bukan card kecil di tengah browser. Titlebar/menubar di atas, statusbar di bawah, konten mengisi sisa ruang, teruji tanpa scrollbar vertikal di 1920×1080, 1600×900, 1440×900, 1366×768, dan 1280×720.
- **Navigasi Kembali**: Frames → Landing, Camera → Frames (reset foto yang sudah diambil untuk frame itu), Preview → Camera (mulai ulang capture, langsung live tanpa gate izin lagi karena izin sudah didapat). Processing sengaja tidak punya tombol kembali (mencegah state rusak saat Canvas sedang bekerja).
- **Mirror Preview & Mirror Output terpisah dan bisa diatur sendiri oleh user** (panel MIRROR SETTINGS di Camera.exe):
  - Mirror Preview (default ON) — hanya mengubah tampilan live video (`transform: scaleX(-1)` via class `is-mirrored`), terasa seperti kaca saat berpose.
  - Mirror Output (default OFF) — menentukan apakah data foto yang di-capture ke Canvas ikut dibalik atau tidak. Diterapkan sekali saat capture (`camera.js`), tidak pernah dobel di compositor.
  - Kedua setting independen dan tetap aktif selama satu sesi foto (reset ke default hanya saat "Take Another" / "Kembali ke Beranda").
- Retake tidak mereset semua foto, hanya foto yang dipilih.
- Hasil akhir diekspor pada resolusi asli frame (bukan ukuran tampilan CSS), memakai `object-fit: cover` versi Canvas (`drawImageCover`) agar tidak stretch.
- Semua Blob/Object URL di-revoke saat retake, back, reset, maupun sebelum download selesai — tidak ada kebocoran memori.
- Penanganan error kamera: `NotAllowedError`, `NotFoundError`, `NotReadableError`, `OverconstrainedError`, masing-masing dengan pesan ramah pengguna + tombol TRY AGAIN.
- Animasi ringan di seluruh alur (screen transition fade+slide+scale ~320ms, stagger landing, countdown pop, capture feedback, checklist processing, pulse download sekali, idle float mascot) — semuanya dimatikan otomatis lewat `@media (prefers-reduced-motion: reduce)` tanpa mengubah fungsi.
- Responsif: desktop (prioritas utama untuk stand PKKMB), tablet (kamera/preview di atas, panel di bawah), mobile (fallback, boleh scroll tipis di panel kamera karena bukan prioritas).
- Tidak ada login, database, upload otomatis, analytics, atau tracking — seluruh foto hanya hidup selama session di browser.

## Cara kerja Mirror (ringkas)

`state.js` menyimpan `mirrorPreview` (default `true`) dan `mirrorOutput` (default `false`). Toggle di control bar Camera.exe memanggil `setMirrorPreview()` / `setMirrorOutput()`. Live preview di-mirror murni lewat CSS class `is-mirrored` pada `#camera-video` (tidak menyentuh data). Saat tombol CAPTURE ditekan, `captureFrameToBlob(video, mirrorOutput)` di `camera.js` membaca nilai `mirrorOutput` **saat itu juga** dan menerapkan `ctx.translate/scale` HANYA jika true — sekali saja, langsung ke Blob. `compositor.js` tidak pernah melakukan mirror lagi, jadi tidak mungkin dobel-mirror. Karena mirror dibaca ulang tiap capture, mengganti toggle di tengah sesi (mis. sebelum retake foto ke-2) hanya memengaruhi foto berikutnya, foto yang sudah diambil sebelumnya tidak berubah.

## Dukungan Webcam Eksternal (USB) — CAMERA SOURCE

Camera.exe **tidak mengasumsikan** webcam internal laptop. Alurnya:

1. User menekan AKTIFKAN KAMERA → `getUserMedia()` diminta dengan `facingMode:'user'` sebagai default awal (device belum diketahui, label belum terisi sebelum izin diberikan).
2. Begitu izin didapat, `listVideoInputDevices()` (`navigator.mediaDevices.enumerateDevices()` difilter `kind==='videoinput'`) dipanggil — sekarang `device.label` sudah terisi nama asli (mis. "Logitech HD Pro Webcam C920").
3. Dropdown **CAMERA SOURCE** di toolbar Camera.exe diisi dari daftar ini. Kalau cuma ada 1 kamera, dropdown tetap tampil (berisi nama kamera itu) tapi di-disable karena tidak ada pilihan lain. Kalau ada 2+, dropdown aktif dan user bebas pilih — termasuk USB eksternal.
4. Ganti kamera dari dropdown → `switchCamera()` di `camera.js` menghentikan seluruh track stream lama (`track.stop()`) lalu meminta stream baru dengan `deviceId: { exact }` (TANPA `facingMode`, karena keduanya tidak boleh dicampur). **Tidak reload halaman**, dan **tidak menyentuh** foto yang sudah diambil, frame yang dipilih, atau pengaturan mirror — semua itu murni di `state.js`, lepas dari stream kamera.
5. Resolusi diminta `ideal` (1920×1080 @ 30fps), bukan `exact`, dengan fallback otomatis ke `{video:true}` polos kalau browser/device melempar `OverconstrainedError`. Canvas capture selalu memakai `video.videoWidth`/`videoHeight` asli (resolusi aktual device), bukan angka hardcode.

**Deteksi webcam dicabut/dipasang lagi** (khusus USB, karena bisa lepas kapan saja saat dipakai):
- `watchStreamDisconnect()` memasang listener `ended` pada video track yang sedang aktif — ini event yang andal untuk tahu stream MATI (beda dari `devicechange` yang cuma bilang "daftar device berubah" tanpa tahu stream kamu kena imbasnya atau tidak).
- Begitu `ended` terpicu: overlay **CAMERA DISCONNECTED** muncul, tombol CAPTURE langsung disabled, status indikator jadi "CAMERA OFF" — tapi foto yang sudah diambil, frame, dan mirror setting **tidak disentuh sama sekali**.
- Tombol **REFRESH CAMERA** di overlay itu akan enumerate ulang device lalu mencoba aktifkan kamera lagi.
- `onDeviceListChange()` (wrapper `navigator.mediaDevices.addEventListener('devicechange', ...)`) dipasang terpisah untuk me-refresh isi dropdown CAMERA SOURCE setiap kali ada device dicolok/dicabut, tanpa mengganggu stream yang sedang jalan.
- Status indikator di toolbar punya 4 keadaan nyata (bukan LIVE palsu): `CAMERA OFF` (belum aktif) → `CONNECTING...` (lagi `getUserMedia`/switch) → `LIVE` (stream jalan) → `CAMERA ERROR` (izin ditolak / device gagal).

Semua listener (`devicechange`, `ended`) dibersihkan (`teardownCameraListeners()`) setiap kali meninggalkan Camera.exe atau sebelum mengaktifkan ulang, supaya tidak menumpuk/duplikat kalau user bolak-balik ke screen ini.

## FULL CAMERA — mode layar penuh khusus live camera

Tombol **⛶ FULL CAMERA** di toolbar Camera.exe memperbesar seluruh pengalaman kamera (bukan cuma elemen `<video>`) ke layar penuh satu laptop lewat Fullscreen API asli browser:

- Yang di-fullscreen-kan adalah **`#camera-live` secara keseluruhan** (video + status LIVE + photo counter + CAPTURE + Mirror Preview/Output) — bukan `<video>` sendirian — supaya CAPTURE dan Mirror tetap bisa dipakai saat fullscreen, bukan cuma pajangan. Teknisnya: `container.requestFullscreen()` dipanggil pada elemen itu (`openCameraFullscreen()` di `app.js`), dan CSS `:fullscreen` pada `components.css` yang mengatur ulang tampilannya (topbar LIVE/counter/EXIT muncul, video jadi ~88-92% tinggi layar, control bar bawah ~8-12%).
- **EXIT FULLSCREEN** (tombol di topbar) atau tombol **ESC** bawaan browser sama-sama berfungsi keluar — ESC ditangani otomatis oleh browser sendiri, bukan oleh kode custom, jadi tidak ada risiko konflik logic.
- Sesi foto **tidak terganggu** oleh masuk/keluar fullscreen: capture, countdown, mirror, thumbnail progres — semuanya elemen yang sama persis, cuma ukurannya yang membesar. Tidak keluar fullscreen otomatis di tengah sesi (baru 1-2 dari N foto) — fullscreen baru otomatis ditutup (`exitCameraFullscreen()`) begitu SEMUA foto selesai dan pindah ke Preview.exe, atau saat menekan Kembali ke Frames.
- Tombol disembunyikan total (bukan sekadar disabled) kalau browser tidak mendukung Fullscreen API sama sekali (`document.fullscreenEnabled` falsy) — tidak akan pernah melempar error ke user. Tombol juga otomatis disabled selama status kamera bukan LIVE (connecting/off/error), karena fullscreen-kan layar yang belum nyala tidak ada gunanya.
- Tidak dipaksakan otomatis di manapun (termasuk mobile) — murni opsional, hanya aktif saat user sendiri menekan tombolnya, sesuai kebijakan Fullscreen API yang memang mewajibkan interaksi user langsung.

**Catatan pengujian**: ESC key untuk keluar fullscreen adalah perilaku native browser (bukan kode kami) — di beberapa environment otomatis/headless (termasuk sandbox pengujian ini), simulasi key-press ESC tidak selalu memicu exit-fullscreen yang sama persis seperti browser sungguhan karena itu ditangani di level chrome/OS browser, bukan DOM. Di browser asli (Chrome/Edge normal), ESC akan bekerja seperti biasa. Tombol EXIT FULLSCREEN sudah diuji dan bekerja penuh sebagai jalur keluar utama yang pasti berfungsi di semua kondisi.

### Diuji (lihat juga skenario TEST A–F di permintaan revisi)

Di sandbox pengujian hanya tersedia satu fake camera device, jadi skenario 2-kamera diuji dengan menyisipkan satu device videoinput sintetis lewat `enumerateDevices` yang di-override di test — ini memverifikasi kode benar-benar menjalankan `switchCamera()` (stop track lama → device baru) tanpa reload dan tanpa kehilangan foto/frame/mirror, bukan sekadar lolos karena device-nya sama. Disconnect diuji dengan men-dispatch event `ended` langsung ke video track aktif. **Tetap disarankan test manual dengan webcam USB fisik sungguhan sebelum hari-H**, karena perilaku driver/OS asli (delay enumerasi, nama label, dsb.) bisa sedikit berbeda dari simulasi.

## Belum diimplementasikan (sesuai keputusan desain, bukan bug)

- **QR code sharing** — sengaja tidak dibuat di versi ini karena tanpa backend, Object URL di laptop tidak bisa dibuka dari HP lain. Catatan ini juga tampil di layar hasil akhir aplikasi.
- **Suara shutter** (`assets/sounds/shutter.mp3`) — folder sudah disiapkan, file belum ada. Tinggal taruh file mp3 di sana dan panggil lewat `new Audio('assets/sounds/shutter.mp3').play()` di `camera.js` bila diinginkan.
- **Fullscreen Browser API** (`requestFullscreen()`) — belum ditambahkan karena harus dipicu tombol khusus atas interaksi user (tidak boleh otomatis). Layout sudah 100vw×100vh secara CSS terlepas dari ini; tambahkan tombol "⛶ FULLSCREEN" di titlebar bila browser Chrome asli (dengan address bar) ingin disembunyikan juga saat demo.

## Yang perlu ditest manual sebelum hari-H

1. **Pakai webcam USB eksternal sungguhan** di laptop yang akan dipakai stand: pastikan muncul di dropdown CAMERA SOURCE dengan nama yang benar, bisa dipilih, dan jadi default yang dipakai (bukan diam-diam balik ke webcam internal laptop).
2. Kalau laptop stand punya >1 kamera (internal + USB): coba ganti-ganti dari dropdown beberapa kali berturut-turut sambil sudah ambil beberapa foto — pastikan foto yang sudah diambil tidak hilang dan frame/mirror tidak ikut ter-reset.
3. **Full Camera**: tekan ⛶ FULL CAMERA di laptop stand sungguhan, pastikan address bar/tab Chrome benar-benar hilang, CAPTURE dan Mirror tetap kepencet dengan enak, lanjutkan sampai semua foto selesai dan pastikan otomatis keluar fullscreen lalu masuk Preview. Coba juga tekan ESC di tengah sesi untuk pastikan browser asli keluar fullscreen tanpa merusak sesi foto.
5. Cabut webcam USB di tengah sesi (saat live/sedang akan capture) → pastikan muncul overlay CAMERA DISCONNECTED (bukan layar putih/hang), lalu colok lagi dan tekan REFRESH CAMERA → pastikan hidup lagi.
6. Coba ketiga kombinasi mirror: (Preview ON/Output OFF — default), (Preview OFF/Output OFF), (Preview ON/Output ON) — pastikan hasil akhir sesuai ekspektasi masing-masing.
7. Coba semua jalur back: Frames→Kembali, Camera→Kembali, Preview→Kembali, Result→Take Another, Result→Kembali ke Beranda.
8. Test di laptop/browser yang akan dipakai di stand (resolusi asli, bukan hanya devtools responsive mode) — terutama kalau ada scaling display (125%/150%) yang bisa memengaruhi perhitungan vh/vw.
9. Test dengan koneksi internet mati sebentar — pastikan font Poppins/Pixelify Sans fallback dengan baik ke font sistem tanpa merusak layout.

## Kalibrasi ulang koordinat frame (saat aset final sudah ada)

1. Buka file PNG frame final di Figma/Photoshop.
2. Ukur posisi (x, y) serta lebar/tinggi tiap jendela foto transparan, dalam satuan px sesuai resolusi asli file (bukan ukuran preview).
3. Update array `slots` pada frame terkait di `js/frames.js`. Urutan array = urutan pengambilan foto (slot pertama = foto pertama, dst).
4. Tidak perlu mengubah file JS lain — compositor otomatis memakai data dari `frames.js`.
