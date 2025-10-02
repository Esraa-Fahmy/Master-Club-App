const Product = require("../models/productModel");
const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");

// ✅ Create Product
exports.createProduct = asyncHandler(async (req, res) => {
  const product = await Product.create(req.body);
  res.status(201).json({ data: product });
});

// ✅ Get All Products (مع فلترة: featured, latest, vip, search, category)
exports.getProducts = asyncHandler(async (req, res) => {
  let filter = {};

  // فلترة بالبحث
  if (req.query.search) {
    filter.name = { $regex: req.query.search, $options: "i" };
  }

  // فلترة بالعضوية
  if (req.query.membershipType) {
    filter.membershipType = req.query.membershipType;
  }

  // فلترة بالكategory
  if (req.query.category) {
    filter.category = req.query.category;
  }

  let query = Product.find(filter).populate("category");

  // Featured
  if (req.query.featured) {
    query = query.where("isFeatured").equals(true);
  }

  // Latest (آخر المنتجات)
  if (req.query.latest) {
    query = query.sort({ createdAt: -1 });
  }

  const products = await query;

  res.status(200).json({
    results: products.length,
    data: products,
  });
});

// ✅ Get Single Product
exports.getProduct = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id).populate("category");
  if (!product) return next(new ApiError("Product not found", 404));
  res.status(200).json({ data: product });
});

// ✅ Update Product
exports.updateProduct = asyncHandler(async (req, res, next) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  if (!product) return next(new ApiError("Product not found", 404));
  res.status(200).json({ data: product });
});

// ✅ Delete Product
exports.deleteProduct = asyncHandler(async (req, res, next) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) return next(new ApiError("Product not found", 404));
  res.status(204).send();
});
