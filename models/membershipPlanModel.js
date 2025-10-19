// models/membershipPlanModel.js
const mongoose = require("mongoose");

const membershipPlanSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      enum: ["general", "vip"],
      required: true,
    },
    // monthly/yearly only matters for VIP plans
    type: {
      type: String,
      enum: ["monthly", "yearly"],
    },
    memberShipDescripe: String,
    price: {
      type: String,
      required: true,
    },
    priceAdvantage: String,
    permissions: {
      type: [String],
      default: [],
    },
    // عدد الأيام التي تستمر فيها العضوية بعد التفعيل
    durationDays: {
      type: Number
    },
    description: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("MembershipPlan", membershipPlanSchema);
