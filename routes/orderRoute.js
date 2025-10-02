const express = require("express");
const {
  createOrder,
  getUserOrders,
  updateOrderStatus,
} = require("../controllers/orderController");

const { protect, allowedTo } = require("../controllers/authController");

const router = express.Router();

// ✅ المستخدم العادي يقدر يعمل أوردر ويشوف أوردراته
router.use(protect);

router
  .route("/")
  .post(createOrder) // إنشاء أوردر
  .get(getUserOrders); // جلب أوردرات المستخدم

// ✅ الأدمن فقط يقدر يعدل حالة الأوردر
router.patch(
  "/:id/status",
  allowedTo("admin"), // مسموح للأدمن فقط
  updateOrderStatus
);

module.exports = router;
