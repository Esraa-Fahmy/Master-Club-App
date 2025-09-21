const Booking = require("../models/bookingModel");
const Activity = require("../models/activityModel");
const Facility = require("../models/facilityModel");
const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const { sendNotification } = require("../utils/notifyUser");

// POST /bookings  (user creates request)
exports.createBooking = asyncHandler(async (req, res, next) => {
  const { activityId, facilityId, date, timeSlot, price, specialRequest } = req.body;

  if (!activityId && !facilityId) {
    return next(new ApiError("Booking must be for activity or facility", 400));
  }

  let item;
  if (activityId) {
    item = await Activity.findById(activityId);
  } else {
    item = await Facility.findById(facilityId);
  }

  if (!item) return next(new ApiError("Activity/Facility not found", 404));

  // ✅ تحقق من صلاحية العضوية
  if (!req.user.membershipPlan || !item.allowedMemberships.includes(req.user.membershipPlan)) {
    return next(new ApiError("Your membership plan does not allow booking this item", 403));
  }

  // ✅ تحقق من السعة (capacity) للـ slot
  const existingBookings = await Booking.countDocuments({
    [activityId ? "activity" : "facility"]: item._id,
    date,
    timeSlot,
    status: { $in: ["pending", "confirmed"] },
  });

  if (existingBookings >= (item.capacityPerSlot || 1)) {
    return next(new ApiError("This slot is fully booked", 400));
  }

  // ✅ إنشاء الحجز
  const booking = await Booking.create({
    user: req.user._id,
    activity: activityId || undefined,
    facility: facilityId || undefined,
    date,
    timeSlot,
    price: price || 0,
    paymentStatus: req.body.paymentStatus || "unpaid",
    status: "pending",
    specialRequest: specialRequest || "",
  });

  // إخطار الأدمن
  await sendNotification(
    req.user._id,
    "طلب حجز جديد",
    `تم إرسال طلب حجز ${activityId ? "لنشاط" : "لمرفق"}، يرجى مراجعة الأدمن.`,
    "system"
  );

  res.status(201).json({ status: "success", data: booking });
});


// GET /bookings/my
exports.getMyBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.find({ user: req.user._id })
    .populate("activity")
    .populate("facility")
    .sort({ createdAt: -1 });
  res.status(200).json({ results: bookings.length, data: bookings });
});

// GET /bookings/ (admin)
exports.getAllBookings = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  const bookings = await Booking.find(filter).populate("user activity facility").sort({ createdAt: -1 });
  res.status(200).json({ results: bookings.length, data: bookings });
});

// PUT /bookings/:id/approve  (admin)
exports.approveBooking = asyncHandler(async (req, res, next) => {
  const booking = await Booking.findById(req.params.id).populate("user activity facility");
  if (!booking) return next(new ApiError("Booking not found", 404));
  if (booking.status !== "pending") return next(new ApiError("Booking not pending", 400));

  booking.status = "confirmed";
  await booking.save();

  await sendNotification(
    booking.user._id,
    "تم قبول طلب الحجز",
    `تم قبول طلب الحجز ${booking.activity ? booking.activity.title : booking.facility.name} بتاريخ ${new Date(booking.date).toLocaleDateString()} ${booking.timeSlot || ""}`,
    "system"
  );

  res.status(200).json({ status: "success", data: booking });
});

// PUT /bookings/:id/reject  (admin)
exports.rejectBooking = asyncHandler(async (req, res, next) => {
  const booking = await Booking.findById(req.params.id).populate("user activity facility");
  if (!booking) return next(new ApiError("Booking not found", 404));
  if (booking.status !== "pending") return next(new ApiError("Booking not pending", 400));

  booking.status = "cancelled";
  await booking.save();

  await sendNotification(
    booking.user._id,
    "تم رفض طلب الحجز",
    `تم رفض طلب الحجز ${booking.activity ? booking.activity.title : booking.facility.name} بتاريخ ${new Date(booking.date).toLocaleDateString()}.`,
    "system"
  );

  res.status(200).json({ status: "success", data: booking });
});

// PUT /bookings/:id/cancel  (user cancels)
exports.cancelBooking = asyncHandler(async (req, res, next) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) return next(new ApiError("Booking not found", 404));
  if (booking.user.toString() !== req.user._id.toString()) return next(new ApiError("Not authorized", 403));

  booking.status = "cancelled";
  await booking.save();

  res.status(200).json({ status: "success", data: booking });
});
