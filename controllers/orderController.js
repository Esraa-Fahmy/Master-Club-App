const mongoose = require("mongoose");
const Order = require("../models/orderModel");
const Product = require("../models/productModel");
const Coupon = require("../models/promoCodeModel");
const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const cartModel = require("../models/cartModel");
const offersModel = require("../models/offersModel");


exports.createOrder = asyncHandler(async (req, res, next) => {
  const { shippingAddress, paymentMethod, couponCode } = req.body;

  if (!shippingAddress || !shippingAddress.label || !shippingAddress.details) {
    return next(new ApiError("عنوان الشحن مطلوب", 400));
  }
  if (!paymentMethod || !paymentMethod.type) {
    return next(new ApiError("طريقة الدفع مطلوبة", 400));
  }

  // جلب الكارت
  const cart = await cartModel.findOne({ user: req.user._id }).populate("items.product");
  if (!cart || cart.items.length === 0) {
    return next(new ApiError("الكارت فارغ", 400));
  }

  let totalPrice = 0;
  const orderItems = [];

  for (const item of cart.items) {
    const product = item.product;
    if (!product) continue;

    if (item.quantity <= 0) return next(new ApiError("الكمية يجب أن تكون أكبر من صفر", 400));
    if (product.stock < item.quantity) return next(new ApiError(`الكمية غير متاحة للمنتج: ${product.name}`, 400));

    // ✅ جلب أي عرض نشط على المنتج أو الكاتجوري
    const offer = await offersModel.findOne({
      isActive: true,
      expiresAt: { $gt: new Date() },
      $or: [
        { products: product._id },
        { category: product.category._id }
      ]
    });

    // السعر بعد العرض
    let itemPrice = product.price;
    if (offer) {
      itemPrice = offer.discountType === "percentage"
        ? product.price - (product.price * offer.discountValue / 100)
        : product.price - offer.discountValue;
    }

    totalPrice += itemPrice * item.quantity;

    orderItems.push({
      product: product._id,
      quantity: item.quantity,
      price: itemPrice,
      appliedOffer: offer || null // optional
    });

    // خصم المخزون
    product.stock -= item.quantity;
    await product.save();
  }

  // التعامل مع الكوبون بعد الخصم من العروض
  let discount = 0;
  if (couponCode) {
    const coupon = await Coupon.findOne({ code: couponCode, isActive: true });
    if (!coupon) return next(new ApiError("الكوبون غير موجود", 400));
    if (coupon.expiresAt < new Date()) return next(new ApiError("الكوبون منتهي الصلاحية", 400));

    discount = coupon.discountType === "percentage"
      ? (totalPrice * coupon.discountValue) / 100
      : coupon.discountValue;
  }

  const finalPrice = totalPrice - discount;
  if (finalPrice < 0) return next(new ApiError("الخصم أكبر من السعر", 400));

  // إنشاء الأوردر
  const order = await Order.create({
    user: req.user._id,
    items: orderItems,
    shippingAddress,
    paymentMethod,
    totalPrice,
    discount,
    finalPrice,
  });

  // مسح الكارت بعد إنشاء الأوردر
  cart.items = [];
  cart.totalPrice = 0;
  cart.discount = 0;
  cart.finalPrice = 0;
  await cart.save();

  res.status(201).json({ status: "success", data: order });
});


// ✅ جلب أوردرات المستخدم
exports.getUserOrders = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = { user: req.user._id };
  if (status) filter.status = status;

  const orders = await Order.find(filter)
    .populate("items.product", "name price coverImage")
    .sort("-createdAt");

  res.status(200).json({ results: orders.length, data: orders });
});

// ✅ تحديث حالة الأوردر (للأدمن)
exports.updateOrderStatus = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id);
  if (!order) return next(new ApiError("الطلب غير موجود", 404));

  order.status = req.body.status;

  if (req.body.status === "delivered") order.deliveredAt = new Date();
  if (req.body.status === "cancelled") order.cancelledAt = new Date();
  if (req.body.status === "completed") order.completedAt = new Date();

  await order.save();
  res.status(200).json({ data: order });
});
