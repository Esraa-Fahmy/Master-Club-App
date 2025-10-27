const jwt = require("jsonwebtoken");

let ioInstance;
const onlineUsers = new Map();

function initSocket(server) {
  const { Server } = require("socket.io");
  ioInstance = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  ioInstance.on("connection", (socket) => {
    console.log("🔌 User connected:", socket.id);

    // ✅ التسجيل باستخدام التوكن بدل userId مباشرة
    socket.on("register", (data) => {
      try {
        const decoded = jwt.verify(data.token, process.env.JWT_SECRET_KEY);
        const userId = decoded.id || decoded.userId;
        if (userId) {
          onlineUsers.set(userId.toString(), socket.id);
          console.log(`✅ Registered user ${userId} to socket ${socket.id}`);
        }
      } catch (err) {
        console.log("❌ Invalid token during socket register");
      }
    });

    socket.on("disconnect", () => {
      console.log("❌ User disconnected:", socket.id);
      [...onlineUsers.entries()].forEach(([uid, sid]) => {
        if (sid === socket.id) onlineUsers.delete(uid);
      });
    });
  });

  return ioInstance;
}

function getIo() {
  return ioInstance;
}

function getOnlineUsers() {
  return onlineUsers;
}

module.exports = { initSocket, getIo, getOnlineUsers };