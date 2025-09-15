const Notification = require("../models/notificationsModel");
const { getIo, getOnlineUsers } = require("../utils/socket");

exports.sendNotification = async (userId, title, message, type = "membership") => {
  // 🔹 1) خزّن في DB
  const notif = await Notification.create({ user: userId, title, message, type });

  // 🔹 2) ابعته لحظيًا لو المستخدم أونلاين
  const io = getIo();
  const onlineUsers = getOnlineUsers();
  const socketId = onlineUsers.get(userId.toString());

  if (socketId && io) {
    io.to(socketId).emit("notification", notif);
    console.log(`📩 Sent real-time notification to user ${userId}`);
  }
};
