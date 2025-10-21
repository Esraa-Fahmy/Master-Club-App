const path = require("path");
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const compression = require("compression");
const http = require("http");
const dbConnection = require("./config/database");
const globalError = require("./midlewares/errmiddleware");
const { initSocket } = require("./utils/socket");
const fs = require("fs");
 
dotenv.config({ path: "config.env" });
dbConnection();

const app = express();

// Middleware
app.use(compression());
app.use(cors());
app.use(express.json({ limit: "20kb" }));
const uploadsDir  = path.join(__dirname, "uploads");

if (fs.existsSync(uploadsDir)) {
  const folders = fs.readdirSync(uploadsDir);
  folders.forEach(folder => {
    const folderPath = path.join(uploadsDir, folder);
    if (fs.lstatSync(folderPath).isDirectory()) {
      app.use(`/${folder}`, express.static(folderPath));
      console.log(`Static route added: /${folder} → ${folderPath}`);
    }
  });
}


// Mount Routes
app.use("/api/v1/auth", require("./routes/authRoute"));
app.use("/api/v1/user", require("./routes/userRoute"));
app.use("/api/v1/membership-plans", require("./routes/planMmberShipRoute"));
app.use("/api/v1/membership-subscriptions", require("./routes/subScriptionRoute"));
app.use("/api/v1/categories", require("./routes/categoryRoute"));
app.use("/api/v1/subCategories", require("./routes/subCategoryRoute"));
app.use("/api/v1/facilities", require("./routes/facilitesRoute"));
app.use("/api/v1/activities", require("./routes/activityRoute"));
app.use("/api/v1/bookings", require("./routes/bookingRoute"));
app.use("/api/v1/home", require("./routes/homeRoute"));
app.use("/api/v1/notifications", require("./routes/notificationsRoute"));
app.use("/api/v1/wishlist", require("./routes/wishlistRoute"));
app.use("/api/v1/products", require("./routes/productRoute"));
app.use("/api/v1/cart", require("./routes/cartRoute"));
app.use("/api/v1/coupons", require("./routes/copunRoute"));
app.use("/api/v1/offers", require("./routes/offersRoute"));
app.use("/api/v1/ratings", require("./routes/ratingRoute"));
app.use("/api/v1/order", require("./routes/orderRoute"));





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
