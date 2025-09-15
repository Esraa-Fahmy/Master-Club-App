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
  },
  { timestamps: true }
);

module.exports = mongoose.model("Facility", facilitySchema);
