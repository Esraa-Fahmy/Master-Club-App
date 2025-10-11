// routes/productRoutes.js
const express = require("express");
const router = express.Router();
const controller = require("../controllers/productController");
const { protect, allowedTo } = require("../controllers/authController");

router
  .route("/")
  .get(protect, controller.getProducts)                           // 📜 كل المنتجات
  .post(protect, allowedTo("admin"), controller.uploadProductImages, controller.resizeProductImages, controller.createProduct); // ➕ إنشاء منتج (أدمن فقط)

router
  .route("/:id")
  .get(protect , controller.getProduct)                           // 📌 منتج واحد
  .patch(protect, allowedTo("admin"), controller.uploadProductImages, controller.resizeProductImages, controller.updateProduct) // ✏️ تحديث منتج (أدمن فقط)
  .delete(protect, allowedTo("admin"), controller.deleteProduct); // ❌ حذف منتج (أدمن فقط)

module.exports = router;
