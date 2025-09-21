const mongoose = require("mongoose");

const facilitySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Facility name is required"],
    },
    description: {
      type: String,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    images: [String],
    location: {
      type: String,
    },
    openingHours: {
      type: String, 
    },
    allowedPlans: [
  {
    type: mongoose.Schema.ObjectId,
    ref: "MembershipPlan", // خطة الاشتراك اللي تدي صلاحية الوصول
  },
],

  },
  { timestamps: true }
);

module.exports = mongoose.model("Facility", facilitySchema);
