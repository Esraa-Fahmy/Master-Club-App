// routes/couponRoutes.js
const express = require("express");
const router = express.Router();
const controller = require("../controllers/couponController");
const { protect, allowedTo } = require("../controllers/authController");

router
  .route("/")
  .post(protect, allowedTo("admin"), controller.createCoupon); // ✨ إنشاء كوبون (أدمن فقط)

router
  .route("/validate")
  .post(protect, allowedTo("user"), controller.validateCoupon); // ✅ تحقق من الكوبون

router
  .route("/:id")
  .delete(protect, allowedTo("admin"), controller.deleteCoupon); // ❌ حذف كوبون (أدمن فقط)

module.exports = router;
