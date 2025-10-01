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
exports.getVipEvents = asyncHandler(async (req, res) => {
  const now = new Date();
  const events = await Activity.find({
    isEvent: true,
    isVip: true,
    endDate: { $gte: now }
  }).populate("category", "name type");


  res.status(200).json({ results: events.length, data: events });
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
