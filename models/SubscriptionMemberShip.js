const mongoose = require("mongoose");

function generateSubscriptionId() {
  const prefix = "AH";
  const random = Math.floor(100 + Math.random() * 900); // 3 digits
  return `${prefix}-${random}`;
}

const membershipSubscriptionSchema = new mongoose.Schema(
  {
    subscriptionId: {
      type: String,
      unique: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MembershipPlan",
      required: true,
    },
    startDate: Date,
    expiresAt: Date,
    status: {
      type: String,
      enum: [
        "pending_id_verification",
        "awaiting_confirmation",
        "active",
        "expired",
        "rejected",
        "cancelled_by_user"
      ],
      default: "pending_id_verification",
    },
    nationalId: { type: String },
    confirmationExpiresAt: Date,
    qrCode: String,
    qrCodeExpiresAt: Date,
    lastAccessAt: Date,
    accessGranted: { type: Boolean, default: false },
    rejectionReason: { type: String },
    rejectedAt: { type: Date },
    visitsUsed: { type: Number, default: 0 },
    points: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("MembershipSubscription", membershipSubscriptionSchema);
