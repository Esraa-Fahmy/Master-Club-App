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
exports.getPlans = asyncHandler(async (req, res) => {
  const { name } = req.query;

  const filter = {};

  if (name) {
    const allowedNames = ["general", "vip"];
    const lowerName = name.toLowerCase();

    if (!allowedNames.includes(lowerName)) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid plan name. Allowed values: vip or general",
      });
    }

    filter.name = lowerName;
  }

  // هنا أضفنا durationDays
  const plans = await MembershipPlan.find(filter).select(
    "name type memberShipDescripe price priceAdvantage description permissions durationDays"
  );

  const nameEnumValues = MembershipPlan.schema.path("name").enumValues;
  const typeEnumValues = MembershipPlan.schema.path("type").enumValues;

  res.status(200).json({
    status: "success",
    results: plans.length,
    enums: {
      name: nameEnumValues,
      type: typeEnumValues,
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

  const nameEnumValues = MembershipPlan.schema.path("name").enumValues;
  const typeEnumValues = MembershipPlan.schema.path("type").enumValues;

  res.status(200).json({
    status: "success",
    data: {
      ...plan.toObject(),
      enums: {
        name: nameEnumValues,
        type: typeEnumValues,
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