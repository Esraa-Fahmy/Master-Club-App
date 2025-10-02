const mongoose = require("mongoose");

const offerSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
    discountType: { type: String, enum: ["percentage", "fixed"], required: true },
    discountValue: { type: Number, required: true },
    category: { type: mongoose.Schema.ObjectId, ref: "Category" }, // خصم على كاتجوري
    products: [{ type: mongoose.Schema.ObjectId, ref: "Product" }], // خصم على منتجات معينة
    expiresAt: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Offer", offerSchema);
