const mongoose = require("mongoose");

const slotSchema = new mongoose.Schema({
  id: { type: String },
  time: { type: String, required: true },
  capacity: { type: Number, default: 1 },
  reserved: { type: Number, default: 0 }
}, { _id: false });

const scheduleSchema = new mongoose.Schema({
  date: { type: String, required: true },
  slots: { type: [slotSchema], default: [] }
}, { _id: false });

const facilitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: String,
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    images: [String],
    location: String,
    openingHours: String,
    allowedPlans: [{ type: mongoose.Schema.ObjectId, ref: "MembershipPlan" }],
    schedules: { type: [scheduleSchema], default: [] },
    capacityPerSlot: { type: Number }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Facility", facilitySchema);
