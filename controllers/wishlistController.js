// controllers/wishlistController.js
const asyncHandler = require("express-async-handler");
const Wishlist = require("../models/wishistModel");
const ApiError = require("../utils/apiError");

// ➕ إضافة عنصر للويش ليست
// controllers/wishlistController.js

const Product = require("../models/productModel");

// ➕ إضافة عنصر للويش ليست
exports.addToWishlist = asyncHandler(async (req, res, next) => {
  const { itemId, itemType } = req.body;

  if (!itemId || !itemType) {
    return next(new ApiError("Item ID and itemType are required", 400));
  }

  // ✅ تحقق أن المنتج موجود قبل إضافته
  if (itemType === "Product") {
    const product = await Product.findById(itemId);
    if (!product) return next(new ApiError("Product not found", 404));
  }

  const exists = await Wishlist.findOne({
    user: req.user._id,
    item: itemId,
    itemType,
  });

  if (exists) {
    return next(new ApiError("Item already in wishlist", 400));
  }

  const wishlist = await Wishlist.create({
    user: req.user._id,
    item: itemId,
    itemType,
  });

  res.status(201).json({ message: "Added to wishlist", data: wishlist });
});

// 📜 عرض الويش ليست الخاصة باليوزر
exports.getMyWishlist = asyncHandler(async (req, res, next) => {
  const wishlist = await Wishlist.find({ user: req.user._id }).populate("item");

  if (!wishlist || wishlist.length === 0) {
    return next(new ApiError("Wishlist is empty", 404));
  }

  res.status(200).json({ results: wishlist.length, data: wishlist });
});


// ❌ حذف عنصر من الويش ليست
exports.removeFromWishlist = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const wishlistItem = await Wishlist.findOneAndDelete({
    _id: id,
    user: req.user._id,
  });

  if (!wishlistItem) {
    return next(new ApiError("Item not found in wishlist", 404));
  }

  res.status(200).json({ message: "Removed from wishlist" });
});



// حذف كل عناصر الويش ليست لليوزر الحالي
exports.clearWishlist = asyncHandler(async (req, res) => {
  await Wishlist.deleteMany({ user: req.user._id });

  res.status(200).json({ message: "All items removed from wishlist" });
});
