const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: true,
    },
    items: [
      {
        product: {
          type: mongoose.Schema.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: { type: Number, default: 1 },
      },
    ],
    totalPrice: { type: Number, default: 0 },
    discount: { type: Number, default: 0 }, // لو فيه كوبون
    finalPrice: { type: Number, default: 0 }, // total بعد الخصم
  },
  { timestamps: true }
);

module.exports = mongoose.model("Cart", cartSchema);
