const express = require("express");
const multer = require("multer");
const { query } = require("../db");
const { processPackageScan } = require("../lib/validation");
const { deletePhoto } = require("../lib/storage");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Dashboard
router.get("/", async (req, res, next) => {
  try {
    const statsResi = await query(`
      SELECT
        COUNT(*)::int AS total_resi,
        COUNT(*) FILTER (WHERE status = 'valid')::int AS resi_valid,
        COUNT(*) FILTER (WHERE status = 'invalid')::int AS resi_invalid
      FROM resi
    `);

    const statsLog = await query(`
      SELECT
        COUNT(*)::int AS log_today,
        COUNT(*) FILTER (WHERE status = 'berhasil')::int AS log_ok,
        COUNT(*) FILTER (WHERE status = 'gagal')::int AS log_fail
      FROM log_akses
      WHERE (created_at AT TIME ZONE 'Asia/Jakarta')::date = (NOW() AT TIME ZONE 'Asia/Jakarta')::date
    `);

    const latest = await query(`
      SELECT id, nomor_resi, status, pesan, foto_path,
             TO_CHAR(created_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI:SS') AS created_at
      FROM log_akses
      ORDER BY created_at DESC
      LIMIT 8
    `);

    const doorRes = await query("SELECT status FROM kontrol_pintu WHERE id = 1 LIMIT 1");

    res.render("dashboard", {
      activePage: "dashboard",
      stats: {
        ...(statsResi.rows[0] || { total_resi: 0, resi_valid: 0, resi_invalid: 0 }),
        ...(statsLog.rows[0] || { log_today: 0, log_ok: 0, log_fail: 0 }),
      },
      doorStatus: doorRes.rows[0]?.status || "TUTUP",
      latest: latest.rows,
      isVercel: Boolean(process.env.VERCEL),
      manualMsg: req.query.manual === "ok" ? "Perintah buka pintu manual telah dikirim ke loker." : null,
    });
  } catch (err) {
    next(err);
  }
});

// Trigger buka pintu manual dari dashboard
router.post("/manual-open", async (req, res, next) => {
  try {
    await query(
      `INSERT INTO kontrol_pintu (id, status, updated_at)
       VALUES (1, 'BUKA', NOW())
       ON CONFLICT (id) DO UPDATE SET status = 'BUKA', updated_at = NOW()`
    );
    res.redirect("/?manual=ok");
  } catch (err) {
    next(err);
  }
});

// Data Resi
router.get("/resi", async (req, res, next) => {
  try {
    const q = (req.query.q || "").trim();
    let result;
    if (q) {
      result = await query(
        `SELECT id, nomor_resi, nama_paket, status,
                TO_CHAR(created_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI:SS') AS created_at
         FROM resi
         WHERE nomor_resi ILIKE $1 OR COALESCE(nama_paket, '') ILIKE $1
         ORDER BY created_at DESC
         LIMIT 200`,
        [`%${q}%`]
      );
    } else {
      result = await query(
        `SELECT id, nomor_resi, nama_paket, status,
                TO_CHAR(created_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI:SS') AS created_at
         FROM resi
         ORDER BY created_at DESC
         LIMIT 200`
      );
    }

    res.render("resi/index", {
      activePage: "resi",
      q,
      items: result.rows,
    });
  } catch (err) {
    next(err);
  }
});

// Form Tambah Resi
router.get("/resi/add", (req, res) => {
  res.render("resi/add", {
    activePage: "resi_add",
    err: null,
    ok: null,
  });
});

router.post("/resi/add", async (req, res) => {
  const nomor = (req.body.nomor_resi || "").trim();
  const nama = (req.body.nama_paket || "").trim();
  const status = req.body.status === "invalid" ? "invalid" : "valid";

  if (!nomor) {
    return res.render("resi/add", {
      activePage: "resi_add",
      err: "Nomor resi wajib diisi.",
      ok: null,
    });
  }

  try {
    await query(
      "INSERT INTO resi (nomor_resi, nama_paket, status) VALUES ($1, $2, $3)",
      [nomor, nama || null, status]
    );
    return res.render("resi/add", {
      activePage: "resi_add",
      err: null,
      ok: "Resi berhasil ditambahkan.",
    });
  } catch (err) {
    return res.render("resi/add", {
      activePage: "resi_add",
      err: "Gagal menambahkan resi. Mungkin nomor resi sudah terdaftar.",
      ok: null,
    });
  }
});

// Detail & Edit Resi
router.get("/resi/:id", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10) || 0;
    const result = await query(
      `SELECT id, nomor_resi, nama_paket, status,
              TO_CHAR(created_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI:SS') AS created_at
       FROM resi WHERE id = $1 LIMIT 1`,
      [id]
    );

    res.render("resi/detail", {
      activePage: "resi",
      data: result.rows[0] || null,
      msg: req.query.updated ? "Data resi berhasil diperbarui." : null,
      err: req.query.err ? "Gagal memperbarui resi." : null,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/resi/:id/edit", async (req, res) => {
  const id = parseInt(req.params.id, 10) || 0;
  const nomor = (req.body.nomor_resi || "").trim();
  const nama = (req.body.nama_paket || "").trim();
  const status = req.body.status === "invalid" ? "invalid" : "valid";

  if (!nomor) return res.redirect(`/resi/${id}?err=1`);

  try {
    await query(
      "UPDATE resi SET nomor_resi = $1, nama_paket = $2, status = $3 WHERE id = $4",
      [nomor, nama || null, status, id]
    );
    return res.redirect(`/resi/${id}?updated=1`);
  } catch (err) {
    return res.redirect(`/resi/${id}?err=1`);
  }
});

router.post("/resi/:id/toggle", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10) || 0;
    await query(
      `UPDATE resi
       SET status = CASE WHEN status = 'valid' THEN 'invalid' ELSE 'valid' END
       WHERE id = $1`,
      [id]
    );
    res.redirect("/resi");
  } catch (err) {
    next(err);
  }
});

router.post("/resi/:id/delete", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10) || 0;
    await query("DELETE FROM resi WHERE id = $1", [id]);
    res.redirect("/resi");
  } catch (err) {
    next(err);
  }
});

// Log Akses
router.get("/log", async (req, res, next) => {
  try {
    const q = (req.query.q || "").trim();
    const status = ["berhasil", "gagal"].includes(req.query.status) ? req.query.status : "";

    const conditions = [];
    const params = [];

    if (status) {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }
    if (q) {
      params.push(`%${q}%`);
      conditions.push(`nomor_resi ILIKE $${params.length}`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const logs = await query(
      `SELECT id, nomor_resi, status, pesan, foto_path,
              TO_CHAR(created_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI:SS') AS created_at
       FROM log_akses
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT 300`,
      params
    );

    res.render("log", {
      activePage: "log",
      q,
      status,
      logs: logs.rows,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/log/:id/delete", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10) || 0;
    const found = await query("SELECT foto_path FROM log_akses WHERE id = $1 LIMIT 1", [id]);
    if (found.rows[0]?.foto_path) {
      await deletePhoto(found.rows[0].foto_path);
    }
    await query("DELETE FROM log_akses WHERE id = $1", [id]);
    res.redirect("/log");
  } catch (err) {
    next(err);
  }
});

// Upload Foto Barcode Manual (pengganti upload_barcode.php)
router.get("/scan", (req, res) => {
  res.render("scan", {
    activePage: "scan",
    err: null,
  });
});

router.post("/scan", upload.single("foto"), async (req, res) => {
  try {
    if (!req.file) {
      return res.render("scan", {
        activePage: "scan",
        err: "Pilih file foto barcode terlebih dahulu.",
      });
    }

    await processPackageScan(req.file.buffer, req.file.originalname, "scan");
    return res.redirect("/log");
  } catch (err) {
    return res.render("scan", {
      activePage: "scan",
      err: err.message || "Gagal memproses foto barcode.",
    });
  }
});

module.exports = router;

