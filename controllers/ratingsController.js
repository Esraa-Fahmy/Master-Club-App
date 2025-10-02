const Review = require("../models/ratingModel");
const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");

// ✅ Add Review
exports.createReview = asyncHandler(async (req, res) => {
  const review = await Review.create({
    user: req.user._id,
    product: req.body.product,
    rating: req.body.rating,
  });

  res.status(201).json({ data: review });
});

// ✅ Get Reviews by Product
exports.getReviewsByProduct = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ product: req.params.productId })
    .populate("user", "userName profileImg");

  res.status(200).json({
    results: reviews.length,
    data: reviews,
  });
});

// ✅ Delete Review
exports.deleteReview = asyncHandler(async (req, res, next) => {
  const review = await Review.findByIdAndDelete(req.params.id);
  if (!review) return next(new ApiError("Review not found", 404));
  res.status(204).send();
});
