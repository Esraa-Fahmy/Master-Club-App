// controllers/productController.js
const Product = require("../models/productModel");
const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');
const { uploadMixOfImages } = require('../midlewares/uploadImageMiddleWare');
const fs = require('fs');
const offersModel = require("../models/offersModel");
const Wishlist = require("../models/wishistModel"); 
// ✅ Get All Products (مع فلترة)
const Cart = require("../models/cartModel");


// ====== Image Upload & Resize ======
exports.uploadProductImages = uploadMixOfImages([
  { name: 'coverImage', maxCount: 1 },
  { name: 'images', maxCount: 5 }
]);

exports.resizeProductImages = asyncHandler(async (req, res, next) => {
  if (req.files.coverImage) {
    const fileName = `product-${uuidv4()}-${Date.now()}-cover.jpeg`;
    const path = "uploads/products/";
    if (!fs.existsSync(path)) fs.mkdirSync(path, { recursive: true });

    await sharp(req.files.coverImage[0].buffer)
      .toFormat('jpeg')
      .jpeg({ quality: 95 })
      .toFile(`${path}${fileName}`);

    req.body.coverImage = fileName;
  }

  if (req.files.images) {
    req.body.images = [];
    const path = "uploads/products/";
    if (!fs.existsSync(path)) fs.mkdirSync(path, { recursive: true });

    await Promise.all(
      req.files.images.map(async (img, index) => {
        const fileName = `product-${uuidv4()}-${Date.now()}-${index + 1}.jpeg`;
        await sharp(img.buffer)
          .toFormat('jpeg')
          .jpeg({ quality: 90 })
          .toFile(`${path}${fileName}`);
        req.body.images.push(fileName);
      })
    );
  }

  const numericFields = ["price", "discountPrice", "quantity"];
  numericFields.forEach(field => {
    if (req.body[field]) req.body[field] = Number(req.body[field]);
  });

  if (req.body.isFeatured) req.body.isFeatured = req.body.isFeatured === 'true';
  if (req.body.membershipType) req.body.membershipType = req.body.membershipType.trim();

  next();
});

// ✅ Create Product
exports.createProduct = asyncHandler(async (req, res, next) => {
  const product = await Product.create(req.body);
  res.status(201).json({ data: product });
});


// ✅ Get All Products
exports.getProducts = asyncHandler(async (req, res) => {
  let filter = {};

  if (req.query.search) {
    filter.name = { $regex: req.query.search, $options: "i" };
  }

  if (req.query.membershipType) {
    filter.membershipType = req.query.membershipType;
  }

  if (req.query.category) {
    filter.category = req.query.category;
  }

  let query = Product.find(filter).populate("category");

  if (req.query.featured === "true") {
    query = query.where("isFeatured").equals(true);
  }

  if (req.query.latest === "true") {
    query = query.sort({ createdAt: -1 });
  }

  const products = await query;

  // 🟢 اجلب بيانات الويش ليست والسلة
  let favIds = [];
  let cartItems = [];

  if (req.user) {
    const favs = await Wishlist.find({ user: req.user._id }).select("product");
    favIds = favs.map(f => f.product.toString());

    const cart = await Cart.findOne({ user: req.user._id });
    if (cart) {
      cartItems = cart.items.map(i => ({
        productId: i.product.toString(),
        quantity: i.quantity,
      }));
    }
  }

  // 🟡 حوّل كل منتج إلى Object وأضف عليه القيم الإضافية
  const formattedProducts = products.map(p => {
    const productObj = p.toObject(); // ✅ يحول document إلى object عادي
    productObj.isFavourite = favIds.includes(p._id.toString());
    const cartItem = cartItems.find(i => i.productId === p._id.toString());
    productObj.cartQuantity = cartItem ? cartItem.quantity : 0;
    return productObj;
  });

  res.status(200).json({
    results: formattedProducts.length,
    data: formattedProducts,
  });
});

// ✅ Get Single Product
exports.getProduct = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id).populate("category");
  if (!product) return next(new ApiError("Product not found", 404));

  // ✅ العروض زي ما هي
  const offer = await offersModel.findOne({
    isActive: true,
    expiresAt: { $gt: new Date() },
    $or: [
      { products: product._id },
      { category: product.category._id }
    ]
  });

  let finalPrice = product.price;
  if (offer) {
    finalPrice = offer.discountType === "percentage"
      ? product.price - (product.price * offer.discountValue / 100)
      : product.price - offer.discountValue;
  }

  // 🟢 تحقق إذا المنتج مضاف في الويش ليست
  let isFavourite = false;
  let cartQuantity = 0;

  if (req.user) {
    const fav = await Wishlist.findOne({
      user: req.user._id,
      product: product._id,
    });
    if (fav) isFavourite = true;

    const cart = await Cart.findOne({ user: req.user._id });
    if (cart) {
      const item = cart.items.find(i => i.product.toString() === product._id.toString());
      if (item) cartQuantity = item.quantity;
    }
  }

  res.status(200).json({
    data: {
      ...product.toObject(),
      finalPrice,
      appliedOffer: offer || null,
      isFavourite, // ✅ تمت الإضافة
      cartQuantity, // ✅ تمت الإضافة
    }
  });
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