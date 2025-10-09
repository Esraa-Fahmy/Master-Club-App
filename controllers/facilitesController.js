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


// ✅ Get all facilities (with optional filtering)
exports.getFacilities = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  let filter = {};
  if (req.query.category) filter.category = req.query.category;
  if (req.query.search) filter.name = { $regex: req.query.search, $options: "i" };

  // ✅ نجيب كل الفاسيليتيز الأول
  let facilities = await Facility.find(filter)
    .skip(skip)
    .limit(limit)
    .populate("category", "name type")
    .populate("allowedPlans", "name");

  const totalFacilities = await Facility.countDocuments(filter);
  const totalPages = Math.ceil(totalFacilities / limit);


  // ✅ نحاول نجيب خطة المستخدم (لو عنده)
  const subscription = await SubscripeMembership.findOne({
    user: req.user._id,
    status: "active",
  }).populate("plan");

  let userPlanId = subscription?.plan?._id?.toString();

  // ✅ mode = vip/general
  if (req.query.mode === "vip") {
    facilities = facilities.filter(f =>
      f.allowedPlans.some(p => p.name?.toLowerCase().includes("vip"))
    );
  } else if (req.query.mode === "general") {
    facilities = facilities.filter(f => f.allowedPlans.length === 0);
  }

  // ✅ لو المستخدم عنده plan → رجعله المسموح له بس
  if (userPlanId) {
    facilities = facilities.filter(f =>
      f.allowedPlans.length === 0 ||
      f.allowedPlans.some(p => p._id.toString() === userPlanId)
    );
  } else {
    // لو ملوش plan → رجع العامة بس
    facilities = facilities.filter(f => f.allowedPlans.length === 0);
  }

  res.status(200).json({
    results: facilities.length,
    totalFacilities,
    totalPages,
    currentPage: page,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
    data: facilities,
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
