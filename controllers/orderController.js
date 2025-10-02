const mongoose = require("mongoose");
const Order = require("../models/orderModel");
const Product = require("../models/productModel");
const Coupon = require("../models/promoCodeModel");
const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");

// ✅ إنشاء أوردر
exports.createOrder = asyncHandler(async (req, res, next) => {
  const { items, shippingAddress, paymentMethod, couponCode } = req.body;

  // 1. التحقق من وجود بيانات أساسية
  if (!items || !Array.isArray(items) || items.length === 0) {
    return next(new ApiError("الطلب فارغ", 400));
  }
  if (!shippingAddress || !shippingAddress.label || !shippingAddress.details) {
    return next(new ApiError("عنوان الشحن مطلوب", 400));
  }
  if (!paymentMethod || !paymentMethod.type) {
    return next(new ApiError("طريقة الدفع مطلوبة", 400));
  }

  let totalPrice = 0;
  const orderItems = [];

  for (const it of items) {
    if (!mongoose.Types.ObjectId.isValid(it.product)) {
      return next(new ApiError(`معرف المنتج غير صالح: ${it.product}`, 400));
    }

    const product = await Product.findById(it.product);
    if (!product) return next(new ApiError("المنتج غير موجود", 404));

    if (it.quantity <= 0) {
      return next(new ApiError("الكمية يجب أن تكون أكبر من صفر", 400));
    }

    if (product.stock < it.quantity) {
      return next(new ApiError(`الكمية غير متاحة للمنتج: ${product.name}`, 400));
    }

    totalPrice += product.price * it.quantity;
    orderItems.push({
      product: product._id,
      quantity: it.quantity,
      price: product.price,
    });

    // خصم الكمية
    product.stock -= it.quantity;
    await product.save();
  }

  // 2. الكوبون
  let discount = 0;
  if (couponCode) {
    const coupon = await Coupon.findOne({ code: couponCode, isActive: true });
    if (!coupon) return next(new ApiError("الكوبون غير موجود", 400));
    if (coupon.expiresAt < new Date()) {
      return next(new ApiError("الكوبون منتهي الصلاحية", 400));
    }

    if (coupon.discountType === "percentage") {
      discount = (totalPrice * coupon.discountValue) / 100;
    } else {
      discount = coupon.discountValue;
    }
  }

  const finalPrice = totalPrice - discount;
  if (finalPrice < 0) return next(new ApiError("الخصم أكبر من السعر", 400));

  // 3. إنشاء الأوردر
  const order = await Order.create({
    user: req.user._id,
    items: orderItems,
    shippingAddress,
    paymentMethod,
    totalPrice,
    discount,
    finalPrice,
  });

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
