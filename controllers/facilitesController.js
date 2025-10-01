const Facility = require("../models/facilityModel");
const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const SubscripeMembership = require("../models/SubscriptionMemberShip");
const { v4: uuidv4 } = require("uuid");
const sharp = require("sharp");
const { uploadMixOfImages } = require("../midlewares/uploadImageMiddleWare");
const fs = require("fs");

// Upload images
exports.uploadFacilityImages = uploadMixOfImages([
  { name: "images", maxCount: 5 },
]);

// Resize images
exports.resizeFacilityImages = asyncHandler(async (req, res, next) => {
  if (req.files.images) {
    req.body.images = [];
    await Promise.all(
      req.files.images.map(async (img, index) => {
        const imageName = `Facility-${uuidv4()}-${Date.now()}-${index + 1}.jpeg`;
        const path = "uploads/facilities/";
        if (!fs.existsSync(path)) {
          fs.mkdirSync(path, { recursive: true });
        }
        await sharp(img.buffer)
          .toFormat("jpeg")
          .jpeg({ quality: 100 })
          .toFile(`uploads/facilities/${imageName}`);
        req.body.images.push(imageName);
      })
    );
  }
  next();
});

// ====== Get All Facilities with Pagination + Filter ======
exports.getFacilities = asyncHandler(async (req, res) => {
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 10;
  const skip = (page - 1) * limit;

  let filter = {};
  if (req.query.category) filter.category = req.query.category;
  if (req.query.search) filter.name = { $regex: req.query.search, $options: "i" };

  let facilities = await Facility.find(filter)
    .skip(skip)
    .limit(limit)
    .populate("category", "name type")
    .populate("allowedPlans", "name");

  const totalFacilities = await Facility.countDocuments(filter);
  const totalPages = Math.ceil(totalFacilities / limit);

  // ✅ General Facilities
  if (req.query.mode === "general") {
    facilities = facilities.filter((f) => f.allowedPlans.length === 0);
  }

  // ✅ VIP Facilities
  if (req.query.mode === "vip") {
    facilities = facilities.filter((f) =>
      f.allowedPlans.some((p) => p.name.toLowerCase() === "vip")
    );
  }

  // ✅ فلترة حسب خطة العضو (لو مسجل دخول)
  if (req.user) {
    const subscription = await SubscripeMembership.findOne({
      user: req.user._id,
      status: "active",
    }).populate("plan");

    if (subscription) {
      const userPlanId = subscription.plan._id.toString();
      facilities = facilities.filter(
        (f) =>
          f.allowedPlans.length === 0 ||
          f.allowedPlans.some((p) => p._id.toString() === userPlanId)
      );
    } else {
      facilities = []; // مفيش اشتراك نشط
    }
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

// ====== Get Single Facility ======
exports.getFacility = asyncHandler(async (req, res, next) => {
  const f = await Facility.findById(req.params.id)
    .populate("category", "name type")
    .populate("allowedPlans", "name");
  if (!f) return next(new ApiError("Facility not found", 404));
  res.status(200).json({ data: f });
});

// ====== Create Facility ======
exports.createFacility = asyncHandler(async (req, res) => {
  const f = await Facility.create(req.body);
  res.status(201).json({ data: f });
});

// ====== Update Facility ======
exports.updateFacility = asyncHandler(async (req, res, next) => {
  const f = await Facility.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!f) return next(new ApiError("Facility not found", 404));
  res.status(200).json({ data: f });
});

// ====== Delete Facility ======
exports.deleteFacility = asyncHandler(async (req, res, next) => {
  const f = await Facility.findByIdAndDelete(req.params.id);
  if (!f) return next(new ApiError("Facility not found", 404));
  res.status(204).send();
});
