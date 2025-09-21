const Category = require("../models/categoryModel");
const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");

// GET /categories
exports.getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find();
  res.status(200).json({ results: categories.length, data: categories });
});

exports.getCategory = asyncHandler(async (req, res, next) => {
  const cat = await Category.findById(req.params.id);
  if (!cat) return next(new ApiError("Category not found", 404));
  res.status(200).json({ data: cat });
});

exports.createCategory = asyncHandler(async (req, res) => {
  const cat = await Category.create(req.body);
  res.status(201).json({ data: cat });
});

exports.updateCategory = asyncHandler(async (req, res, next) => {
  const cat = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!cat) return next(new ApiError("Category not found", 404));
  res.status(200).json({ data: cat });
});

exports.deleteCategory = asyncHandler(async (req, res, next) => {
  const cat = await Category.findByIdAndDelete(req.params.id);
  if (!cat) return next(new ApiError("Category not found", 404));
  res.status(204).send();
});
