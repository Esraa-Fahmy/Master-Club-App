// controllers/membershipSubscriptionController.js
const MembershipSubscription = require("../models/SubscriptionMemberShip");
const MembershipPlan = require("../models/membershipPlanModel");
const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const generateQr = require("../utils/qrGenerator");
const { createQrToken, verifyQrToken } = require("../utils/createToken");
const { sendNotification } = require("../utils/notifyUser");


// Helper to add days
const addDays = (date, days) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

// POST /api/v1/membership-subscriptions
exports.subscribe = asyncHandler(async (req, res, next) => {
  const { planId } = req.body;
  const plan = await MembershipPlan.findById(planId);
  if (!plan) return next(new ApiError("Plan not found", 404));

  if (plan.name === "vip") {
    const subscription = await MembershipSubscription.create({
      user: req.user._id,
      plan: plan._id,
      status: "pending_id_verification",
    });

    return res.status(201).json({
      status: "success",
      message: "VIP subscription created. Please submit your national ID.",
      data: subscription,
    });
  }

  const now = new Date();
  const durationDays = plan.durationDays || 30;
  const subscription = await MembershipSubscription.create({
    user: req.user._id,
    plan: plan._id,
    status: "active",
    startDate: now,
    expiresAt: addDays(now, durationDays),
  });

  const qrToken = createQrToken(subscription._id.toString());
  subscription.qrCode = await generateQr(qrToken);
  subscription.qrCodeExpiresAt = new Date(Date.now() + 2 * 60 * 1000);
  await subscription.save();

  res.status(201).json({ status: "success", data: subscription });
});

// PUT /api/v1/membership-subscriptions/:id/national-id
exports.addNationalId = asyncHandler(async (req, res, next) => {
  const { nationalId } = req.body;
  if (!nationalId) return next(new ApiError("National ID is required", 400));

  const sub = await MembershipSubscription.findById(req.params.id);
  if (!sub) return next(new ApiError("Subscription not found", 404));
  if (sub.user.toString() !== req.user._id.toString())
    return next(new ApiError("Not authorized", 403));

  if (sub.status !== "pending_id_verification") {
    return next(new ApiError("Wrong state for adding ID", 400));
  }

  sub.nationalId = nationalId;
  await sub.save();

  res.status(200).json({
    status: "success",
    message: "National ID saved. Await admin approval.",
    data: sub,
  });
});


exports.approveSubscription = asyncHandler(async (req, res, next) => {
  const sub = await MembershipSubscription.findById(req.params.id).populate("plan user");
  if (!sub) return next(new ApiError("Subscription not found", 404));

  if (sub.status !== "pending_id_verification") {
    return next(new ApiError("Not awaiting ID verification", 400));
  }

  sub.status = "awaiting_confirmation";
  sub.confirmationExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
  await sub.save();

  // 🔔 Notification
  await sendNotification(
    sub.user._id,
    "اشتراكك قيد التأكيد",
    `تمت الموافقة على طلب اشتراكك في خطة ${sub.plan.name}. برجاء التأكيد خلال 15 دقيقة.`,
    "membership"
  );

  res.status(200).json({
    status: "success",
    message: "Approved. User must confirm within 15 minutes.",
    data: sub,
  });
});

// PUT /api/v1/membership-subscriptions/:id/confirm  (user)
exports.confirmSubscription = asyncHandler(async (req, res, next) => {
  const sub = await MembershipSubscription.findById(req.params.id).populate("plan");
  if (!sub) return next(new ApiError("Subscription not found", 404));

  if (sub.status !== "awaiting_confirmation") {
    return next(new ApiError("Not awaiting confirmation", 400));
  }

  if (!sub.confirmationExpiresAt || Date.now() > new Date(sub.confirmationExpiresAt).getTime()) {
    sub.status = "expired";
    await sub.save();
    return next(new ApiError("Confirmation time expired", 400));
  }

  const now = new Date();
  const durationDays = sub.plan?.durationDays || 30;
  sub.startDate = now;
  sub.expiresAt = addDays(now, durationDays);

  const qrToken = createQrToken(sub._id.toString());
  sub.qrCode = await generateQr(qrToken);
  sub.qrCodeExpiresAt = new Date(Date.now() + 2 * 60 * 1000);
  sub.status = "active";
  await sub.save();


  await sendNotification(
  sub.user._id,
  "تم تفعيل اشتراكك",
  `تم تفعيل خطة ${sub.plan.name} بنجاح وصالحة حتى ${sub.expiresAt.toLocaleDateString()}.`,
  "membership"
);

  res.status(200).json({ status: "success", message: "Activated", data: sub });
});

// GET /api/v1/membership-subscriptions/my-qr
exports.getMyQr = asyncHandler(async (req, res, next) => {
  const sub = await MembershipSubscription.findOne({ user: req.user._id, status: "active" })
    .sort({ createdAt: -1 })
    .populate("plan");
  if (!sub) return next(new ApiError("No active subscription found", 404));

  const qrToken = createQrToken(sub._id.toString());
  sub.qrCode = await generateQr(qrToken);
  sub.qrCodeExpiresAt = new Date(Date.now() + 2 * 60 * 1000);
  await sub.save();

  res.status(200).json({
    status: "success",
    data: {
      qrCode: sub.qrCode,
      qrCodeExpiresAt: sub.qrCodeExpiresAt,
      plan: sub.plan,
      expiresAt: sub.expiresAt,
    },
  });
});

// PUT /api/v1/membership-subscriptions/:id/refresh-qr
exports.refreshQr = asyncHandler(async (req, res, next) => {
  const sub = await MembershipSubscription.findById(req.params.id);
  if (!sub) return next(new ApiError("Subscription not found", 404));
  if (sub.user.toString() !== req.user._id.toString()) return next(new ApiError("Not authorized", 403));
  if (sub.status !== "active") return next(new ApiError("Must be active", 400));

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

// POST /api/v1/membership-subscriptions/scan-qr
exports.scanQr = asyncHandler(async (req, res, next) => {
  const { qrToken } = req.body;
  if (!qrToken) return next(new ApiError("QR token is required", 400));

  const decoded = verifyQrToken(qrToken);
  if (!decoded) {
    return res.status(200).json({ accessGranted: false, reason: "invalid_or_expired_qr" });
  }

  const sub = await MembershipSubscription.findById(decoded.subId).populate("plan user");
  if (!sub) return next(new ApiError("Subscription not found", 404));

  if (sub.status !== "active")
    return res.status(200).json({ accessGranted: false, reason: "subscription_not_active" });
  if (sub.expiresAt && Date.now() > new Date(sub.expiresAt).getTime())
    return res.status(200).json({ accessGranted: false, reason: "subscription_expired" });
  if (!sub.qrCodeExpiresAt || Date.now() > new Date(sub.qrCodeExpiresAt).getTime())
    return res.status(200).json({ accessGranted: false, reason: "qr_expired" });

  sub.lastAccessAt = new Date();
  sub.visitsUsed = (sub.visitsUsed || 0) + 1;
  sub.points = (sub.points || 0) + 10;
  await sub.save();

  return res.status(200).json({
    accessGranted: true,
    message: "Access granted",
    user: { id: sub.user._id, name: sub.user.userName, nationalId: sub.nationalId },
    membership: {
      id: sub._id,
      planName: sub.plan?.name,
      planType: sub.plan?.type,
      expiresAt: sub.expiresAt,
      visitsUsed: sub.visitsUsed,
      points: sub.points,
    },
  });
});

// PUT /api/v1/membership-subscriptions/:id/cancel
exports.cancelSubscription = asyncHandler(async (req, res, next) => {
  const sub = await MembershipSubscription.findById(req.params.id).populate("plan");
  if (!sub) return next(new ApiError("Subscription not found", 404));
  if (sub.user.toString() !== req.user._id.toString()) return next(new ApiError("Not authorized", 403));

  if (["expired", "rejected", "cancelled_by_user"].includes(sub.status)) {
    return next(new ApiError("Already ended/cancelled", 400));
  }

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

  res.status(200).json({ status: "success", message: "Cancelled by user", data: sub });
});



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