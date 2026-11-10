const { query } = require("../db");
const { decodeBarcodeFromBuffer } = require("./barcode");
const { savePhoto } = require("./storage");

/**
 * Proses foto paket: simpan bukti foto, decode barcode, cek resi berstatus 'valid',
 * dan catat hasil ke tabel log_akses.
 */
async function processPackageScan(fileBuffer, originalName = "capture.jpg", prefix = "cam") {
  const rawExt = (originalName.split(".").pop() || "jpg").toLowerCase();
  const ext = ["jpg", "jpeg", "png"].includes(rawExt) ? rawExt : "jpg";

  const fotoPath = await savePhoto(fileBuffer, ext, prefix);
  const nomorResi = await decodeBarcodeFromBuffer(fileBuffer);

  let status = "gagal";
  let pesan = "Barcode tidak terbaca.";
  let openLock = false;

  if (nomorResi) {
    const res = await query(
      "SELECT status FROM resi WHERE nomor_resi = $1 LIMIT 1",
      [nomorResi]
    );

    if (res.rowCount === 0) {
      pesan = "Resi tidak terdaftar.";
    } else if (res.rows[0].status !== "valid") {
      pesan = "Resi berstatus invalid.";
    } else {
      status = "berhasil";
      pesan = "Resi valid, akses dibuka.";
      openLock = true;
    }
  }

  await query(
    "INSERT INTO log_akses (nomor_resi, status, pesan, foto_path) VALUES ($1, $2, $3, $4)",
    [nomorResi || "-", status, pesan, fotoPath]
  );

  return {
    resi: nomorResi,
    status,
    pesan,
    open_lock: openLock,
    foto_path: fotoPath,
  };
}

module.exports = {
  processPackageScan,
};

