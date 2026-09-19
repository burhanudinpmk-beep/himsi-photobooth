# HIMSI PHOTOBOOTH — DESIGN SYSTEM

Version: 1.0
Project: HIMSI Photobooth
Interface Concept: Photo.exe
Organization: HIMSI — Sistem Informasi
Event Context: PKKMB Universitas PGRI Pontianak

---

## 1. PROJECT IDENTITY

HIMSI Photobooth adalah aplikasi photobooth berbasis browser untuk stand HIMSI.

Website dirancang bukan sebagai company profile, melainkan sebagai interactive booth experience.

Core experience:

```
PHOTO + MEMORY + TECHNOLOGY + HIMSI
```

Visual concept: **Photo.exe — Retro Tech Photobooth Experience**

Tujuan desain: mudah digunakan, cepat, memorable, playful, modern, mencerminkan Sistem Informasi, konsisten dengan identitas HIMSI.

---

## 2. VISUAL HIERARCHY

Tiga visual language utama:

1. **HIMSI Modern Branding** — identitas utama (warna, logo, CTA, heading, frame, branding event)
2. **Retro Computer Interface** — interface language (window, titlebar, dialog, filename, system status, cursor, menu, progress, `.exe` naming)
3. **Flash-Bot** — UX character (menyambut, memberi instruksi/feedback, processing, error)

Hierarchy: `HIMSI BRANDING > PHOTO.EXE INTERFACE > FLASH-BOT DECORATION`

Target balance: **70% modern / 30% retro**

---

## 3. COLOR PALETTE

| Nama | Hex | Penggunaan |
|---|---|---|
| Primary Navy | `#0A2558` | titlebar, heading, navigation, strong surface, outline, HIMSI identity |
| Dark Navy | `#061A3D` | dark background, strong text, contrast surface |
| HIMSI Gold | `#FFB800` | CTA, active state, selected frame, highlights, accent |
| Light Gold | `#FFD34E` | hover, highlight, secondary accent |
| White | `#FFFFFF` | cards, camera panel, text on navy, clean surface |
| Surface | `#F5F7FA` | application background, neutral surface |
| Retro Gray | `#D9D9D9` | classic window elements, inactive controls, retro UI |
| Dark Text | `#171717` | — |
| Success | `#16833B` | — |
| Error | `#C9362B` | — |

## 4. CSS DESIGN TOKENS

```css
:root {
    --navy: #0A2558;
    --navy-dark: #061A3D;
    --gold: #FFB800;
    --gold-light: #FFD34E;
    --white: #FFFFFF;
    --surface: #F5F7FA;
    --retro-gray: #D9D9D9;
    --retro-dark: #171717;
    --success: #16833B;
    --danger: #C9362B;
    --radius-sm: 6px;
    --radius-md: 12px;
    --radius-lg: 20px;
    --transition-fast: 180ms;
    --transition-normal: 300ms;
}
```

---

## 5. ASSET STATUS (PENTING)

| Aset | Status | Sumber |
|---|---|---|
| `assets/mascot/flashbot-welcome.png` | **Final** — transparan, resolusi tinggi | Diekstrak langsung dari file asli yang diunggah |
| `assets/branding/favicon-*.png`, `logo-icon.png` | **Final** | Diekstrak dari file favicon asli yang diunggah |
| `assets/mascot/flashbot-processing.png` | **Placeholder** — resolusi rendah, diambil dari lembar referensi/moodboard | Perlu diganti PNG transparan resolusi tinggi |
| `assets/mascot/flashbot-error.png` | **Placeholder** — resolusi rendah, diambil dari lembar referensi/moodboard | Perlu diganti PNG transparan resolusi tinggi |
| `assets/frames/frame-03.png` s/d `frame-06.png` | **Placeholder** — dibuat otomatis mengikuti palet & ukuran yang diminta, SUDAH transparan di area foto | Perlu diganti PNG transparan final dari desainer |

Lembar referensi asli (mockup lengkap dengan mascot 3 pose dan 4 template frame) hanya tersedia sebagai satu file JPEG gabungan (moodboard), bukan file-file terpisah dalam resolusi produksi — sehingga tidak bisa langsung dipakai sebagai aset final. Aplikasi ini dibangun agar berjalan penuh end-to-end dengan placeholder tersebut; ganti file di `assets/` dengan nama & ukuran yang sama saat aset final sudah tersedia (lihat catatan koordinat slot di `js/frames.js`).

---

## 6. LAYOUT FRAME (per DESIGN & kalkulasi produksi)

| Frame | Jumlah Foto | Ukuran Export |
|---|---|---|
| Frame 03 | 3 | 600 × 1800 px (strip vertikal) |
| Frame 04 | 4 | 1200 × 1800 px (grid 2×2) |
| Frame 05 | 5 | 800 × 2000 px (2 atas, 1 tengah lebar, 2 bawah) |
| Frame 06 | 6 | 1200 × 1800 px (grid 2×3) |

Koordinat slot masing-masing frame didefinisikan secara eksplisit di `js/frames.js` (bukan tebakan), karena frame placeholder dibuat sendiri oleh proses build ini sehingga koordinatnya diketahui pasti.
