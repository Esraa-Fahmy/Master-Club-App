const Offer = require("../models/offersModel");
const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const { v4: uuidv4 } = require("uuid");
const sharp = require("sharp");
const { uploadMixOfImages } = require("../midlewares/uploadImageMiddleWare");
const fs = require("fs");

// ✅ Upload images
exports.uploadOffersImages = uploadMixOfImages([{ name: "images", maxCount: 5 }]);

// ✅ Resize images
exports.resizeOfferImages = asyncHandler(async (req, res, next) => {
  if (req.files.images) {
    req.body.images = [];
    await Promise.all(
      req.files.images.map(async (img, index) => {
        const imageName = `Offer-${uuidv4()}-${Date.now()}-${index + 1}.jpeg`;
        const dir = "uploads/offers/";
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        await sharp(img.buffer)
          .toFormat("jpeg")
          .jpeg({ quality: 90 })
          .toFile(`${dir}${imageName}`);

        req.body.images.push(imageName);
      })
    );
  }
  next();
});
// ✅ إنشاء عرض
exports.createOffer = asyncHandler(async (req, res) => {
  const offer = await Offer.create(req.body);
  res.status(201).json({ data: offer });
});

// ✅ الحصول على العروض الفعالة
exports.getActiveOffers = asyncHandler(async (req, res) => {
  const offers = await Offer.find({ isActive: true, expiresAt: { $gt: new Date() } })
    .populate("category")
    .populate("products");
  res.status(200).json({ results: offers.length, data: offers });
});

exports.updateOffer = asyncHandler(async (req, res, next) => {
  const offer = await Offer.findById(req.params.id);
  if (!offer) return next(new ApiError("العرض غير موجود", 404));

  // تحديث الحقول
  Object.assign(offer, req.body);

  await offer.save();

  res.status(200).json({
    status: "success",
    data: offer,
  });
});



// ✅ حذف عرض
exports.deleteOffer = asyncHandler(async (req, res, next) => {
  const offer = await Offer.findByIdAndDelete(req.params.id);
  if (!offer) return next(new ApiError("العرض غير موجود", 404));
  res.status(204).send();
});
