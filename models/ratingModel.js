const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: true,
    },
    product: {
      type: mongoose.Schema.ObjectId,
      ref: "Product",
      required: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },

  },
  { timestamps: true }
);

// 📌 تحديث متوسط التقييم وعدد التقييمات بعد كل حفظ
reviewSchema.statics.calcAverageRatings = async function (productId) {
  const stats = await this.aggregate([
    { $match: { product: productId } },
    {
      $group: {
        _id: "$product",
        avgRating: { $avg: "$rating" },
        numReviews: { $sum: 1 },
      },
    },
  ]);

  if (stats.length > 0) {
    await mongoose.model("Product").findByIdAndUpdate(productId, {
      averageRating: stats[0].avgRating,
      numReviews: stats[0].numReviews,
    });
  } else {
    await mongoose.model("Product").findByIdAndUpdate(productId, {
      averageRating: 0,
      numReviews: 0,
    });
  }
};

reviewSchema.post("save", function () {
  this.constructor.calcAverageRatings(this.product);
});

reviewSchema.post("remove", function () {
  this.constructor.calcAverageRatings(this.product);
});

module.exports = mongoose.model("Review", reviewSchema);
