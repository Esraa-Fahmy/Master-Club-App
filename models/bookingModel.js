const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  activity: { type: mongoose.Schema.Types.ObjectId, ref: "Activity" },
  facility: { type: mongoose.Schema.Types.ObjectId, ref: "Facility" },
  date: { type: String, required: true }, // YYYY-MM-DD
  timeSlot: { type: String, required: true }, // "10:00-11:00"
  slotId: { type: String }, // link to schedule slot id
  guests: { type: Number, default: 1 }, // عدد الأشخاص في الحجز
  specialRequest: { type: String, default: "" },
  status: { type: String, enum: ["pending", "confirmed", "cancelled", "completed"], default: "pending" },
  price: { type: Number, required: true },
  paymentStatus: { type: String, enum: ["unpaid", "paid", "refunded"], default: "unpaid" },
  isPrivate: { type: Boolean, default: false }, // true = المكان كله للحجز ده

}, { timestamps: true });

module.exports = mongoose.model("Booking", bookingSchema);
