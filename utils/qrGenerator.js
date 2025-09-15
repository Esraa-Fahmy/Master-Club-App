// utils/qrGenerator.js
const QRCode = require("qrcode");

/**
 * generateQr(data)
 * - data: object OR string
 * - returns: dataURL string
 */
const generateQr = async (data) => {
  try {
    const payload = typeof data === "string" ? data : JSON.stringify(data);
    return await QRCode.toDataURL(payload);
  } catch (err) {
    throw new Error("QR generation failed: " + err.message);
  }
};

module.exports = generateQr;
