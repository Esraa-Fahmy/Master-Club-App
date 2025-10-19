const Activity = require("../models/activityModel");
const Facility = require("../models/facilityModel");
const Category = require("../models/categoryModel");
const asyncHandler = require("express-async-handler");
const User = require("../models/userModel");

// GET /home
exports.getHomeData = asyncHandler(async (req, res) => {
  // Featured activities (آخر 6 نشاطات مميزة)
  const featured = await Activity.find()
    .sort({ createdAt: -1 })
    .limit(6)
    .populate("category");

  // Facilities grouped by category
  const categories = await Category.find();
  const facilitiesByCategory = {};

  for (const cat of categories) {
    const facs = await Facility.find({ category: cat._id }).limit(10);
    facilitiesByCategory[cat._id] = {
      category: cat,
      facilities: facs,
    };
  }

  // VIP Events upcoming
  const now = new Date();
  const vipEvents = await Activity.find({
    isEvent: true,
    isVip: true,
    endDate: { $gte: now }
  }).populate("category");

  // Recent activities (history of logged user)
  let recentActivities = [];
  if (req.user) {
    const user = await User.findById(req.user._id).select("recentActivities");
    recentActivities = user?.recentActivities || [];
  }

  res.status(200).json({
    featured,
    facilitiesByCategory,
    vipEvents,
    recentActivities,
  });
});

// GET /home/vip-events
exports.getAllEvents = asyncHandler(async (req, res) => {
  const now = new Date();

  // 🧩 فلتر أساسي: لازم يكون Event
  let filter = { isEvent: true };

  // 🧩 لو المستخدم مش أدمن → نفلتر فقط الأحداث الحالية
  if (req.user.role !== "admin") {
    filter.$or = [
      { endDate: { $gte: now } },
      { endDate: { $exists: false } }
    ];
  }

  // 🧩 لو المستخدم عنده عضوية General → استبعد الأحداث VIP
  if (req.user.role !== "admin" && req.user.membershipType === "General") {
    filter.isVip = { $ne: true }; // يعني مش VIP
  }

  // 🧩 لو المستخدم عنده عضوية VIP → يشوف كل الأحداث
  // مش محتاجين شرط إضافي

  const events = await Activity.find(filter)
    .populate("category", "name type")
    .populate("subCategory", "name category")
    .sort({ startDate: 1 });

  res.status(200).json({
    results: events.length,
    data: events,
  });
});

// GET /home/recommended?type=facility OR ?type=activity
exports.getRecommended = asyncHandler(async (req, res) => {
  const { type } = req.query; // activity | facility

  let Model;
  if (type === "facility") {
    Model = Facility;
  } else if (type === "activity") {
    Model = Activity;
  } else {
    return res.status(400).json({ message: "type is required: activity | facility" });
  }

  const items = await Model.find({ isRecommended: true })
    .populate("category", "name type")
    .populate("allowedPlans", "name")
    .populate("subCategory", "name category");

  res.status(200).json({
    results: items.length,
    data: items,
  });
});
