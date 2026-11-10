const express = require("express");
const multer = require("multer");
const { query } = require("../db");
const { processPackageScan } = require("../lib/validation");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

function checkEspApiKey(req, res, next) {
  const configuredKey = process.env.ESP32_API_KEY;
  if (!configuredKey) return next();

  const provided = req.header("x-api-key") || req.query.key;
  if (provided !== configuredKey) {
    return res.status(401).json({ ok: false, message: "Unauthorized" });
  }
  return next();
}

async function handleUploadCam(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, message: "File foto tidak ada" });
    }

    const result = await processPackageScan(req.file.buffer, req.file.originalname, "cam");
    return res.json({
      ok: true,
      ...result,
    });
  } catch (err) {
    console.error("upload-cam error:", err);
    return res.status(500).json({ ok: false, message: err.message || "Server error" });
  }
}

router.post("/upload-cam", checkEspApiKey, upload.single("foto"), handleUploadCam);
router.post("/upload_cam", checkEspApiKey, upload.single("foto"), handleUploadCam);

router.post("/manual-open", checkEspApiKey, async (req, res) => {
  try {
    await query(
      `INSERT INTO kontrol_pintu (id, status, updated_at)
       VALUES (1, 'BUKA', NOW())
       ON CONFLICT (id) DO UPDATE SET status = 'BUKA', updated_at = NOW()`
    );
    return res.json({ ok: true, status: "BUKA" });
  } catch (err) {
    console.error("manual-open error:", err);
    return res.status(500).json({ ok: false, message: err.message });
  }
});

router.get("/cek-manual", checkEspApiKey, async (req, res) => {
  try {
    const result = await query("SELECT status FROM kontrol_pintu WHERE id = 1 LIMIT 1");
    const status = result.rows[0]?.status || "TUTUP";
    return res.type("text/plain").send(status);
  } catch (err) {
    console.error("cek-manual error:", err);
    return res.status(500).type("text/plain").send("TUTUP");
  }
});

async function handleResetManual(req, res) {
  try {
    await query(
      `INSERT INTO kontrol_pintu (id, status, updated_at)
       VALUES (1, 'TUTUP', NOW())
       ON CONFLICT (id) DO UPDATE SET status = 'TUTUP', updated_at = NOW()`
    );
    return res.type("text/plain").send("RESET");
  } catch (err) {
    console.error("reset-manual error:", err);
    return res.status(500).type("text/plain").send("ERROR");
  }
}

router.post("/reset-manual", checkEspApiKey, handleResetManual);
router.get("/reset-manual", checkEspApiKey, handleResetManual);

module.exports = router;

