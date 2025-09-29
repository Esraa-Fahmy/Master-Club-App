const Activity = require("../models/activityModel");
const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");

// GET /activities
// supports ?category=, ?search=, ?date=
exports.getActivities = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.category) filter.category = req.query.category;
  if (req.query.search) filter.title = { $regex: req.query.search, $options: "i" };
  if (req.query.date) {
    const d = new Date(req.query.date);
    filter.availableDates = { $in: [d.toISOString().split("T")[0], d] };
    // simpler: front-end can filter by date
  }

  const activities = await Activity.find(filter).populate("category", "name type");
  res.status(200).json({ results: activities.length, data: activities });
});

exports.getActivity = asyncHandler(async (req, res, next) => {
  const a = await Activity.findById(req.params.id).populate("category", "name type");
  if (!a) return next(new ApiError("Activity not found", 404));
  res.status(200).json({ data: a });
});

exports.createActivity = asyncHandler(async (req, res) => {
  const a = await Activity.create(req.body);
  res.status(201).json({ data: a });
});

exports.updateActivity = asyncHandler(async (req, res, next) => {
  const a = await Activity.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!a) return next(new ApiError("Activity not found", 404));
  res.status(200).json({ data: a });
});

exports.deleteActivity = asyncHandler(async (req, res, next) => {
  const a = await Activity.findByIdAndDelete(req.params.id);
  if (!a) return next(new ApiError("Activity not found", 404));
  res.status(204).send();
});
