const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Activity title is required"],
    },
    description: {
      type: String,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true, 
    },
    price: {
      type: Number,
      required: true,
    },
    images: [String],
    location: {
      type: String,
    },
    availableDates: [Date],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Activity", activitySchema);
