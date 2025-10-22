const Category = require("../models/categoryModel");
const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');
const fs = require('fs');


const {uploadSingleImage} = require('../midlewares/uploadImageMiddleWare')

// Upload single image
exports.uploadCategoryImage = uploadSingleImage('image');

// Image processing
exports.resizeImage = asyncHandler(async (req, res, next) => {
  const filename = `category-${uuidv4()}-${Date.now()}.jpeg`;

  if (req.file) {

  const path = "uploads/categories/";
        if (!fs.existsSync(path)) {
            fs.mkdirSync(path, { recursive: true });
        }

    await sharp(req.file.buffer)
      .toFormat('jpeg')
      .jpeg({ quality: 100 })
      .toFile(`uploads/categories/${filename}`);

    // Save image into our db
    req.body.image = filename;
  }

  next();
});

exports.getCategories = asyncHandler(async (req, res, next) => {
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 6;
  const skip = (page - 1) * limit;

  // فلترة البحث
  const searchQuery = req.query.search ? {
    name: { $regex: req.query.search, $options: "i" }
  } : {};

  // فلترة النوع
  const typeQuery = req.query.type ? { type: req.query.type } : {};

  // دمج الفلاتر
  const filter = { ...searchQuery, ...typeQuery };

  // هنا بقى بنجيب الكاتجوري ومعاها الساب كاتجوري
  const categories = await Category.find(filter)
    .skip(skip)
    .limit(limit)
   .lean({ virtuals: true }); // علشان نقدر نضيف subCategories يدوي

  // نجيب كل الـ subCategories اللي ليها علاقة بالكاتجوري دي
  const categoryIds = categories.map(cat => cat._id);
  const subCategories = await require("../models/subCategoryModel")
    .find({ category: { $in: categoryIds } })
    .select("name image category");

  // نربط كل كاتجوري بالساب كاتجوريز بتاعتها
  const categoriesWithSubs = categories.map(cat => {
    const relatedSubs = subCategories.filter(sub => sub.category.toString() === cat._id.toString());
    return { ...cat, subCategories: relatedSubs };
  });

  res.status(200).json({
    results: categoriesWithSubs.length,
    page,
    data: categoriesWithSubs
  });
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
