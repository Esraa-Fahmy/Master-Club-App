const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.ObjectId, ref: "User", required: true },

    items: [
      {
        product: { type: mongoose.Schema.ObjectId, ref: "Product", required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true }, // السعر وقت الطلب
      },
    ],

    // 🏠 عنوان الشحن
    shippingAddress: {
      label: { type: String, required: true },
      details: { type: String, required: true },
    },

    // 💳 الدفع
    paymentMethod: {
      type: { type: String, enum: ["card", "paypal", "cod"], required: true },
      provider: String,
      last4: String,
    },

    // 💰 إجمالي السعر
    totalPrice: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    finalPrice: { type: Number, required: true },

    // 📦 حالة الطلب
    status: {
      type: String,
      enum: ["pending", "confirmed", "delivered", "cancelled", "completed"],
      default: "pending",
    },

    // 🕒 تواريخ مهمة
    deliveredAt: Date,
    cancelledAt: Date,
    completedAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
