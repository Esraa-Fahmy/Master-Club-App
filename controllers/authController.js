const User = require("../models/userModel");
const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");
const {createToken} = require("../utils/createToken");
const { v4: uuidv4 } = require("uuid");


// @desc    Signup
// @route   GET /api/v1/auth/signup
// @access  Public
exports.signup = asyncHandler(async (req, res, next) => {
  // 1- Create user
  const user = await User.create({
    userName: req.body.userName,
    email: req.body.email,
    password: req.body.password,
    phone: req.body.phone,
  });
  user.password = undefined;
  const token = createToken(user._id);

  res.status(201).json({ data: user, token });
});

// @desc    Login
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return next(new ApiError("Invalid email or password", 401));
  }

  const token = createToken(user._id);

  // بيانات الجهاز من الهيدر
  const userAgent = req.headers["user-agent"] || "unknown";
  const ip = req.ip || req.connection.remoteAddress;

  // نحدد مفتاح ثابت للجهاز
  const deviceKey = `${userAgent}-${ip}`;

  // نشوف هل الجهاز ده موجود قبل كده؟
  const existingDevice = user.devices.find(
    (d) => `${d.deviceType}-${d.ip}` === deviceKey
  );

  if (existingDevice) {
    // لو موجود → نحدث بياناته
    existingDevice.lastLogin = new Date();
    existingDevice.token = token;
  } else {
    // لو مش موجود → نضيفه كجهاز جديد
    user.devices.push({
      deviceId: uuidv4(),
      deviceType: userAgent,
      os: userAgent,
      ip,
      lastLogin: new Date(),
      token,
    });
  }

  await user.save();

  res.status(200).json({ token });
});



// @desc   make sure the user is logged in
exports.protect = asyncHandler(async (req, res, next) => {
  // 1) Check if token exist, if exist get

  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }
  if (!token) {
    return next(
      new ApiError(
        "You are not login, Please login to get access this route",
        401
      )
    );
  }

  // 2) Verify token (no change happens, expired token)
  const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);


  // 3) Check if user exists
  const currentUser = await User.findById(decoded.userId);
  if (!currentUser) {
    return next(
      new ApiError(
        "The user that belong to this token does no longer exist",
        401
      )
    );
  }

  // 4) Check if user change his password after token created
  if (currentUser.passwordChangedAt) {
    const passChangedTimestamp = parseInt(
      currentUser.passwordChangedAt.getTime() / 1000,
      10
    );
    // Password changed after token created (Error)
    if (passChangedTimestamp > decoded.iat) {
      return next(
        new ApiError(
          "User recently changed his password. please login again..",
          401
        )
      );
    }
  }

  req.user = currentUser;
  next();
});

// @desc  Authorization (User Permissions)
// ["admin"]
exports.allowedTo = (...roles) =>
  asyncHandler(async (req, res, next) => {
    // 2) access registered user (req.user.role)
    if (!roles.includes(req.user.role)) {
      return next(
        new ApiError("You are not allowed to access this route", 403)
      );
    }
    next();
  });

// @desc    Forgot password
// @route   POST /api/v1/auth/forgotPassword
// @access  Public
exports.forgotPassword = asyncHandler(async (req, res, next) => {
  // 1) Get user by email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(
      new ApiError(`There is no user with that email ${req.body.email}`, 404)
    );
  }
  // 2) If user exist, Generate hash reset random 4 digits and save it in db
  const resetCode = Math.floor(1000 + Math.random() * 9000).toString();
  const hashedResetCode = crypto
    .createHash("sha256")
    .update(resetCode)
    .digest("hex");

  // Save hashed password reset code into db
  user.passwordResetCode = hashedResetCode;
  // Add expiration time for password reset code (10 min)
  user.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  user.passwordResetVerified = false;

  await user.save();

  // 3) Send the reset code via email
  const message = `
  <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px; border: 1px solid #ddd; border-radius: 10px; background-color: #f9f9f9;">
    <h2 style="color: #333;">🔐 Password Reset Request</h2>
    <p style="font-size: 16px; color: #555;">
      Hi <strong>${user.userName}</strong>,<br>
      We received a request to reset the password on your <strong>Master-Club App</strong> Account.
    </p>
    <p style="font-size: 20px; font-weight: bold; color: #ff6b6b; letter-spacing: 2px; background-color: #fff; display: inline-block; padding: 10px 20px; border-radius: 5px; border: 1px solid #ff6b6b;">
      ${resetCode}
    </p>
    <p style="font-size: 14px; color: #777; margin-top: 20px;">
      Enter this code to complete the reset password.<br>
      Thanks for helping us keep your account secure.
    </p>
    <p style="font-size: 14px; color: #aaa;">
      The <strong>Master-Club</strong> Team
    </p>
  </div>
`;

try {
  await sendEmail({
    email: user.email,
    subject: "🔑 Your Password Reset Code (Valid for 10 min)",
    message, // رسالة الإيميل بصيغة HTML
    html: message, // أضيفي هذا السطر لإرسال الرسالة بتنسيق HTML
  });
} catch (err) {
  user.passwordResetCode = undefined;
  user.passwordResetExpires = undefined;
  user.passwordResetVerified = undefined;

  await user.save();
  return next(new ApiError("There is an error in sending email", 500));
}



  res
    .status(200)
    .json({ status: "Success", message: "Reset code sent to email" });
});

// @desc    Verify password reset code
// @route   POST /api/v1/auth/verifyResetCode
// @access  Public
exports.verifyPassResetCode = asyncHandler(async (req, res, next) => {
  // 1) Get user based on reset code
  const hashedResetCode = crypto
    .createHash("sha256")
    .update(req.body.resetCode)
    .digest("hex");

  const user = await User.findOne({
    passwordResetCode: hashedResetCode,
    passwordResetExpires: { $gt: Date.now() },
  });
  if (!user) {
    return next(new ApiError("Reset code invalid or expired"));
  }

  // 2) Reset code valid
  user.passwordResetVerified = true;
  await user.save();

  res.status(200).json({
    status: "Success",
  });
});

// @desc    Reset password
// @route   POST /api/v1/auth/resetPassword
// @access  Public
exports.resetPassword = asyncHandler(async (req, res, next) => {
  const { newPassword, confirmNewPassword } = req.body;

  if (!newPassword || !confirmNewPassword) {
    return next(
      new ApiError("New password and confirmation are required", 400)
    );
  }

  if (newPassword !== confirmNewPassword) {
    return next(new ApiError("Passwords do not match", 400));
  }

  const user = await User.findOne({
    passwordResetVerified: true,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    return next(new ApiError("Invalid or expired reset code", 400));
  }

  user.password = newPassword;
  user.passwordResetCode = undefined;
  user.passwordResetExpires = undefined;
  user.passwordResetVerified = undefined;

  await user.save();

  const token = createToken(user._id);
  res.status(200).json({
    status: "success",
    message: "Password reset successfully",
    token,
  });
});



