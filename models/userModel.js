const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema(
  {
    userName: { type: String, required: [true, "User name required"] },
    email: { type: String, required: [true, "Email required"], unique: true, lowercase: true },
    password: { type: String, required: [true, "Password required"], minlength: [6, "Too short password"], select: false },
    phone: String,
    role: { type: String, enum: ["user", "admin"], default: "user" },
    profileImg: String,

    membershipSubscription: {
      type: mongoose.Schema.ObjectId,
      ref: "MembershipSubscription",
    },

    // 🏠 Saved Addresses
    addresses: [
      {
        label: String,
        details: String,
      }
    ],

    // 💳 Payment Methods
    paymentMethods: [
      {
        type: { type: String, enum: ["card", "paypal"] },
        provider: String,
        last4: String,
      }
    ],

    //Orders
    orders: [{ type: mongoose.Schema.ObjectId, ref: "Order" }],
 devices: {
  type: [
    {
      deviceId: String,
      deviceType: String,
      os: String,
      ip: String,
      lastLogin: Date,
      token: String,
    }
  ],
  default: []
}
,
    //Recent Activities
    recentActivities: [
      {
        activity: String,
        date: Date,
        durationMinutes: Number,
      }
    ],

    //Points
    points: { type: Number, default: 0 },

    //Language
    language: { type: String, enum: ["en", "ar"], default: "en" },

    passwordChangedAt: Date,
    passwordResetCode: String,
    passwordResetExpires: Date,
    passwordResetVerified: Boolean,
   
  },
  { timestamps: true }
);

// 🔑 Hash password before save
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

module.exports = mongoose.model("User", userSchema);
