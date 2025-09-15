const mongoose = require("mongoose");


const bookingSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // ممكن يحجز Activity أو Facility
    activity: { type: mongoose.Schema.Types.ObjectId, ref: "Activity" },
    facility: { type: mongoose.Schema.Types.ObjectId, ref: "Facility" },

    date: { type: Date, required: true }, // ميعاد الحجز
    timeSlot: { type: String }, // مثلاً "10:00 AM - 11:00 AM"

    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "completed"],
      default: "pending",
    },

    price: { type: Number, required: true },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid", "refunded"],
      default: "unpaid",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Booking", bookingSchema);
