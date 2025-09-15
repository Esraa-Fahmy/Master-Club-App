const path = require("path");
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const compression = require("compression");
const http = require("http");
const dbConnection = require("./config/database");
const ApiError = require("./utils/apiError");
const globalError = require("./midlewares/errmiddleware");
const { initSocket } = require("./utils/socket");

dotenv.config({ path: "config.env" });
dbConnection();

const app = express();

// Middleware
app.use(compression());
app.use(cors());
app.use(express.json({ limit: "20kb" }));
app.use(express.static(path.join(__dirname, "uploads")));

// Mount Routes
app.use("/api/v1/auth", require("./routes/authRoute"));
app.use("/api/v1/user", require("./routes/userRoute"));
app.use("/api/v1/membership-plans", require("./routes/planMmberShipRoute"));
app.use("/api/v1/membership-subscriptions", require("./routes/subScriptionRoute"));

// Global Error Handler
app.use(globalError);

// Create HTTP server and Socket.io
const server = http.createServer(app);
initSocket(server); // مهم جداً: هنا بنمشي io و onlineUsers

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { app, server };
