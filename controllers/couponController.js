const Coupon = require("../models/promoCodeModel");
const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");

// ✅ إنشاء كوبون
exports.createCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.create(req.body);
  res.status(201).json({ data: coupon });
});

// ✅ التحقق من الكوبون
exports.validateCoupon = asyncHandler(async (req, res, next) => {
  const { code } = req.body;
  const coupon = await Coupon.findOne({ code, isActive: true });

  if (!coupon) return next(new ApiError("الكوبون غير صالح", 400));

  if (coupon.expiresAt < new Date()) {
    return next(new ApiError("الكوبون منتهي", 400));
  }

  res.status(200).json({ data: coupon });
});

// ✅ حذف كوبون
exports.deleteCoupon = asyncHandler(async (req, res, next) => {
  const coupon = await Coupon.findByIdAndDelete(req.params.id);
  if (!coupon) return next(new ApiError("الكوبون غير موجود", 404));
  res.status(204).send();
});
