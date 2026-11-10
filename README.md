# Smart Drop Locker

Sistem manajemen loker paket pintar berbasis IoT (**ESP32-CAM**) dan web dashboard menggunakan **Express + EJS + Bootstrap 5**, siap dijalankan di lokal maupun di-deploy ke **Vercel**.

---

## Tech Stack

- **Backend & SSR**: Express.js + EJS
- **UI**: Bootstrap 5 + Bootstrap Icons (tema dark glassmorphism)
- **Database**: PostgreSQL (**Neon** / **Supabase**) via `pg`
- **Storage Foto**: **Vercel Blob** (dengan fallback otomatis ke `public/uploads/` saat dijalankan lokal tanpa token)
- **Barcode Decoder**: `sharp` + `@undecaf/zbar-wasm` (CODE-128 & QR-Code, tanpa binary eksternal `.exe`)
- **Hardware**: ESP32-CAM (AI Thinker) dengan HTTPS (`WiFiClientSecure`)

---

## Setup Lokal

1. Masuk ke folder proyek dan install dependensi:
   ```bash
   npm install
   ```
2. Salin `.env.example` menjadi `.env`, lalu isi `DATABASE_URL` (dari Neon atau Supabase):
   ```bash
   cp .env.example .env
   ```
3. Jalankan SQL dari `schema.sql` pada database PostgreSQL Anda.
4. Jalankan server development:
   ```bash
   npm run dev
   ```
   Buka `http://localhost:3000`.

---

## Deploy ke Vercel

1. Push folder ini ke repository GitHub/GitLab/Bitbucket, lalu import di **Vercel**.
2. Aktifkan **Vercel Blob Storage** pada tab *Storage* di proyek Vercel Anda (`BLOB_READ_WRITE_TOKEN` akan terisi otomatis).
3. Tambahkan Environment Variables di Vercel:
   - `DATABASE_URL`: connection string PostgreSQL (Neon / Supabase)
   - `ESP32_API_KEY`: token rahasia untuk request dari ESP32-CAM
4. Deploy.

---

## Setup ESP32-CAM

1. Buka `firmware/esp32_cam/esp32_cam.ino` di Arduino IDE.
2. Salin `firmware/esp32_cam/secrets.example.h` menjadi `firmware/esp32_cam/secrets.h`, lalu isi SSID WiFi, password, URL Vercel (`https://...vercel.app`), dan `ESP32_API_KEY`.
3. Upload sketch ke board **AI Thinker ESP32-CAM**.

