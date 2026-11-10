# 02 — Keputusan Arsitektur & Penamaan Proyek

## 1. Evaluasi Pilihan Framework JS untuk Vercel

Selama diskusi, dua kandidat utama yang dievaluasi adalah **Next.js (App Router + TypeScript)** dan **Express.js**:

| Kriteria | Express + EJS + Bootstrap 5 *(Dipilih)* | Next.js (App Router + TypeScript) |
| :--- | :--- | :--- |
| **Kecepatan Migrasi UI Lama** | Sangat cepat; HTML/Bootstrap dari PHP tinggal dikonversi ke `.ejs` | Perlu menulis ulang seluruh tampilan ke React/JSX |
| **Kurva Belajar & Keterbacaan** | Sederhana (`req`, `res`, `multer`, router standar) | Lebih kompleks (Server/Client Components, Server Actions) |
| **Dukungan Vercel** | Berjalan via Serverless Function (`api/index.js` + `vercel.json`) | Native *zero-config* di Vercel |
| **Portabilitas ke Server Lain** | Sangat mudah dipindah ke VPS/Railway/Docker (`app.listen`) | Bisa, tetapi paling optimal di Vercel |

### Keputusan Final Stack
- **Framework Web & API**: **Express.js + EJS + Bootstrap 5** (Opsi A — mempertahankan tema dark glassmorphism lama sekaligus mempercepat migrasi).
- **Database Cloud**: **PostgreSQL (Neon / Supabase)** menggunakan driver `pg`.
- **Storage Foto Bukti**: **Vercel Blob** (`@vercel/blob`) untuk environment produksi Vercel, dengan fallback otomatis ke folder lokal `public/uploads/` saat dijalankan di laptop tanpa token Blob.
- **Barcode Decoder Serverless**: `sharp` + `@undecaf/zbar-wasm` (mendukung `CODE-128` dan `QR-Code` tanpa bergantung pada `.exe` Windows/Linux).
- **Lokasi Proyek Baru**: `D:\Projects\ZeroBug\smart-drop-locker` (terpisah dari proyek PHP lama agar proyek asal tetap aman).

---

## 2. Penyesuaian Teknis Agar Jalan di Vercel Serverless

1. **Stateless Handler (`api/index.js`) & `vercel.json`**
   - Vercel tidak menjalankan proses `app.listen()` jangka panjang; `api/index.js` mengekspor instance Express `app`, sedangkan `server.js` dipakai khusus untuk development lokal (`npm run dev`).
   - `vercel.json` mengarahkan semua route ke `/api/index.js` dan membundel `views/**` serta `node_modules/@undecaf/zbar-wasm/dist/zbar.wasm` melalui `includeFiles`.
2. **Upload Foto via Memory (`multer.memoryStorage()`)**
   - Filesystem Vercel bersifat *ephemeral/read-only*, sehingga `multer.diskStorage` tidak bisa dipakai. Buffer foto diterima di RAM lalu diunggah ke Vercel Blob.
3. **Koneksi Database Serverless**
   - Menggunakan singleton `Pool` pada `globalThis.__smartDropLockerPool` dengan konfigurasi SSL otomatis untuk URL database cloud.
4. **Komunikasi ESP32-CAM via HTTPS**
   - Domain `.vercel.app` mewajibkan HTTPS (port 443). Firmware ESP32-CAM diperbarui dari `WiFiClient` HTTP menjadi `WiFiClientSecure` + `HTTPClient` dengan header autentikasi `x-api-key`.

---

## 3. Rekomendasi Nama Proyek (Alternatif "Smart Drop Point")

Proyek sementara dinamai **Smart Drop Locker** (`smart-drop-locker`). Alternatif nama lain yang mendekati "Smart Drop Point":

- **Smart Drop Locker** — paling dekat bunyinya dengan "Smart Drop ...", langsung menjelaskan bentuk fisik loker.
- **Smart Parcel Point** — sangat dekat dengan "Drop Point", fokus pada paket.
- **Smart Pickup Point** — cocok jika loker digunakan untuk taruh & ambil paket (selaras dengan keterangan proyek lama).
- **Smart Drop Box** — singkat dan mudah diingat (gunakan spasi agar tidak rancu dengan merek *Dropbox*).
- **Smart Parcel Box** — istilah deskriptif yang umum pada riset/jurnal IoT.
- **DropPoint IoT** / **DropLocker IoT** — lebih ringkas dan modern untuk branding aplikasi.

