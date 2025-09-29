const express = require("express");
const router = express.Router();
const controller = require("../controllers/notificationsController");
const { protect, allowedTo } = require("../controllers/authController");

router.get("/", protect, allowedTo("user"), controller.getMyNotifications);
router.put("/mark-all", protect, allowedTo("user"), controller.markAllAsRead);
router.delete("/:id", protect, allowedTo("user"), controller.deleteNotification);

module.exports = router;
