// routes/reviewRoutes.js
const express = require("express");
const router = express.Router();
const controller = require("../controllers/ratingsController");
const { protect, allowedTo } = require("../controllers/authController");

router
  .route("/")
  .post(protect, allowedTo("user"), controller.createReview); // ➕ إضافة تقييم

router
  .route("/product/:productId")
  .get(protect, controller.getReviewsByProduct); // 📜 جلب التقييمات لمنتج

router
  .route("/:id")
  .delete(protect, allowedTo("user", "admin"), controller.deleteReview); // ❌ حذف تقييم

module.exports = router;
