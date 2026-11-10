-- Skema Database PostgreSQL (Neon / Supabase) untuk Smart Drop Locker

CREATE TABLE IF NOT EXISTS resi (
  id SERIAL PRIMARY KEY,
  nomor_resi VARCHAR(100) NOT NULL UNIQUE,
  nama_paket VARCHAR(255),
  status VARCHAR(16) NOT NULL DEFAULT 'valid' CHECK (status IN ('valid', 'invalid')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS log_akses (
  id SERIAL PRIMARY KEY,
  nomor_resi VARCHAR(100),
  status VARCHAR(16) NOT NULL CHECK (status IN ('berhasil', 'gagal')),
  pesan TEXT,
  foto_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS kontrol_pintu (
  id INTEGER PRIMARY KEY DEFAULT 1,
  status VARCHAR(16) NOT NULL DEFAULT 'TUTUP' CHECK (status IN ('BUKA', 'TUTUP')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Baris default untuk kontrol pintu manual (id = 1)
INSERT INTO kontrol_pintu (id, status)
VALUES (1, 'TUTUP')
ON CONFLICT (id) DO NOTHING;

-- Index untuk mempercepat pencarian dan statistik harian
CREATE INDEX IF NOT EXISTS idx_log_akses_created_at ON log_akses (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_log_akses_status ON log_akses (status);

