# 03 — Rencana & Riwayat Migrasi (`smart-drop-locker`)

## 1. Peta Migrasi dari PHP ke Express + EJS

| Asal (`smart-drop-point`) | Tujuan (`smart-drop-locker`) | Perubahan Penting |
| :--- | :--- | :--- |
| `public/index.php` | `src/routes/web.js` (`GET /`) + `views/dashboard.ejs` | Statistik Jakarta timezone, status pintu, tombol buka pintu via `POST` |
| `public/resi.php` | `src/routes/web.js` (`GET /resi`) + `views/resi/index.ejs` | Pencarian resi, toggle `POST`, ditambah tombol hapus resi |
| `public/resi_add.php` | `src/routes/web.js` (`/resi/add`) + `views/resi/add.ejs` | Validasi input + parameterized query PostgreSQL |
| `public/resi_detail.php` | `src/routes/web.js` (`/resi/:id`, `/resi/:id/edit`) + `views/resi/detail.ejs` | Ditambah fitur edit nomor resi, nama paket, dan status |
| `public/resi_toggle.php` | `src/routes/web.js` (`POST /resi/:id/toggle`) | Menggunakan `POST` dan query berparameter |
| `public/log.php`, `hapus_log.php` | `src/routes/web.js` (`/log`, `POST /log/:id/delete`) + `views/log.ejs` | Form filter & tombol submit diperbaiki; hapus log ikut menghapus foto di Blob/lokal |
| `public/upload_barcode.php`, `scan.php` | `src/routes/web.js` (`/scan`) + `views/scan.ejs` | Memakai helper bersama `processPackageScan` |
| `public/api/upload_cam.php` | `src/routes/api.js` (`POST /api/upload-cam`) + `src/lib/validation.js` | Cek `x-api-key`, decode `sharp` + `zbar-wasm`, wajib cek `status === 'valid'` |
| `public/manual_open.php`, `cek_manual.php`, `reset_manual.php` | `src/routes/api.js` (`/api/manual-open`, `/api/cek-manual`, `/api/reset-manual`) | Terhubung ke dashboard & polling ESP32-CAM |
| `public/#include esp_camera.h.txt` | `firmware/esp32_cam/esp32_cam.ino` + `secrets.example.h` | Dipindah keluar dari folder publik, HTTPS Vercel, polling manual di `loop()`, cek `"open_lock":true` |

---

## 2. Riwayat Eksekusi & Verifikasi

### Sudah Dikerjakan
1. Inisialisasi proyek Node.js (`package.json`) dengan `express`, `ejs`, `multer` (v2), `pg`, `@vercel/blob`, `sharp`, `@undecaf/zbar-wasm`, dan `dotenv`.
2. Penyusunan skema database PostgreSQL lengkap di `schema.sql` (termasuk tabel `kontrol_pintu` dan seed `id = 1`).
3. Implementasi layer modular:
   - `src/db/index.js` (PostgreSQL pool)
   - `src/lib/barcode.js` (`sharp` + `@undecaf/zbar-wasm`)
   - `src/lib/storage.js` (Vercel Blob + fallback lokal)
   - `src/lib/validation.js` (logika validasi tunggal untuk API & halaman scan)
   - `src/routes/api.js` & `src/routes/web.js`
   - Seluruh template EJS di `views/` dan styling di `public/css/style.css`
   - Firmware HTTPS ESP32-CAM di `firmware/esp32_cam/`
   - Dokumentasi setup di `README.md` & konfigurasi deployment di `vercel.json` (termasuk bundling `zbar.wasm`).

### Hasil Verifikasi Teknis
- `npm run check` (`node --check` pada `api/index.js`, `server.js`, `src/app.js`) & `require('./api/index.js')`: **lolos**.
- `node --check` seluruh file di `src/`: **lolos**.
- Render test seluruh 6 template EJS dengan data simulasi: **lolos**.
- Uji decode barcode `src/lib/barcode.js` menggunakan foto asli dari repositori lama (`cam_20260522_184409_998.jpg`): **berhasil membaca `JX7733615817`**.

---

## 3. Rencana & Backlog Langkah Berikutnya (Belum Dikerjakan)

1. **Setup Database & Environment**:
   - Buat database PostgreSQL di Neon / Supabase dan jalankan `schema.sql`.
   - Isi `.env` untuk uji lokal (`npm run dev`) serta Environment Variables di dashboard Vercel.
2. **Deploy & Uji Endpoint di Vercel**:
   - Aktifkan Vercel Blob Storage, deploy proyek, lalu uji `/api/upload-cam` (pastikan `zbar.wasm` termuat baik di fungsi serverless) dan `/api/cek-manual`.
3. **Uji End-to-End ESP32-CAM**:
   - Salin `secrets.example.h` menjadi `secrets.h`, isi kredensial WiFi & URL `.vercel.app`, lalu upload sketch ke board AI Thinker ESP32-CAM.
4. **Peningkatan Keamanan Lanjutan (Opsional)**:
   - Tambahkan autentikasi login admin (misalnya `express-session` + password hash atau Basic Auth middleware) untuk melindungi dashboard `/`, `/resi`, `/log`, dan `/manual-open`.
   - Tambahkan proteksi CSRF jika dashboard dibuka untuk publik.
   - Tambahkan OCR fallback berbasis API cloud jika dibutuhkan untuk paket dengan barcode rusak/buram.

