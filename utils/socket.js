// socket.js
let ioInstance;
const onlineUsers = new Map();

function initSocket(server) {
  const { Server } = require("socket.io");
  ioInstance = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  ioInstance.on("connection", (socket) => {
    console.log("🔌 User connected:", socket.id);

    socket.on("register", (userId) => {
      onlineUsers.set(userId, socket.id);
      console.log(`✅ Registered user ${userId} to socket ${socket.id}`);
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

module.exports = { initSocket, getIo, getOnlineUsers };
