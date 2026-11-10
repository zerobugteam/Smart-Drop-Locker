# 01 — Analisis Proyek Lama (`smart-drop-point`)

## Konteks Awal
Analisis dilakukan terhadap repositori PHP Native di `D:\Projects\ZeroBug\smart-drop-point` (Tugas Akhir: *Smart Pickup/Drop Point IoT*).

### Arsitektur Sistem Asal
- **Backend**: PHP Native (`mysqli`) di XAMPP lokal.
- **Database**: MySQL (`smart_drop_point`) dengan 3 tabel yang digunakan di kode:
  - `resi` (`id`, `nomor_resi`, `nama_paket`, `status` ENUM `'valid'`/`'invalid'`, `created_at`)
  - `log_akses` (`id`, `nomor_resi`, `status` ENUM `'berhasil'`/`'gagal'`, `pesan`, `foto_path`, `created_at`)
  - `kontrol_pintu` (`id`, `status` `'BUKA'`/`'TUTUP'`) — dipakai oleh `manual_open.php`, `cek_manual.php`, dan `reset_manual.php`, namun belum terdokumentasi di `README.md` lama.
- **Frontend**: Bootstrap 5 + Bootstrap Icons dengan CSS dark glassmorphism (`assets/style.css`) dan template `partials/` (`header.php`, `sidebar.php`, `footer.php`).
- **Pembacaan Barcode & OCR**: `zbarimg.exe` (`CODE-128`) dan fallback `tesseract.exe` via `shell_exec` Windows.
- **Hardware**: ESP32-CAM (AI Thinker) dengan sketsa di `public/#include esp_camera.h.txt`.

---

## Temuan Bug Kritis pada Proyek Asal

1. **Artefak Markdown di `public/api/upload_cam.php`**
   - Terdapat teks ````php` di baris pertama dan ```` di akhir file di luar tag PHP. Jika `output_buffering` mati, output langsung korup sebelum `header("Content-Type: application/json")`.
   - *(Catatan: bug ini sempat diperbaiki langsung di `smart-drop-point/public/api/upload_cam.php` dan lolos `php -l` sebelum proses migrasi penuh ke Express).*
2. **Mismatch Kontrak Respons ESP32-CAM vs API**
   - Firmware ESP32-CAM mengecek `response.indexOf("VALID") >= 0` (uppercase, berasal dari skrip lama `upload.php`).
   - Padahal `upload_cam.php` mengirim JSON lowercase (`"pesan":"Resi valid, akses dibuka."`, `"open_lock":true`), sehingga solenoid tidak pernah terbuka.
3. **Status Resi (`valid` / `invalid`) Tidak Dicek Saat Validasi**
   - Query validasi hanya menjalankan `SELECT ... FROM resi WHERE nomor_resi = ? LIMIT 1` tanpa memeriksa `status = 'valid'`. Resi yang di-toggle `invalid` tetap membuka akses.
4. **HTML Rusak pada `public/log.php`**
   - Tag `<form>` dan `<div class="card-glass p-4 mb-3">` tidak ditutup serta tidak memiliki tombol submit filter.
5. **Kontrol Pintu Manual Tidak Terhubung End-to-End**
   - `manual_open.php` hanya mencetak `"OK"` tanpa redirect ke dashboard.
   - `loop()` di firmware ESP32-CAM kosong, tidak melakukan polling ke `cek_manual.php` maupun memanggil `reset_manual.php`.
6. **Polusi Stderr pada OCR (`upload_cam.php`)**
   - Pemanggilan `tesseract ... stdout 2>&1` membuat pesan stderr (`Estimating resolution as ...`) ikut terbaca regex resi (tercatat di `debug.txt` terbaca sebagai `ESTIMATING`).

---

## Masalah Keamanan, Struktur & Maintainability
- Belum ada autentikasi dashboard maupun API key untuk endpoint ESP32-CAM.
- Mutasi data (`hapus_log.php`, `resi_toggle.php`, `manual_open.php`) memakai HTTP `GET`.
- Kredensial WiFi (`SSID`, `password`) dan IP lokal disimpan di file dalam folder `public/` (`#include esp_camera.h.txt`).
- URL aset dan redirect hardcoded ke `/smart-drop-point/...`, serta path binary `zbarimg.exe` dan `tesseract.exe` hardcoded ke path Windows.
- File testing, foto `uploads/`, dan `debug.txt` ikut ter-commit di Git, serta fitur edit & hapus resi yang tertulis di `README.md` belum tersedia di kode PHP.

