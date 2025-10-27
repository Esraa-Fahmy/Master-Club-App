// controllers/notificationController.js
const Notification = require("../models/notificationsModel");
const asyncHandler = require("express-async-handler");

exports.getMyNotifications = asyncHandler(async (req, res) => {
  const notifs = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.status(200).json({ results: notifs.length, data: notifs });
});

exports.markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id }, { isRead: true });
  res.status(200).json({ message: "All marked as read" });
});

exports.deleteNotification = asyncHandler(async (req, res) => {
  await Notification.findByIdAndDelete(req.params.id);
  res.status(200).json({ message: "Notification deleted" });
});

// ✅ Check unread notifications
exports.hasUnreadNotifications = asyncHandler(async (req, res) => {
  const unreadCount = await Notification.countDocuments({
    user: req.user._id,
    isRead: false,
  });

  res.status(200).json({ unreadCount: unreadCount > 0,
    count : unreadCount,
   });
});