const Facility = require("../models/facilityModel");
const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const Category = require("../models/categoryModel");
const MembershipPlan = require("../models/membershipPlanModel");
const SubscripeMembership = require("../models/SubscriptionMemberShip");
const { v4: uuidv4 } = require("uuid");
const sharp = require("sharp");
const { uploadMixOfImages } = require("../midlewares/uploadImageMiddleWare");
const fs = require("fs");

// ✅ Upload images
exports.uploadFacilityImages = uploadMixOfImages([{ name: "images", maxCount: 5 }]);

// ✅ Resize images
exports.resizeFacilityImages = asyncHandler(async (req, res, next) => {
  if (req.files.images) {
    req.body.images = [];
    await Promise.all(
      req.files.images.map(async (img, index) => {
        const imageName = `Facility-${uuidv4()}-${Date.now()}-${index + 1}.jpeg`;
        const dir = "uploads/facilities/";
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        await sharp(img.buffer)
          .toFormat("jpeg")
          .jpeg({ quality: 90 })
          .toFile(`${dir}${imageName}`);

        req.body.images.push(imageName);
      })
    );
  }
  next();
});

exports.getFacilities = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  let filter = {};
  if (req.query.category) filter.category = req.query.category;
  if (req.query.search) filter.name = { $regex: req.query.search, $options: "i" };

  // 🟢 نجيب كل الفاسيلتيز
  const facilities = await Facility.find(filter)
    .skip(skip)
    .limit(limit)
    .populate("category", "name type")
    .populate("allowedPlans", "_id name");

  const totalFacilities = await Facility.countDocuments(filter);
  const totalPages = Math.ceil(totalFacilities / limit);

  // 🧩 لو المستخدم Admin → يشوف ويحجز الكل
  if (req.user.role === "admin") {
    const adminFacilities = facilities.map(f => ({
      ...f.toObject(),
      canBook: true,
    }));

    return res.status(200).json({
      results: adminFacilities.length,
      totalFacilities,
      totalPages,
      currentPage: page,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      userPlan: "admin",
      data: adminFacilities,
    });
  }

  // 🧩 نجيب عضوية المستخدم (لو موجودة)
  const subscription = await SubscripeMembership.findOne({
    user: req.user._id,
    status: "active",
  }).populate("plan");

  const userPlanName = subscription?.plan?.name?.toLowerCase() || null;

  // 🟢 كل المستخدمين يشوفوا كل الفاسيلتيز
  const facilitiesWithAccess = facilities.map(f => {
    const isVIPFacility = f.allowedPlans.some(p => p.name.toLowerCase() === "vip");

    let canBook = false;

    if (userPlanName === "vip") {
      // مستخدم VIP → يقدر يحجز الكل
      canBook = true;
    } else if (userPlanName === "general" && !isVIPFacility) {
      // General → يقدر يحجز العام فقط
      canBook = true;
    }

    return {
      ...f.toObject(),
      canBook,
    };
  });

  // 🟢 فلترة حسب النوع لو طلبت (vip / general)
  let filteredData = facilitiesWithAccess;
  if (req.query.mode === "vip") {
    filteredData = filteredData.filter(f =>
      f.allowedPlans.some(p => p.name.toLowerCase() === "vip")
    );
  } else if (req.query.mode === "general") {
    filteredData = filteredData.filter(f =>
      f.allowedPlans.length === 0 ||
      f.allowedPlans.some(p => p.name.toLowerCase() === "general")
    );
  }

  res.status(200).json({
    results: filteredData.length,
    totalFacilities,
    totalPages,
    currentPage: page,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
    userPlan: userPlanName || "none",
    data: filteredData,
  });
});

// ✅ Get single facility
exports.getFacility = asyncHandler(async (req, res, next) => {
  const facility = await Facility.findById(req.params.id)
    .populate("category", "name type")
    .populate("allowedPlans", "name");

  if (!facility) return next(new ApiError("Facility not found", 404));

  res.status(200).json({ data: facility });
});


// ✅ Create facility
exports.createFacility = asyncHandler(async (req, res, next) => {
  // 🧩 Parse FormData
  if (req.body.allowedPlans && typeof req.body.allowedPlans === "string") {
    try {
      req.body.allowedPlans = JSON.parse(req.body.allowedPlans);
    } catch {
      req.body.allowedPlans = [];
    }
  }

  if (req.body.schedules && typeof req.body.schedules === "string") {
    try {
      req.body.schedules = JSON.parse(req.body.schedules);
    } catch {
      req.body.schedules = [];
    }
  }

  // ✅ Validate category
  if (req.body.category) {
    const categoryExists = await Category.findById(req.body.category);
    if (!categoryExists)
      return next(new ApiError("Invalid category ID — category not found", 400));
  }

  // ✅ Validate plans
  if (req.body.allowedPlans?.length > 0) {
    const foundPlans = await MembershipPlan.find({ _id: { $in: req.body.allowedPlans } });
    if (foundPlans.length !== req.body.allowedPlans.length)
      return next(new ApiError("One or more plan IDs are invalid", 400));
  }

  const facility = await Facility.create(req.body);
  res.status(201).json({ data: facility });
});


// ✅ Update facility
exports.updateFacility = asyncHandler(async (req, res, next) => {
  if (req.body.allowedPlans && typeof req.body.allowedPlans === "string") {
    try {
      req.body.allowedPlans = JSON.parse(req.body.allowedPlans);
    } catch {
      req.body.allowedPlans = [];
    }
  }

  if (req.body.schedules && typeof req.body.schedules === "string") {
    try {
      req.body.schedules = JSON.parse(req.body.schedules);
    } catch {
      req.body.schedules = [];
    }
  }

  const facility = await Facility.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!facility) return next(new ApiError("Facility not found", 404));

  res.status(200).json({ data: facility });
});


// ✅ Delete facility
exports.deleteFacility = asyncHandler(async (req, res, next) => {
  const facility = await Facility.findByIdAndDelete(req.params.id);
  if (!facility) return next(new ApiError("Facility not found", 404));
  res.status(204).send();
});
