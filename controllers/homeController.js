const Activity = require("../models/activityModel");
const Facility = require("../models/facilityModel");
const Category = require("../models/categoryModel");
const SubscriptionMemberShip = require("../models/SubscriptionMemberShip");
const asyncHandler = require("express-async-handler");

// GET /home
// Aggregrate featured activities, facilities grouped by category, user recent activities (if logged)
exports.getHomeData = asyncHandler(async (req, res) => {
  // featured activities (top priced or upcoming)
  const featured = await Activity.find().sort({ createdAt: -1 }).limit(6).populate("category");

  // facilities grouped by category (for quick UI)
  const categories = await Category.find();
  const facilitiesByCategory = {};
  for (const cat of categories) {
    const facs = await Facility.find({ category: cat._id }).limit(10);
    facilitiesByCategory[cat._id] = {
      category: cat,
      facilities: facs,
    };
  }

  // upcoming vip events: VIP activities that admin might mark with availableDates in the future
  const now = new Date();
  const vipEvents = await Activity.find({}).populate("category");
  const filteredVipEvents = vipEvents.filter(a => a.category && a.category.type === "activity"); // frontend to decide vip tag

  // recent activities for logged user
  let recentActivities = [];
  if (req.user) {
    const user = await require("../models/userModel").findById(req.user._id).select("recentActivities");
    recentActivities = user?.recentActivities || [];
  }

  res.status(200).json({
    featured,
    facilitiesByCategory,
    vipEvents: filteredVipEvents.slice(0, 6),
    recentActivities,
  });
});

// GET /home/vip-events  (optionally paginated)
exports.getVipEvents = asyncHandler(async (req, res) => {
  // define VIP activities: could be by plan or by a flag (here we use activity.category or activity.price>0 etc)
  const events = await Activity.find({}).populate("category");
  // filter logic if you set a flag later
  res.status(200).json({ results: events.length, data: events });
});
