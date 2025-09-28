const Booking = require("../models/bookingModel");
const Activity = require("../models/activityModel");
const Facility = require("../models/facilityModel");
const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const { sendNotification } = require("../utils/notifyUser");
const { v4: uuidv4 } = require("uuid");
const User = require("../models/userModel");
const mongoose = require("mongoose");

// =======================
// User Endpoints
// =======================

// POST /bookings
exports.createBooking = asyncHandler(async (req, res, next) => {
  const { activityId, facilityId, date, timeSlot, price, specialRequest, guests = 1 } = req.body;

  if (!activityId && !facilityId)
    return next(new ApiError("Booking must be for activity or facility", 400));
  if (!date || !timeSlot)
    return next(new ApiError("date and timeSlot are required", 400));

  const item = activityId
    ? await Activity.findById(activityId)
    : await Facility.findById(facilityId);
  if (!item) return next(new ApiError("Activity/Facility not found", 404));

  // Check user's active membership plan
  let userPlanId = null;
  const activeSub = await require("../models/SubscriptionMemberShip")
    .findOne({ user: req.user._id, status: "active" })
    .populate("plan");
  if (activeSub) userPlanId = activeSub.plan._id.toString();

  if (item.allowedPlans && item.allowedPlans.length > 0) {
    if (!userPlanId)
      return next(new ApiError("You need an active membership to book this item", 403));
    const allowed = item.allowedPlans.some((p) => p._id.toString() === userPlanId);
    if (!allowed)
      return next(new ApiError("Your membership plan does not allow booking this item", 403));
  }

  // Find schedule + slot
  const targetSchedule = (item.schedules || []).find((s) => s.date === date);
  if (!targetSchedule) return next(new ApiError("No schedule found for this date", 400));

  const slot = (targetSchedule.slots || []).find(
    (s) => s.time === timeSlot || s.id === timeSlot
  );
  if (!slot) return next(new ApiError("Time slot not available for this date", 400));

  // Check duplicate booking
  const userDuplicate = await Booking.findOne({
    user: req.user._id,
    date,
    timeSlot,
    status: { $in: ["pending", "confirmed"] },
    $or: [{ activity: activityId || null }, { facility: facilityId || null }],
  });
  if (userDuplicate) return next(new ApiError("You already have a booking for this slot", 400));

  // Check capacity
  const existingCount = await Booking.aggregate([
    {
      $match: {
        date,
        timeSlot,
        status: { $in: ["pending", "confirmed"] },
        $or: [
          activityId ? { activity: mongoose.Types.ObjectId(activityId) } : {},
          facilityId ? { facility: mongoose.Types.ObjectId(facilityId) } : {},
        ].filter((o) => Object.keys(o).length > 0),
      },
    },
    { $group: { _id: null, totalGuests: { $sum: "$guests" } } },
  ]);

  const currentGuests = existingCount[0] ? existingCount[0].totalGuests : 0;
  const capacity = slot.capacity || item.capacityPerSlot || 1;

  if (currentGuests + guests > capacity) {
    return next(new ApiError("This slot is fully booked", 400));
  }

  // Create booking
  const booking = await Booking.create({
    user: req.user._id,
    activity: activityId || undefined,
    facility: facilityId || undefined,
    date,
    timeSlot: slot.time,
    slotId: slot.id || uuidv4(),
    guests,
    specialRequest: specialRequest || "",
    price: price || 0,
    paymentStatus: req.body.paymentStatus || "unpaid",
    status: "pending",
  });

  // Increase reserved
  await (activityId ? Activity : Facility).updateOne(
    { _id: item._id, "schedules.date": date, "schedules.slots.time": slot.time },
    { $inc: { "schedules.$[s].slots.$[sl].reserved": guests } },
    { arrayFilters: [{ "s.date": date }, { "sl.time": slot.time }] }
  );

  // Notify user
  await sendNotification(
    req.user._id,
    "طلب حجز جديد",
    `تم إرسال طلب حجز ${activityId ? "لنشاط" : "لمرفق"} بتاريخ ${date} - ${slot.time}.`,
    "system",
    { bookingId: booking._id }
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

// PUT /bookings/:id/cancel
exports.cancelBooking = asyncHandler(async (req, res, next) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) return next(new ApiError("Booking not found", 404));
  if (booking.user.toString() !== req.user._id.toString())
    return next(new ApiError("Not authorized", 403));

  booking.status = "cancelled";
  await booking.save();

  // Reduce reserved count in slot
  const item = booking.activity
    ? await Activity.findById(booking.activity)
    : await Facility.findById(booking.facility);

  if (item) {
    await (booking.activity ? Activity : Facility).updateOne(
      { _id: item._id, "schedules.date": booking.date, "schedules.slots.time": booking.timeSlot },
      { $inc: { "schedules.$[s].slots.$[sl].reserved": -booking.guests } },
      { arrayFilters: [{ "s.date": booking.date }, { "sl.time": booking.timeSlot }] }
    );
  }

  res.status(200).json({ status: "success", data: booking });
});

// =======================
// Admin Endpoints
// =======================

// GET /bookings (admin)
exports.getAllBookings = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  const bookings = await Booking.find(filter)
    .populate("user activity facility")
    .sort({ createdAt: -1 });
  res.status(200).json({ results: bookings.length, data: bookings });
});

// PUT /bookings/:id/approve
exports.approveBooking = asyncHandler(async (req, res, next) => {
  const booking = await Booking.findById(req.params.id).populate("user activity facility");
  if (!booking) return next(new ApiError("Booking not found", 404));
  if (booking.status !== "pending") return next(new ApiError("Booking not pending", 400));

  booking.status = "confirmed";
  await booking.save();

  // Add to user's recentActivities
  const user = await User.findById(booking.user);
  if (user) {
    user.recentActivities = user.recentActivities || [];
    user.recentActivities.unshift({
      activity: booking.activity ? booking.activity.title : booking.facility.name,
      date: new Date(booking.date),
      durationMinutes: 60,
    });
    if (user.recentActivities.length > 50)
      user.recentActivities = user.recentActivities.slice(0, 50);
    await user.save();
  }

  await sendNotification(
    booking.user._id,
    "تم قبول طلب الحجز",
    `تم قبول طلب الحجز ${booking.activity ? booking.activity.title : booking.facility.name} بتاريخ ${new Date(
      booking.date
    ).toLocaleDateString()} ${booking.timeSlot || ""}`,
    "system"
  );

  res.status(200).json({ status: "success", data: booking });
});

// PUT /bookings/:id/reject
exports.rejectBooking = asyncHandler(async (req, res, next) => {
  const booking = await Booking.findById(req.params.id).populate("user activity facility");
  if (!booking) return next(new ApiError("Booking not found", 404));
  if (booking.status !== "pending") return next(new ApiError("Booking not pending", 400));

  booking.status = "cancelled";
  await booking.save();

  await sendNotification(
    booking.user._id,
    "تم رفض طلب الحجز",
    `تم رفض طلب الحجز ${booking.activity ? booking.activity.title : booking.facility.name} بتاريخ ${new Date(
      booking.date
    ).toLocaleDateString()}.`,
    "system"
  );

  res.status(200).json({ status: "success", data: booking });
});

// =======================
// Schedules Management (Admin)
// =======================

// POST /:type/:id/schedules
exports.addSchedule = asyncHandler(async (req, res, next) => {
  const { type, id } = req.params; // type = activity | facility
  const { date, slots } = req.body;
  if (!date || !slots) return next(new ApiError("date and slots required", 400));

  const Model = type === "activity" ? Activity : Facility;
  const item = await Model.findById(id);
  if (!item) return next(new ApiError(`${type} not found`, 404));

  item.schedules.push({ date, slots });
  await item.save();

  res.status(201).json({ status: "success", data: item.schedules });
});

// PUT /:type/:id/schedules/:date
exports.updateSchedule = asyncHandler(async (req, res, next) => {
  const { type, id, date } = req.params;
  const { slots } = req.body;
  const Model = type === "activity" ? Activity : Facility;

  const item = await Model.findById(id);
  if (!item) return next(new ApiError(`${type} not found`, 404));

  const schedule = item.schedules.find((s) => s.date === date);
  if (!schedule) return next(new ApiError("Schedule not found for this date", 404));

  schedule.slots = slots;
  await item.save();

  res.status(200).json({ status: "success", data: schedule });
});

// DELETE /:type/:id/schedules/:date
exports.deleteSchedule = asyncHandler(async (req, res, next) => {
  const { type, id, date } = req.params;
  const Model = type === "activity" ? Activity : Facility;

  const item = await Model.findById(id);
  if (!item) return next(new ApiError(`${type} not found`, 404));

  item.schedules = item.schedules.filter((s) => s.date !== date);
  await item.save();

  res.status(200).json({ status: "success", data: item.schedules });
});

// =======================
// User view schedules
// =======================

// GET /:type/:id/schedules
exports.getSchedules = asyncHandler(async (req, res, next) => {
  const { type, id } = req.params;
  const Model = type === "activity" ? Activity : Facility;

  const item = await Model.findById(id);
  if (!item) return next(new ApiError(`${type} not found`, 404));

  res.status(200).json({ status: "success", data: item.schedules });
});
