const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const { put, del } = require("@vercel/blob");

const LOCAL_UPLOAD_DIR = path.join(__dirname, "..", "..", "public", "uploads");

function hasBlobToken() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN && process.env.BLOB_READ_WRITE_TOKEN.trim());
}

/**
 * Simpan buffer foto bukti ke Vercel Blob (production) atau public/uploads/ (dev lokal).
 */
async function savePhoto(buffer, ext = "jpg", prefix = "cam") {
  const safeExt = ["jpg", "jpeg", "png"].includes(ext.toLowerCase())
    ? ext.toLowerCase()
    : "jpg";
  const stamp = new Date().toISOString().replace(/[-:T.]/g, "").slice(0, 14);
  const rand = crypto.randomBytes(3).toString("hex");
  const filename = `${prefix}_${stamp}_${rand}.${safeExt}`;

  if (hasBlobToken()) {
    const contentType = safeExt === "png" ? "image/png" : "image/jpeg";
    const blob = await put(`drop-point/${filename}`, buffer, {
      access: "public",
      contentType,
    });
    return blob.url;
  }

  if (process.env.VERCEL) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN belum diatur di Vercel. Aktifkan Vercel Blob Storage pada proyek."
    );
  }

  await fs.mkdir(LOCAL_UPLOAD_DIR, { recursive: true });
  const targetPath = path.join(LOCAL_UPLOAD_DIR, filename);
  await fs.writeFile(targetPath, buffer);
  return `/uploads/${filename}`;
}

/**
 * Hapus foto dari Vercel Blob atau folder lokal saat log dihapus.
 */
async function deletePhoto(fotoPath) {
  if (!fotoPath) return;

  if (fotoPath.startsWith("http://") || fotoPath.startsWith("https://")) {
    if (hasBlobToken()) {
      await del(fotoPath).catch(() => {});
    }
    return;
  }

  if (fotoPath.startsWith("/uploads/")) {
    const filename = path.basename(fotoPath);
    const fullPath = path.resolve(LOCAL_UPLOAD_DIR, filename);
    if (fullPath.startsWith(path.resolve(LOCAL_UPLOAD_DIR))) {
      await fs.unlink(fullPath).catch(() => {});
    }
  }
}

module.exports = {
  savePhoto,
  deletePhoto,
};

