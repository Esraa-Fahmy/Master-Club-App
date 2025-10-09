const Activity = require("../models/activityModel");
const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');
const { uploadMixOfImages } = require('../midlewares/uploadImageMiddleWare');
const fs = require('fs');
const MembershipPlan = require("../models/membershipPlanModel");

// ====== Image Upload & Resize ======
exports.uploadActivityImages = uploadMixOfImages([
    { name: 'EventImage', maxCount: 1 },
    { name: 'images', maxCount: 5 }
]);

exports.resizeActivityImages = asyncHandler(async (req, res, next) => {
    if (req.files.EventImage) {
        const EventImageFileName = `event-${uuidv4()}-${Date.now()}-cover.jpeg`;
        const path = "uploads/events/";
        if (!fs.existsSync(path)) fs.mkdirSync(path, { recursive: true });

        await sharp(req.files.EventImage[0].buffer)
            .toFormat('jpeg')
            .jpeg({ quality: 95 })
            .toFile(`${path}${EventImageFileName}`);
        req.body.EventImage = EventImageFileName;
    }

    if (req.files.images) {
        req.body.images = [];
        await Promise.all(req.files.images.map(async (img, index) => {
            const imageName = `activity-${uuidv4()}-${Date.now()}-${index + 1}.jpeg`;
            const path = "uploads/activities/";
            if (!fs.existsSync(path)) fs.mkdirSync(path, { recursive: true });

            await sharp(img.buffer)
                .toFormat('jpeg')
                .jpeg({ quality: 100 })
                .toFile(`${path}${imageName}`);
            req.body.images.push(imageName);
        }));
    }
    next();
});

// ====== SubCategory Middleware ======
exports.setSubCategoryIdToBody = (req, res, next) => {
  if (!req.body.subCategory) req.body.subCategory = req.params.subCategoryId;
  next();
};
// ====== Get Activities ======
exports.getActivities = asyncHandler(async (req, res) => {
  // 🟢 Pagination
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 10;
  const skip = (page - 1) * limit;

  // 🟢 Filter object
  let filter = {};
  if (req.query.category) filter.category = req.query.category;
  if (req.params.subCategoryId) filter.subCategory = req.params.subCategoryId;
  if (req.query.search) filter.title = { $regex: req.query.search, $options: "i" };

  // فلترة حسب التاريخ (schedules)
  if (req.query.date) {
    filter.schedules = { $elemMatch: { date: req.query.date } };
  }

  // 🟢 حساب العدد الكلي بعد الفلترة
  const totalActivities = await Activity.countDocuments(filter);
  const totalPages = Math.ceil(totalActivities / limit);

  // 🟢 الاستعلام مع الـ populate
  const activities = await Activity.find(filter)
    .skip(skip)
    .limit(limit)
    .populate("category", "name type")
    .populate("subCategory", "name category");

  res.status(200).json({
    results: activities.length,
    totalActivities,
    totalPages,
    currentPage: page,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
    data: activities,
  }); 
});


// ====== Get Single Activity ======
exports.getActivity = asyncHandler(async (req, res, next) => {
  const a = await Activity.findById(req.params.id)
    .populate("category", "name type")
    .populate("subCategory", "name category");

  if (!a) return next(new ApiError("Activity not found", 404));
  res.status(200).json({ data: a });
});

// ====== Create Activity ======
exports.createActivity = asyncHandler(async (req, res) => {
  // لو allowedPlans موجودة كـ string (من form-data)، حوّلها لـ array
  if (req.body.allowedPlans && typeof req.body.allowedPlans === 'string') {
    try {
      req.body.allowedPlans = JSON.parse(req.body.allowedPlans);
      if (!Array.isArray(req.body.allowedPlans)) {
        req.body.allowedPlans = []; // fallback لو مش array
      }
    } catch (err) {
      req.body.allowedPlans = []; // fallback لو JSON.parse فشل
    }
  }

  // لو VIP → اعبي allowedPlans تلقائي لو فاضية
  if (req.body.isVip) {
    const vipPlans = await MembershipPlan.find({ type: "VIP" });
    if (!req.body.allowedPlans || req.body.allowedPlans.length === 0) {
      req.body.allowedPlans = vipPlans.map(p => p._id);
    }
  }

  // تأكد من وجود schedules
  if (!req.body.schedules) req.body.schedules = [];

  const a = await Activity.create(req.body);
  res.status(201).json({ data: a });
});


// ====== Update Activity ======
exports.updateActivity = asyncHandler(async (req, res, next) => {
  // 🧩 لو allowedPlans جاي كـ string → نحوله Array
  if (req.body.allowedPlans && typeof req.body.allowedPlans === "string") {
    try {
      req.body.allowedPlans = JSON.parse(req.body.allowedPlans);
    } catch {
      req.body.allowedPlans = [];
    }
  }

  // 🧩 لو removePlans جاي كـ string → نحوله Array
  if (req.body.removePlans && typeof req.body.removePlans === "string") {
    try {
      req.body.removePlans = JSON.parse(req.body.removePlans);
    } catch {
      req.body.removePlans = [];
    }
  }

  // 🧩 نحول القيم اللي بتتبعت من form-data كنصوص للي نوعها الحقيقي
  if (req.body.isEvent !== undefined) {
    req.body.isEvent = req.body.isEvent === "true" || req.body.isEvent === true;
  }

  if (req.body.isVip !== undefined) {
    req.body.isVip = req.body.isVip === "true" || req.body.isVip === true;
  }

  if (req.body.isRecommended !== undefined) {
    req.body.isRecommended = req.body.isRecommended === "true" || req.body.isRecommended === true;
  }

  if (req.body.requiresPlayers !== undefined) {
    req.body.requiresPlayers =
      req.body.requiresPlayers === "true" || req.body.requiresPlayers === true;
  }

  // 🧩 نحول التواريخ
  if (req.body.startDate) req.body.startDate = new Date(req.body.startDate);
  if (req.body.endDate) req.body.endDate = new Date(req.body.endDate);

  // 🧩 نبني object التحديث
  const updateOps = { ...req.body };

  // 🧩 نضيف allowedPlans (لو موجود)
  if (req.body.allowedPlans && req.body.allowedPlans.length > 0) {
    updateOps.$addToSet = { allowedPlans: { $each: req.body.allowedPlans } };
  }

  // 🧩 نحذف من allowedPlans (لو موجود)
  if (req.body.removePlans && req.body.removePlans.length > 0) {
    updateOps.$pull = { allowedPlans: { $in: req.body.removePlans } };
  }

  // 🧩 نعمل التحديث
  const updated = await Activity.findByIdAndUpdate(req.params.id, updateOps, {
    new: true,
    runValidators: true,
  })
    .populate("category", "name type")
    .populate("subCategory", "name category")
    .populate("allowedPlans", "name type");

  if (!updated) return next(new ApiError("Activity not found", 404));

  res.status(200).json({ data: updated });
});



// ====== Delete Activity ======
exports.deleteActivity = asyncHandler(async (req, res, next) => {
  const a = await Activity.findByIdAndDelete(req.params.id);
  if (!a) return next(new ApiError("Activity not found", 404));
  res.status(204).send();
});
