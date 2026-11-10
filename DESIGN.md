# DESIGN.md - Smart Drop Locker

## Design Read
Reading this as: IoT parcel locker operations console for locker owners and admins monitoring ESP32-CAM barcode drops, in a **Locker Hardware Console** visual language, dial **ENERGY 1 / RHYTHM 2 / MOTION 2**.

## Identity & Purpose Decisions (R-31)
- **Visual Direction**: Locker Hardware Console. Terinspirasi panel kontrol perangkat keras dan instrumen logistik: permukaan matte solid bertingkat dengan border 1px tegas, tanpa gradien ungu/neon, tanpa blur kaca, dan tanpa bayangan mengambang.
- **Theme (R-21, R-34)**: Default gelap (`dark`) untuk kenyamanan pemantauan panel hardware dalam kondisi cahaya rendah, disertai toggle **Terang / Gelap (`light` / `dark`)** yang fungsional, tersimpan di `localStorage`, dan terverifikasi kontras WCAG AA di kedua mode.
- **Color Palette (R-29)**:
  - **Dark Mode**:
    - `--bg`: `#11100D` (charcoal hangat dasar, selaras dengan warna emas logo `#D89A2A`)
    - `--surface`: `#181612` (panel konten utama)
    - `--surface-raised`: `#221F19` (hover baris dan permukaan kontrol sekunder)
    - `--border`: `#332F28` (batas struktur 1px)
    - `--border-strong`: `#756E63` (batas kontrol interaktif, rasio >= 3.5:1 terhadap permukaan)
    - `--text`: `#F5F3EE` (teks utama)
    - `--text-muted`: `#B5AEA2` (teks sekunder)
    - `--accent`: `#D89A2A` (warna persis dari logo `logo-sdl.png`, teks `#11100D` di atas tombol aksen)
    - Status semantik: `--ok: #4ADE80` (`--ok-bg: #14261C`), `--danger: #F87171` (`--danger-bg: #2A1517`)
  - **Light Mode**:
    - `--bg`: `#F7F4EE` (kertas hangat terang)
    - `--surface`: `#FFFFFF` (panel konten)
    - `--surface-raised`: `#EDE8DF` (hover baris dan kontrol sekunder)
    - `--border`: `#D9D2C5` (batas struktur 1px)
    - `--border-strong`: `#7D766B` (batas kontrol interaktif, rasio 4.49:1 terhadap `#FFFFFF`)
    - `--text`: `#14120E` (teks utama)
    - `--text-muted`: `#575148` (teks sekunder)
    - `--accent`: `#D89A2A` (tombol utama memakai warna persis logo dengan teks gelap `#14120E`), `--accent-ink`: `#8A5E0F` (tautan teks & ring fokus agar lolos >= 4.5:1 di atas putih)
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
- **Motion & Interactive Transitions (R-19, MOTION 2 - Material Design 3 Expressive Motion)**:
  - **M3 Spatial Spring & Emphasized Easing**: Menggunakan kurva pegas (`cubic-bezier(0.34, 1.45, 0.64, 1)`) dan kurva akselerasi M3 (`cubic-bezier(0.2, 0, 0, 1)`) untuk seluruh transisi interaksi agar terasa responsif dan taktil tanpa loop berulang.
  - **Directional Shared-Axis Soft Navigation**: Perpindahan antar halaman menghitung arah urutan tab (`maju` / `mundur`) lalu menjalankan transisi geser terarah dan cascade bertahap (`stagger`) pada panel dan baris tabel, disertai bilah progres tipis di tepi atas.
  - **M3 State-Layer Ripple & Tactile Morph**: Tombol dan tautan navigasi memancarkan efek riak dari titik sentuh (`pointerdown`), dengan morph radius halus saat ditekan (`scale(0.97)` -> pegas kembali).
  - **Modal & Toast Spring**: Dialog modal dan toast notifikasi masuk dengan skala elastis halus (`scale(0.92)` -> `1`), dan seluruh animasi otomatis dimatikan saat `@media (prefers-reduced-motion: reduce)` aktif.
