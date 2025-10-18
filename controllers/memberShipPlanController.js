const MembershipPlan = require("../models/membershipPlanModel");
const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");

// @desc Create new plan
// @route POST /api/v1/membership-plans
// @access Admin
exports.createPlan = asyncHandler(async (req, res) => {
  const plan = await MembershipPlan.create(req.body);
  res.status(201).json({ status: "success", data: plan });
});

// @desc Get all plans (lightweight)
// @route GET /api/v1/membership-plans
/// GET /api/v1/plans?name=vip   أو  /api/v1/plans?name=general
exports.getPlans = asyncHandler(async (req, res) => {
  const { name } = req.query; // نقرأ النوع من الكويري

  // نجهز الفلتر
  const filter = {};
  if (name) {
    // نتأكد إن الاسم اللي جاي valid (يا vip يا general)
    const allowedNames = ["general", "vip"];
    if (!allowedNames.includes(name.toLowerCase())) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid plan name. Allowed values: vip or general",
      });
    }
    filter.name = name.toLowerCase();
  }

  // نجيب الخطط بناءً على الفلتر
  const plans = await MembershipPlan.find(filter, "name type price description permissions");

  // نجيب القيم المسموح بيها في enum
  const nameEnumValues = MembershipPlan.schema.path("name").enumValues;

  res.status(200).json({
    status: "success",
    results: plans.length,
    enums: {
      name: nameEnumValues, // ["general", "vip"]
    },
    data: plans,
  });
});


// @desc Get single plan with full details
// @route GET /api/v1/membership-plans/:id
// @access Public
exports.getPlan = asyncHandler(async (req, res, next) => {
  const plan = await MembershipPlan.findById(req.params.id);
  if (!plan) return next(new ApiError("Plan not found", 404));

  res.status(200).json({
    status: "success",
    data: {
      ...plan.toObject(),
      enums: {
        name: ["general", "vip"],
        type: ["monthly", "yearly"],
      },
    },
  });
});

// @desc Update plan
// @route PUT /api/v1/membership-plans/:id
exports.updatePlan = asyncHandler(async (req, res, next) => {
  const plan = await MembershipPlan.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  if (!plan) return next(new ApiError("Plan not found", 404));
  res.status(200).json({ status: "success", data: plan });
});

// @desc Delete plan
// @route DELETE /api/v1/membership-plans/:id
exports.deletePlan = asyncHandler(async (req, res, next) => {
  const plan = await MembershipPlan.findByIdAndDelete(req.params.id);
  if (!plan) return next(new ApiError("Plan not found", 404));
  res.status(204).send();
});
