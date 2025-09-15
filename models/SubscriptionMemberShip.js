// models/membershipSubscriptionModel.js
const mongoose = require("mongoose");

const membershipSubscriptionSchema = new mongoose.Schema(
  {
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

    // activation dates
    startDate: Date,
    expiresAt: Date,

    // workflow status
    status: {
      type: String,
      enum: [
        "pending_id_verification",   // مستخدم سجل VIP و منتظر يدخل رقم البطاقة
        "awaiting_confirmation",     // الادمن قبِل -> المستخدم لازم يؤكد خلال 15 دقيقة
        "active",                    // مفعل
        "expired",                   // انتهى
        "rejected",                  // الادمن رفض
        "cancelled_by_user"          // المستخدم ألغى الاشتراك
      ],
      default: "pending_id_verification",
    },

    // national id (entered by user for VIP)
    nationalId: { type: String },

    // timers and QR
    confirmationExpiresAt: Date, // انتهاء الـ 15 دقيقة بعد موافقة الادمن
    qrCode: String,             // dataURL of generated QR (image)
    qrCodeExpiresAt: Date,      // صلاحية الـ QR الحالية

    // audit
    lastAccessAt: Date,
    accessGranted: { type: Boolean, default: false },

    // usage & points
    visitsUsed: { type: Number, default: 0 },
    points: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("MembershipSubscription", membershipSubscriptionSchema);
