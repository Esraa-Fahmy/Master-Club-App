// controllers/cartController.js
const Cart = require("../models/cartModel");
const Product = require("../models/productModel");
const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");

// 🛒 Add to Cart
exports.addToCart = asyncHandler(async (req, res, next) => {
  const { productId, quantity } = req.body;

  if (!productId || !quantity || quantity <= 0) {
    return next(new ApiError("Product ID and valid quantity are required", 400));
  }

  const product = await Product.findById(productId);
  if (!product) return next(new ApiError("Product not found", 404));

  let cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    cart = await Cart.create({
      user: req.user._id,
      items: [],
      totalPrice: 0,
    });
  }

  const existingItem = cart.items.find(
    (item) => item.product.toString() === productId
  );

  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cart.items.push({ product: productId, quantity });
  }

  // تحديث السعر
  cart.totalPrice = await calculateTotal(cart.items);
  cart.finalPrice = cart.totalPrice - (cart.discount || 0);

  await cart.save();

  res.status(200).json({ message: "Item added to cart", data: cart });
});

// 🛒 Get Cart
exports.getCart = asyncHandler(async (req, res, next) => {
  const cart = await Cart.findOne({ user: req.user._id }).populate("items.product");

  if (!cart || cart.items.length === 0) {
    return next(new ApiError("Cart is empty", 404));
  }

  res.status(200).json({ data: cart });
});

// 🛒 Remove Item
exports.removeFromCart = asyncHandler(async (req, res, next) => {
  const { productId } = req.body;
  if (!productId) return next(new ApiError("Product ID is required", 400));

  const cart = await Cart.findOne({ user: req.user._id }).populate("items.product");
  if (!cart) return next(new ApiError("Cart not found", 404));

  const item = cart.items.find((i) => i.product && i.product._id.toString() === productId);
  if (!item) return next(new ApiError("Item not found in cart", 404));

  cart.items = cart.items.filter((i) => i.product._id.toString() !== productId);

  cart.totalPrice = await calculateTotal(cart.items);
  cart.finalPrice = cart.totalPrice - (cart.discount || 0);

  await cart.save();

  res.status(200).json({ message: "Item removed", data: cart });
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
