// models/wishlistModel.js
const mongoose = require("mongoose");

const wishlistSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: true,
    },
    item: [{
      type: mongoose.Schema.ObjectId,
      required: true,
      refPath: "itemType", // ديناميك على حسب النوع
    }],
    itemType: [{
      type: String,
      required: true,
      enum: ["Activity", "Facility", "Product"], // الأنواع اللي عندك
    }],
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Wishlist", wishlistSchema);
