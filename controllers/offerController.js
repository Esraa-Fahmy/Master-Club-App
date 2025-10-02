const Offer = require("../models/offersModel");
const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");

// ✅ إنشاء عرض
exports.createOffer = asyncHandler(async (req, res) => {
  const offer = await Offer.create(req.body);
  res.status(201).json({ data: offer });
});

// ✅ الحصول على العروض الفعالة
exports.getActiveOffers = asyncHandler(async (req, res) => {
  const offers = await Offer.find({ isActive: true, expiresAt: { $gt: new Date() } })
    .populate("category", "name")
    .populate("products", "name price");
  res.status(200).json({ results: offers.length, data: offers });
});

// ✅ حذف عرض
exports.deleteOffer = asyncHandler(async (req, res, next) => {
  const offer = await Offer.findByIdAndDelete(req.params.id);
  if (!offer) return next(new ApiError("العرض غير موجود", 404));
  res.status(204).send();
});
