// routes/membershipSubscriptionRoute.js
const express = require("express");
const router = express.Router();
const { protect, allowedTo } = require("../controllers/authController");
const controller = require("../controllers/subScriptionMemberShipController");

// 🟢 User subscribes to membership
router.post("/", protect, allowedTo("user"), controller.subscribe);

// 🟢 User adds National ID to subscription
router.put("/:id/national-id", protect, allowedTo("user"), controller.addNationalId);

// 🔵 Admin approves subscription
router.put("/:id/approve", protect, allowedTo("admin"), controller.approveSubscription);

// 🟢 User confirms subscription (مثلاً بعد الدفع أو التفعيل)
router.put("/:id/confirm", protect, allowedTo("user"), controller.confirmSubscription);

// 🟢 User gets their QR code
router.get("/my-qr", protect, allowedTo("user"), controller.getMyQr);

// 🟢 User refreshes QR code
router.put("/:id/refresh-qr", protect, allowedTo("user"), controller.refreshQr);

// 🟢 QR scan (used by scanner to validate access)
router.post("/scan-qr", controller.scanQr);

// 🟢 User cancels subscription
router.put("/:id/cancel", protect, allowedTo("user"), controller.cancelSubscription);

module.exports = router;
