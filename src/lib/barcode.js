const sharp = require("sharp");
const { scanRGBABuffer } = require("@undecaf/zbar-wasm");

/**
 * Decode barcode (prioritas CODE-128 lalu QR-Code) dari buffer gambar JPEG/PNG.
 */
async function decodeBarcodeFromBuffer(imageBuffer) {
  const { data, info } = await sharp(imageBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const rgbaArrayBuffer = data.buffer.slice(
    data.byteOffset,
    data.byteOffset + data.byteLength
  );

  const symbols = await scanRGBABuffer(rgbaArrayBuffer, info.width, info.height);
  if (!symbols || symbols.length === 0) {
    return null;
  }

  const preferred =
    symbols.find((s) => s.typeName === "ZBAR_CODE128") ||
    symbols.find((s) => s.typeName === "ZBAR_QRCODE") ||
    symbols[0];

  const decoded = (preferred.decode() || "").trim();
  return decoded.length > 0 ? decoded : null;
}

module.exports = {
  decodeBarcodeFromBuffer,
};

