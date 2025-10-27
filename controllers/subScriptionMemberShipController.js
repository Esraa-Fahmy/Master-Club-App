// controllers/membershipSubscriptionController.js
const MembershipSubscription = require("../models/SubscriptionMemberShip");
const MembershipPlan = require("../models/membershipPlanModel");
const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const generateQr = require("../utils/qrGenerator");
const { createQrToken, verifyQrToken } = require("../utils/createToken");
const { sendNotification } = require("../utils/notifyUser");

// Helper: Add days
const addDays = (date, days) =>
  new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

// Helper: Generate Subscription ID (used only when active)
function generateSubscriptionId() {
  const prefix = "AH";
  const random = Math.floor(100 + Math.random() * 900);
  return `${prefix}-${random}`;
}

// ✅ اشتراك جديد
exports.subscribe = asyncHandler(async (req, res, next) => {
  const { planId } = req.body;
  const plan = await MembershipPlan.findById(planId);
  if (!plan) return next(new ApiError("Plan not found", 404));

  // لو عنده اشتراك شغال أو قيد الموافقة
  const existingSub = await MembershipSubscription.findOne({
    user: req.user._id,
    status: {
      $in: [
        "active",
        "pending_id_verification",
        "waiting_admin_approve_national_id",
        "awaiting_confirmation",
      ],
    },
  });
  if (existingSub)
    return next(
      new ApiError("You already have an active or pending subscription", 400)
    );

  const now = new Date();
  const durationDays = plan.durationDays || 30;
  let subscription;

  // VIP Plan
  if (plan.name.toLowerCase() === "vip") {
    subscription = await MembershipSubscription.create({
      user: req.user._id,
      plan: plan._id,
      status: "pending_id_verification",
    });

    return res.status(201).json({
      status: "success",
      message:
        "VIP subscription request created. Please enter your National ID.",
      data: subscription,
    });
  }

  // Normal Plan → Active Directly
  subscription = await MembershipSubscription.create({
    user: req.user._id,
    plan: plan._id,
    startDate: now,
    expiresAt: addDays(now, durationDays),
    status: "active",
    subscriptionId: generateSubscriptionId(),
  });

  // Generate QR
  const qrToken = createQrToken(subscription._id.toString());
  subscription.qrCode = await generateQr(qrToken);
  subscription.qrCodeExpiresAt = new Date(Date.now() + 2 * 60 * 1000);
  await subscription.save();

  res.status(201).json({
    status: "success",
    message: "Subscription created successfully",
    data: subscription,
  });
});

// ✅ المستخدم يضيف الرقم القومي
exports.addNationalId = asyncHandler(async (req, res, next) => {
  const { nationalId } = req.body;
  const subscriptionId = req.params.id;

  if (!nationalId) return next(new ApiError("National ID is required", 400));

  const subscription = await MembershipSubscription.findById(
    subscriptionId
  ).populate("plan");
  if (!subscription) return next(new ApiError("Subscription not found", 404));

  if (subscription.plan.name.toLowerCase() !== "vip")
    return next(
      new ApiError("National ID is only required for VIP subscriptions", 400)
    );

  // check if used in another subscription
  const existing = await MembershipSubscription.findOne({
    nationalId,
    _id: { $ne: subscriptionId },
    status: {
      $in: [
        "pending_id_verification",
        "waiting_admin_approve_national_id",
        "awaiting_confirmation",
        "active",
      ],
    },
  });
  if (existing)
    return next(
      new ApiError(
        "This National ID is already linked to another active or pending VIP subscription",
        400
      )
    );

  subscription.nationalId = nationalId;
  subscription.status = "waiting_admin_approve_national_id";
  await subscription.save();

  res.status(200).json({
    status: "success",
    message:
      "National ID added successfully. Waiting for admin approval.",
    data: subscription,
  });
});

// ✅ عرض كل الاشتراكات (Admin)
exports.getAllSubscriptionRequests = asyncHandler(async (req, res, next) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;

  const requests = await MembershipSubscription.find(filter)
    .populate("user", "userName email phone")
    .populate("plan", "name price permissions")
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: "success",
    results: requests.length,
    data: requests,
  });
});

// ✅ موافقة الأدمن بعد مراجعة الرقم القومي
exports.approveSubscription = asyncHandler(async (req, res, next) => {
  const sub = await MembershipSubscription.findById(req.params.id).populate(
    "plan user"
  );
  if (!sub) return next(new ApiError("Subscription not found", 404));
  if (sub.status !== "waiting_admin_approve_national_id")
    return next(new ApiError("Not awaiting admin approval", 400));

  sub.status = "awaiting_confirmation";
  await sub.save();

  await sendNotification(
    sub.user._id,
    "اشتراكك قيد التأكيد",
    `تمت الموافقة على طلب اشتراكك في خطة ${sub.plan.name}. برجاء التأكيد لتفعيل الاشتراك.`,
    "membership"
  );

  res.status(200).json({
    status: "success",
    message: "Approved. Waiting for user confirmation.",
    data: sub,
  });
});


exports.rejectSubscription = asyncHandler(async (req, res, next) => {
  const { reason } = req.body;
  const sub = await MembershipSubscription.findById(req.params.id).populate(
    "plan user"
  );
  if (!sub) return next(new ApiError("Subscription not found", 404));

  if (sub.status !== "waiting_admin_approve_national_id")
    return next(new ApiError("Not awaiting admin approval", 400));

  sub.status = "rejected";
  sub.rejectionReason = reason || "لم يتم قبول البطاقة الوطنية.";
  sub.rejectedAt = new Date();
  await sub.save();

  await sendNotification(
    sub.user._id,
    "تم رفض طلب الاشتراك",
   ` تم رفض البطاقة الوطنية لطلب اشتراكك في خطة ${sub.plan.name}. السبب: ${sub.rejectionReason}`,
    "membership"
  );

  res.status(200).json({
    status: "success",
    message: "Subscription rejected",
    data: sub,
  });
});

// ✅ المستخدم يؤكد الاشتراك بعد موافقة الأدمن
// ✅ المستخدم يؤكد الاشتراك بعد موافقة الأدمن
exports.confirmSubscription = asyncHandler(async (req, res, next) => {
  const sub = await MembershipSubscription.findById(req.params.id)
    .populate("plan", "name durationDays price permissions");

  if (!sub) return next(new ApiError("Subscription not found", 404));
  if (sub.user.toString() !== req.user._id.toString())
    return next(new ApiError("Not authorized", 403));
  if (sub.status !== "awaiting_confirmation")
    return next(new ApiError("Not awaiting confirmation", 400));

  const now = new Date();
  const durationDays = sub.plan?.durationDays || 30;

  sub.startDate = now;
  sub.expiresAt = addDays(now, durationDays);
  sub.subscriptionId = generateSubscriptionId();
  sub.status = "active";

  const qrToken = createQrToken(sub._id.toString());
  sub.qrCode = await generateQr(qrToken);
  sub.qrCodeExpiresAt = new Date(Date.now() + 2 * 60 * 1000);

  await sub.save();

  await sendNotification(
    sub.user._id,
    "تم تفعيل اشتراكك",
    `تم تفعيل خطة ${sub.plan.name} بنجاح وصالحة حتى ${sub.expiresAt.toLocaleDateString()}.`,
    "membership"
  );

  res.status(200).json({
    status: "success",
    message: "Activated",
    data: {
      subscriptionId: sub.subscriptionId,
      plan: {
        name: sub.plan.name,
        durationDays: sub.plan.durationDays,
        price: sub.plan.price,
        permissions: sub.plan.permissions, // ✅ مضافة هنا
      },
      startDate: sub.startDate,
      expiresAt: sub.expiresAt,
      qrCode: sub.qrCode,
      qrCodeExpiresAt: sub.qrCodeExpiresAt,
    },
  });
});


// ✅ المستخدم يشوف حالة اشتراكه
exports.checkNationalIdStatus = asyncHandler(async (req, res, next) => {
  const sub = await MembershipSubscription.findById(req.params.id)
    .populate("plan", "name price permissions");

  if (!sub) return next(new ApiError("Subscription not found", 404));
  if (sub.user.toString() !== req.user._id.toString())
    return next(new ApiError("Not authorized", 403));

  let responseData = {
    subscriptionStatus: sub.status,
    requestedAt: sub.createdAt,
    plan: {
      name: sub.plan.name,
      price: sub.plan.price,
      permissions: sub.plan.permissions, // ✅ مضافة هنا
    },
  };

  switch (sub.status) {
    case "pending_id_verification":
      responseData.message = "من فضلك أدخل الرقم القومي لتأكيد طلبك.";
      break;
    case "waiting_admin_approve_national_id":
      responseData.message = "جارٍ مراجعة الرقم القومي من قبل الأدمن.";
      break;
    case "awaiting_confirmation":
      responseData.message =
        "تمت الموافقة على البطاقة، برجاء التأكيد لتفعيل الاشتراك.";
      break;
    case "rejected":
      responseData.message = `تم رفض البطاقة الوطنية. السبب: ${sub.rejectionReason}`;
      break;
    case "active":
      responseData.message = "الاشتراك مفعل بنجاح.";
      break;
    default:
      responseData.message = `الحالة الحالية: ${sub.status}`;
  }

  res.status(200).json({
    status: "success",
    data: responseData,
  });
});


/// ✅ QR (عرض كود المستخدم)
exports.getMyQr = asyncHandler(async (req, res, next) => {
  const sub = await MembershipSubscription.findOne({
    user: req.user._id,
    status: "active",
  })
    .populate("plan", "name durationDays price permissions")
    .populate("user", "userName phone email");

  if (!sub) return next(new ApiError("No active subscription found", 404));

  const qrToken = createQrToken(sub._id.toString());
  sub.qrCode = await generateQr(qrToken);
  sub.qrCodeExpiresAt = new Date(Date.now() + 2 * 60 * 1000);
  await sub.save();

  res.status(200).json({
    status: "success",
    data: {
      user: {
        id: sub.user._id,
        name: sub.user.userName,
        phone: sub.user.phone,
        email: sub.user.email,
      },
      membership: {
        id: sub._id,
        subscriptionId: sub.subscriptionId,
        planName: sub.plan.name,
        permissions: sub.plan.permissions, // ✅ مضافة هنا
        status: sub.status,
        expiresAt: sub.expiresAt,
        points: sub.points,
        visitsUsed: sub.visitsUsed,
      },
      qrCode: sub.qrCode,
      qrCodeExpiresAt: sub.qrCodeExpiresAt,
    },
  });
});

// ✅ تجديد كود QR
exports.refreshQr = asyncHandler(async (req, res, next) => {
  const sub = await MembershipSubscription.findById(req.params.id);
  if (!sub) return next(new ApiError("Subscription not found", 404));
  if (sub.user.toString() !== req.user._id.toString())
    return next(new ApiError("Not authorized", 403));
  if (sub.status !== "active")
    return next(new ApiError("Must be active", 400));

  const qrToken = createQrToken(sub._id.toString());
  sub.qrCode = await generateQr(qrToken);
  sub.qrCodeExpiresAt = new Date(Date.now() + 2 * 60 * 1000);
  await sub.save();

  res.status(200).json({
    status: "success",
    message: "QR refreshed",
    data: { qrCode: sub.qrCode, qrCodeExpiresAt: sub.qrCodeExpiresAt },
  });
});



exports.scanQr = asyncHandler(async (req, res, next) => {
  const { qrToken } = req.body;
  if (!qrToken) return next(new ApiError("QR token is required", 400));

  const decoded = verifyQrToken(qrToken);
  if (!decoded)
    return res.status(200).json({
      accessGranted: false,
      reason: "invalid_or_expired_qr",
    });

  const sub = await MembershipSubscription.findById(decoded.subId).populate(
    "plan user"
  );
  if (!sub) return next(new ApiError("Subscription not found", 404));

  // ❌ الاشتراك مش مفعل
  if (sub.status !== "active") {
    await sendNotification(
      sub.user._id,
      "فشل في الدخول",
      "الاشتراك غير مفعل حاليًا.",
      "membership"
    );
    return res.status(200).json({
      accessGranted: false,
      reason: "subscription_not_active",
    });
  }

  // ❌ الاشتراك منتهي
  if (sub.expiresAt && Date.now() > new Date(sub.expiresAt)) {
    await sendNotification(
      sub.user._id,
      "انتهاء الاشتراك",
      "محاولة دخول فاشلة: الاشتراك منتهي الصلاحية.",
      "membership"
    );
    return res.status(200).json({
      accessGranted: false,
      reason: "subscription_expired",
    });
  }

  // ❌ QR منتهي
  if (!sub.qrCodeExpiresAt || Date.now() > new Date(sub.qrCodeExpiresAt)) {
    await sendNotification(
      sub.user._id,
      "رمز QR منتهي",
      "محاولة دخول فاشلة: رمز الدخول منتهي الصلاحية.",
      "membership"
    );
    return res.status(200).json({
      accessGranted: false,
      reason: "qr_expired",
    });
  }

  // ✅ نجاح المسح
  sub.lastAccessAt = new Date();
  sub.visitsUsed = (sub.visitsUsed || 0) + 1;
  sub.points = (sub.points || 0) + 10;
  await sub.save();

  await sendNotification(
    sub.user._id,
    "تم تأكيد الدخول",
   ` تم مسح الكود بنجاح لخطة ${sub.plan?.name}`,
    "membership"
  );

  return res.status(200).json({
    accessGranted: true,
    message: "Access granted",
    user: {
      id: sub.user._id,
      name: sub.user.userName,
      nationalId: sub.nationalId,
    },
    membership: {
      id: sub._id,
      subscriptionId: sub.subscriptionId,
      planName: sub.plan?.name,
      expiresAt: sub.expiresAt,
      visitsUsed: sub.visitsUsed,
      points: sub.points,
    },
  });
});






// ✅ إلغاء الاشتراك
exports.cancelSubscription = asyncHandler(async (req, res, next) => {
  const sub = await MembershipSubscription.findById(req.params.id).populate(
    "plan"
  );
  if (!sub) return next(new ApiError("Subscription not found", 404));
  if (sub.user.toString() !== req.user._id.toString())
    return next(new ApiError("Not authorized", 403));

  if (["expired", "rejected", "cancelled_by_user"].includes(sub.status))
    return next(new ApiError("Already ended/cancelled", 400));

  sub.status = "cancelled_by_user";
  sub.expiresAt = new Date();
  sub.qrCode = null;
  sub.qrCodeExpiresAt = null;
  await sub.save();

  await sendNotification(
    sub.user._id,
    "تم إلغاء الاشتراك",
    `تم إلغاء اشتراكك في خطة ${sub.plan.name}.`,
    "membership"
  );

  res
    .status(200)
    .json({ status: "success", message: "Cancelled by user", data: sub });
});

// ✅ انتهاء الاشتراكات تلقائيًا
exports.checkExpiredMemberships = async () => {
  const now = new Date();
  const subs = await MembershipSubscription.find({
    status: "active",
    expiresAt: { $lte: now },
  }).populate("user plan");

  for (const sub of subs) {
    sub.status = "expired";
    await sub.save();

    await sendNotification(
      sub.user._id,
      "انتهاء الاشتراك",
      `انتهى اشتراكك في خطة ${sub.plan.name}. برجاء التجديد.`,
      "membership"
    );
  }
};
