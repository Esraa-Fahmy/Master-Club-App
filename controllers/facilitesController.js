const Facility = require("../models/facilityModel");
const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const SubscripeMembership = require("../models/SubscriptionMemberShip")

// GET /facilities
// supports query ?category=ID & ?search=term
exports.getFacilities = asyncHandler(async (req, res) => {
  let filter = {};
  if (req.query.category) filter.category = req.query.category;
  if (req.query.search) filter.name = { $regex: req.query.search, $options: "i" };

  let facilities = await Facility.find(filter).populate("category", "name type allowedPlans");

  // لو فيه يوزر داخل، فلتر المتاحة حسب خطته
  if (req.user) {
    const subscription = await SubscripeMembership.findOne({
      user: req.user._id,
      status: "active",
    }).populate("plan");

    if (subscription) {
      const userPlanId = subscription.plan._id.toString();
      facilities = facilities.filter(f =>
        f.allowedPlans.some(p => p._id.toString() === userPlanId)
      );
    } else {
      facilities = []; // مفيش اشتراك نشط
    }
  }

  res.status(200).json({ results: facilities.length, data: facilities });
});


exports.getFacility = asyncHandler(async (req, res, next) => {
  const f = await Facility.findById(req.params.id).populate("category", "name type");
  if (!f) return next(new ApiError("Facility not found", 404));
  res.status(200).json({ data: f });
});

exports.createFacility = asyncHandler(async (req, res) => {
  // admin decides availability or linked membership via request body in future
  const f = await Facility.create(req.body);
  res.status(201).json({ data: f });
});

exports.updateFacility = asyncHandler(async (req, res, next) => {
  const f = await Facility.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!f) return next(new ApiError("Facility not found", 404));
  res.status(200).json({ data: f });
});

exports.deleteFacility = asyncHandler(async (req, res, next) => {
  const f = await Facility.findByIdAndDelete(req.params.id);
  if (!f) return next(new ApiError("Facility not found", 404));
  res.status(204).send();
});
