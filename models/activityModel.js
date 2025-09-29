const mongoose = require("mongoose");

const slotSchema = new mongoose.Schema({
  id: { type: String }, // uuid يمكن إنشاؤه من السيرفر
  time: { type: String, required: true }, // "10:00-11:00"
  capacity: { type: Number, default: 1 },
  reserved: { type: Number, default: 0 } // عدد المحجوز حتى الآن
}, { _id: false });

const scheduleSchema = new mongoose.Schema({
  date: { type: String, required: true }, // حفظ كـ YYYY-MM-DD للسهل
  slots: { type: [slotSchema], default: [] }
}, { _id: false });

const activitySchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    price: { type: Number, required: true },
    images: [String],
    location: String,


      // Events خصائص خاصة بـ
    isEvent: { type: Boolean, default: false },
    isVip: { type: Boolean, default: false },
    startDate: Date,
    endDate: Date,
    image: String,

    
    availableDates: [Date], // legacy / optional
    allowedPlans: [{ type: mongoose.Schema.ObjectId, ref: "MembershipPlan" }],
    schedules: { type: [scheduleSchema], default: [] }, // new
    capacityPerSlot: { type: Number }, // optional global default
    requiresPlayers: { type: Boolean, default: false } // لو النشاط يحتاج عدد لاعبين
  },
  { timestamps: true }
);

module.exports = mongoose.model("Activity", activitySchema);
