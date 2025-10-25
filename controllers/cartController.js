// controllers/cartController.js
const Cart = require("../models/cartModel");
const Product = require("../models/productModel");
const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const offersModel = require("../models/offersModel");

exports.addToCart = asyncHandler(async (req, res, next) => {
  const { productId, quantity } = req.body;

  if (!productId || !quantity || quantity <= 0)
    return next(new ApiError("Product ID and valid quantity are required", 400));

  const product = await Product.findById(productId).populate("category");
  if (!product) return next(new ApiError("Product not found", 404));

  let cart = await Cart.findOne({ user: req.user._id });
  if (!cart)
    cart = await Cart.create({ user: req.user._id, items: [], totalPrice: 0 });

  const existingItem = cart.items.find(
    (item) => item.product.toString() === productId
  );

  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cart.items.push({ product: productId, quantity });
  }

  cart.totalPrice = await calculateTotal(cart.items);
  cart.finalPrice = cart.totalPrice - (cart.discount || 0);

  await cart.save();

  res.status(200).json({
    status: true,
    message: "Item added to cart",
    data: {
      product, // ✅ المنتج بالكامل
      quantity,
    },
  });
});


//const Offer = require("../models/offersModel");

// 🛒 Get Cart with active offers
exports.getCart = asyncHandler(async (req, res, next) => {
  const cart = await Cart.findOne({ user: req.user._id })
    .populate({
      path: "items.product",
      populate: {path: "category"}
          });


  if (!cart || cart.items.length === 0) {
    return next(new ApiError("Cart is empty", 404));
  }

  // تحديث أسعار المنتجات حسب العروض
  for (const item of cart.items) {
    const product = item.product;

    const offer = await offersModel.findOne({
      isActive: true,
      expiresAt: { $gt: new Date() },
      $or: [
        { products: product._id },
        { category: product.category._id }
      ]
    });

    // السعر بعد الخصم
    item.price = product.price;
    if (offer) {
      item.price = offer.discountType === "percentage"
        ? product.price - (product.price * offer.discountValue / 100)
        : product.price - offer.discountValue;
      item.appliedOffer = offer; // optional, لو عايز تبعت بيانات العرض
    }
  }

  // إعادة حساب الكارت
  cart.totalPrice = cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  cart.finalPrice = cart.totalPrice - (cart.discount || 0);

  res.status(200).json({ data: cart });
});

// 🛒 Remove Item
exports.removeFromCart = asyncHandler(async (req, res, next) => {
  const { productId } = req.body;
  if (!productId) return next(new ApiError("Product ID is required", 400));

  const cart = await Cart.findOne({ user: req.user._id }).populate("items.product");
  if (!cart) return next(new ApiError("Cart not found", 404));

  const item = cart.items.find((i) => i.product._id.toString() === productId);
  if (!item) return next(new ApiError("Item not found in cart", 404));

  cart.items = cart.items.filter((i) => i.product._id.toString() !== productId);

  cart.totalPrice = await calculateTotal(cart.items);
  cart.finalPrice = cart.totalPrice - (cart.discount || 0);

  await cart.save();

  res.status(200).json({
    status: true,
    message: "Item removed from cart",
  });
});

// Helper function لحساب الإجمالي
async function calculateTotal(items) {
  let total = 0;
  for (const item of items) {
    const product = await Product.findById(item.product);
    if (product) total += product.price * item.quantity;
  }
  return total;
}
