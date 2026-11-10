# DESIGN.md - Smart Drop Locker

## Design Read
Reading this as: IoT parcel locker operations console for locker owners and admins monitoring ESP32-CAM barcode drops, in a **Locker Hardware Console** visual language, dial **ENERGY 1 / RHYTHM 2 / MOTION 1**.

## Identity & Purpose Decisions (R-31)
- **Visual Direction**: Locker Hardware Console. Terinspirasi panel kontrol perangkat keras dan instrumen logistik: permukaan matte solid bertingkat dengan border 1px tegas, tanpa gradien ungu/neon, tanpa blur kaca, dan tanpa bayangan mengambang.
- **Theme (R-21, R-34)**: Default gelap (`dark`) untuk kenyamanan pemantauan panel hardware dalam kondisi cahaya rendah, disertai toggle **Terang / Gelap (`light` / `dark`)** yang fungsional, tersimpan di `localStorage`, dan terverifikasi kontras WCAG AA di kedua mode.
- **Color Palette (R-29)**:
  - **Dark Mode**:
    - `--bg`: `#0F1115` (chassis matte dasar)
    - `--surface`: `#161920` (panel konten utama)
    - `--surface-raised`: `#1D212B` (hover baris dan permukaan kontrol sekunder)
    - `--border`: `#2E3440` (batas struktur 1px)
    - `--border-strong`: `#6E788C` (batas kontrol interaktif, rasio >= 3.6:1 terhadap permukaan)
    - `--text`: `#F3F4F6` (teks utama)
    - `--text-muted`: `#A8B0BE` (teks sekunder)
    - `--accent`: `#E5A93B` (amber keselamatan industri, teks `#14171C` di atas tombol aksen)
    - Status semantik: `--ok: #4ADE80` (`--ok-bg: #14261C`), `--danger: #F87171` (`--danger-bg: #2A1517`)
  - **Light Mode**:
    - `--bg`: `#F3F4F1` (enamel terang hangat)
    - `--surface`: `#FFFFFF` (panel konten)
    - `--surface-raised`: `#EAECE6` (hover baris dan kontrol sekunder)
    - `--border`: `#D2D6CE` (batas struktur 1px)
    - `--border-strong`: `#78808C` (batas kontrol interaktif, rasio 3.99:1 terhadap `#FFFFFF`)
    - `--text`: `#14171C` (teks utama)
    - `--text-muted`: `#4E5663` (teks sekunder)
    - `--accent`: `#B45309` (amber gelap agar teks `#FFFFFF` di atasnya lolos >= 4.5:1)
    - Status semantik: `--ok: #15803D` (`--ok-bg: #ECFDF3`), `--danger: #B91C1C` (`--danger-bg: #FEF2F2`)
- **Typography (R-06)**:
  - `IBM Plex Sans`: tipografi utama untuk UI, navigasi, dan label operasional karena netral, presisi, dan mudah dibaca pada kepadatan tabel/form.
  - `IBM Plex Mono` (`font-variant-numeric: tabular-nums`): khusus untuk nomor resi, timestamp, dan kode status perangkat agar kolom angka sejajar.
- **Radius & Elevation (R-11, R-12)**:
  - Panel & modal: `6px`
  - Tombol, input, badge status, thumbnail foto: `4px`
  - Shadow pada kartu ditiadakan; hierarki dibentuk oleh perbedaan luminance permukaan dan border 1px.
- **Identity Motif**:
  - Garis aksen atas 3px (`--accent`) khusus pada panel **Kontrol Pintu Loker** sebagai titik fokus utama, dipadukan dengan readout telemetri tabular.
- **Layout & Rhythm (R-05, RHYTHM 2)**:
  - Top navigation bar tunggal yang ringkas dengan menu responsif berlabel (`Menu`) di layar sempit.
  - Dashboard disusun berdasarkan keputusan pengguna (bukan 3 kartu statistik identik): panel fokus kontrol pintu berdampingan dengan ringkasan telemetri vertikal di atas, diikuti tabel log terbaru di bawahnya.
