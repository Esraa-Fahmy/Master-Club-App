const asyncHandler = require("express-async-handler");
const Wishlist = require("../models/wishistModel");
const ApiError = require("../utils/apiError");
const Product = require("../models/productModel");

// ➕ Toggle Wishlist (Add / Remove)
exports.toggleWishlist = asyncHandler(async (req, res, next) => {
  const { productId } = req.body;
  if (!productId) return next(new ApiError("productId is required", 400));

  const product = await Product.findById(productId);
  if (!product) return next(new ApiError("Product not found", 404));

  const existing = await Wishlist.findOne({
    user: req.user._id,
    product: productId,
  });

  if (existing) {
    await Wishlist.deleteOne({ _id: existing._id });
    return res.status(200).json({
      message: "Removed from wishlist",
      isFavourite: false,
    });
  } else {
    await Wishlist.create({
      user: req.user._id,
      product: productId,
    });
    return res.status(201).json({
      message: "Added to wishlist",
      isFavourite: true,
    });
  }
});

// 📜 عرض الويش ليست الخاصة باليوزر
exports.getMyWishlist = asyncHandler(async (req, res, next) => {
  const wishlist = await Wishlist.find({ user: req.user._id }).populate("product");

  if (!wishlist || wishlist.length === 0) {
    return res.status(404).json({ message: "Wishlist is empty" });
  }

  res.status(200).json({ results: wishlist.length, data: wishlist });
});

// ❌ حذف كل عناصر الويش ليست
exports.clearWishlist = asyncHandler(async (req, res) => {
  await Wishlist.deleteMany({ user: req.user._id });
  res.status(200).json({ message: "All items removed from wishlist" });
});