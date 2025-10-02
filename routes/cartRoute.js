// routes/cartRoutes.js
const express = require("express");
const router = express.Router();
const controller = require("../controllers/cartController");
const { protect, allowedTo } = require("../controllers/authController");

router
  .route("/")
  .get(protect, allowedTo("user"), controller.getCart)       // 🛍 عرض الكارت
  .post(protect, allowedTo("user"), controller.addToCart)    // ➕ إضافة منتج للكارت
  .delete(protect, allowedTo("user"), controller.removeFromCart); // ❌ إزالة منتج من الكارت

module.exports = router;
