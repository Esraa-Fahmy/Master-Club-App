const User = require("../models/userModel");
const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const { v4: uuidv4 } = require("uuid");
const sharp = require("sharp");
const fs = require("fs");
const bcrypt = require("bcrypt");
const Order = require("../models/orderModel");
const { uploadSingleImage } = require("../midlewares/uploadImageMiddleWare");
const { createToken }= require("../utils/createToken");
const SubscriptionMemberShip = require("../models/SubscriptionMemberShip");

// 📸 Upload single image
exports.uploadUserImage = uploadSingleImage('profileImg');


exports.resizeImage = asyncHandler(async (req, res, next) => {
  const filename = `user-${uuidv4()}-${Date.now()}.jpeg`;

  if (req.file) {
    const path = "uploads/users/";
    if (!fs.existsSync(path)) {
      fs.mkdirSync(path, { recursive: true });
    }

    await sharp(req.file.buffer)
      .toFormat("jpeg")
      .jpeg({ quality: 100 })
      .toFile(`${path}${filename}`);

    // ✅ هنا هنستخدم الـ BASE_URL من .env
    const fullUrl = `${process.env.BASE_URL}/uploads/users/${filename}`;
    req.body.profileImg = fullUrl;
  }

  next();
});




// -------------------- Admin CRUD --------------------

// Get all users with membership details
// Get all users (Admin only)
exports.getUsers = asyncHandler(async (req, res) => {
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 10;
  const skip = (page - 1) * limit;

  const searchQuery = req.query.search
    ? { userName: { $regex: req.query.search, $options: "i" } }
    : {};

  const totalUsers = await User.countDocuments(searchQuery);
  const totalPages = Math.ceil(totalUsers / limit);

  // 👇 هنا هنحدد الحقول المسموح بيها فقط
  const users = await User.find(searchQuery)
    .select("userName email role profileImg phone createdAt")
    .skip(skip)
    .limit(limit)
    .populate("membershipSubscription")
;

  res.status(200).json({
    results: users.length,
    totalUsers,
    totalPages,
    currentPage: page,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
    data: users,
  });
});


// Create user
exports.createUser = asyncHandler(async (req, res) => {
  const user = await User.create(req.body);
  user.password = undefined;
  res.status(201).json({ data: user });
});

// Get user by ID
exports.getUserById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const user = await User.findById(id)
    .select("userName email role profileImg phone createdAt")
    .populate("membershipSubscription")

  if (!user) {
    return next(new ApiError(`لا يوجد مستخدم بالـ ID ${id}`, 404));
  }

  res.status(200).json({ data: user });
});

// Update user
exports.updateUser = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const updatedUser = await User.findByIdAndUpdate({ _id: id }, req.body, {
    new: true,
  });
  if (!updatedUser) return next(new ApiError(`No user found for ID ${id}`, 404));
  res.status(200).json({ data: updatedUser });
});

// Delete user
exports.deleteUser = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const user = await User.findByIdAndDelete(id);
  if (!user) return next(new ApiError(`No user found for ID ${id}`, 404));
  res.status(200).json({ message: "User deleted successfully" });
});


// -------------------- Logged User --------------------

// Get Logged user profile
// Get Logged user profile (with all memberships)
exports.getMyProfile = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id)
    .populate("orders")
    .populate("membershipSubscription");

  if (!user) return next(new ApiError("User not found", 404));

  // هات كل العضويات الخاصة باليوزر ده
  const memberships = await SubscriptionMemberShip.find({ user: req.user._id })
    .populate("plan");

  res.status(200).json({
    data: {
      ...user.toObject(),
      memberships, // رجّع كل العضويات مش واحدة بس
    },
  });
});

// Update logged user password
exports.updateMyPassword = asyncHandler(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      password: await bcrypt.hash(req.body.password, 12),
      passwordChangedAt: Date.now(),
    },
    { new: true }
  );
  const token = createToken(user._id);
  res.status(200).json({ data: user, token });
});

// Update logged user profile (info only)
exports.updateMyProfile = asyncHandler(async (req, res, next) => {
  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    {
      userName: req.body.userName,
      email: req.body.email,
      phone: req.body.phone,
      profileImg: req.body.profileImg,
    },
    { new: true }
  );
  res.status(200).json({ data: updatedUser });
});

// Delete my account
exports.deleteMyAccount = asyncHandler(async (req, res, next) => {
  const user = await User.findByIdAndDelete(req.user._id);
  if (!user) return next(new ApiError("No user found for this account", 404));
  res.status(200).json({ message: "Your account has been deleted" });
});


// -------------------- Profile Sub-sections --------------------

// Add address
exports.addAddress = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $push: { addresses: req.body } },
    { new: true }
  );
  res.status(200).json({ data: user.addresses });
});



// PUT /api/v1/users/addresses/:addressId
exports.updateAddress = asyncHandler(async (req, res, next) => {
  const { addressId } = req.params;
  const { label, details } = req.body; // اللي هيجي من البودي

  const user = await User.findOneAndUpdate(
    { _id: req.user._id, "addresses._id": addressId },
    {
      $set: {
        "addresses.$.label": label,
        "addresses.$.details": details,
      },
    },
    { new: true }
  );

  if (!user) return next(new ApiError("Address not found", 404));

  res.status(200).json({ data: user.addresses });
});

 

// Remove address
exports.removeAddress = asyncHandler(async (req, res) => {
  const { addressId } = req.params;
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $pull: { addresses: { _id: addressId } } },
    { new: true }
  );
  res.status(200).json({ message: "Your address has been deleted" , data: user.addresses });
});

// Add payment method
exports.addPaymentMethod = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $push: { paymentMethods: req.body } },
    { new: true }
  );
  res.status(200).json({ data: user.paymentMethods });
});


// PUT /api/v1/users/payment-methods/:methodId
exports.updatePaymentMethod = asyncHandler(async (req, res, next) => {
  const { methodId } = req.params;
  const { type, provider, last4 } = req.body; // ✅ خد البيانات من body

  const user = await User.findOneAndUpdate(
    { _id: req.user._id, "paymentMethods._id": methodId },
    {
      $set: {
        "paymentMethods.$.type": type,
        "paymentMethods.$.provider": provider,
        "paymentMethods.$.last4": last4,
      },
    },
    { new: true, runValidators: true } // ✅ يرجع بعد التعديل ويتأكد من القيم
  );

  if (!user) return next(new ApiError("Payment method not found", 404));

  res.status(200).json({
    status: "success",
    data: user.paymentMethods,
  });
});


// Remove payment method
exports.removePaymentMethod = asyncHandler(async (req, res) => {
  const { methodId } = req.params;
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $pull: { paymentMethods: { _id: methodId } } },
    { new: true }
  );
  res.status(200).json({ message: "Your payment info has been deleted", data: user.paymentMethods });
});



// -------------------- Membership --------------------

// @desc    Get my membership details
// @desc    Get my membership details (with full order stats)
exports.getMyMembership = asyncHandler(async (req, res, next) => {
  // 🟡 هات كل العضويات الخاصة باليوزر الحالي
  const memberships = await SubscriptionMemberShip.find({ user: req.user._id })
    .populate("plan");

  if (!memberships || memberships.length === 0) {
    return next(new ApiError("No memberships found", 404));
  }

  // 🟡 هات كل الأوردرات الخاصة باليوزر (مش بس completed)
  const user = await User.findById(req.user._id).populate("orders");

  if (!user) return next(new ApiError("User not found", 404));

  const orders = user.orders || [];

  // 🟡 عدد الحجوزات الكلي
  const totalBookings = orders.length;

  // 🟡 حساب عدد الحجوزات حسب الحالة
  const orderStatusCounts = orders.reduce((acc, order) => {
    const status = order.status || "unknown";
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  // 🟡 إجمالي النقاط من كل العضويات
  const totalPoints = memberships.reduce((sum, membership) => {
    return sum + (membership.points || 0);
  }, 0);

  // 🧮 احسب usage لكل عضوية
  const now = new Date();
  const formattedMemberships = memberships.map((membership) => {
    let usage = null;
    if (membership.startDate && membership.expiresAt) {
      const totalDuration =
        membership.expiresAt.getTime() - membership.startDate.getTime();
      const usedDuration = now.getTime() - membership.startDate.getTime();
      usage = Math.min((usedDuration / totalDuration) * 100, 100);
    }

    return {
      id: membership._id,
      subscriptionId: membership.subscriptionId,
      planName: membership.plan?.name,
      planType: membership.plan?.type,
      status: membership.status,
      startDate: membership.startDate,
      expiresAt: membership.expiresAt,
      createdAt: membership.createdAt,
      visitsUsed: membership.visitsUsed || 0,
      points: membership.points || 0,
      usagePercent: usage ? usage.toFixed(2) : null,
      rejectionReason: membership.rejectionReason || null,
    };
  });

  // ✅ أرجع كل القيم المطلوبة (من غير حذف أي داتا قديمة)
  res.status(200).json({
    status: "success",
    totalBookings,         // إجمالي كل الأوردرات
    orderStatusCounts,     // عدد كل حالة أوردر
    totalPoints,           // إجمالي النقاط
    results: formattedMemberships.length,
    data: formattedMemberships,
  });
});



// -------------------- Orders --------------------

// Get logged user's orders
exports.getMyOrders = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id).populate("orders");
  if (!user) return next(new ApiError("User not found", 404));

  res.status(200).json({
    results: user.orders.length,
    data: user.orders,
  });
});


//-------------------------Logged Devices----------------------

// GET /api/v1/users/my-devices
exports.getMyDevices = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id).select("devices");
  if (!user) return next(new ApiError("User not found", 404));

  res.status(200).json({
    results: user.devices.length,
    data: user.devices,
  });
});

// DELETE /api/v1/users/my-devices/:deviceId
exports.logoutDevice = asyncHandler(async (req, res, next) => {
  const user = req.user;
  const token = req.token;

  // نحذف التوكن الحالي من الأجهزة
  await User.updateOne(
    { _id: user._id },
    { $pull: { devices: { token } } }
  );

  res.status(200).json({
    status: "success",
    message: "تم تسجيل الخروج من هذا الجهاز بنجاح. التوكن أصبح غير صالح.",
  });
});


// 🚪 Logout from all devices
exports.logoutAllDevices = asyncHandler(async (req, res, next) => {
  const user = req.user;

  // نحذف كل الأجهزة وبالتالي كل التوكنات
  await User.updateOne(
    { _id: user._id },
    { $set: { devices: [] } }
  );

  res.status(200).json({
    status: "success",
    message: "تم تسجيل الخروج من جميع الأجهزة. كل التوكنات أصبحت غير صالحة.",
  });
});



