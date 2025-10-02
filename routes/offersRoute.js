// routes/offerRoutes.js
const express = require("express");
const router = express.Router();
const controller = require("../controllers/offerController");
const { protect, allowedTo } = require("../controllers/authController");

router
  .route("/")
  .get(protect, allowedTo("user", "admin"), controller.getActiveOffers) // 📜 جلب العروض
  .post(protect, allowedTo("admin"), controller.createOffer);           // ✨ إنشاء عرض (أدمن فقط)

router
  .route("/:id")
  .delete(protect, allowedTo("admin"), controller.deleteOffer); // ❌ حذف عرض (أدمن فقط)

module.exports = router;
