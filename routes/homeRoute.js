const express = require("express");
const router = express.Router();
const controller = require("../controllers/homeController");
const { protect } = require("../controllers/authController");

// Home main data
router.get("/", protect, controller.getHomeData);

// VIP Events
router.get("/vip-events", protect, controller.getVipEvents);

// Recommended (activities or facilities)
router.get("/recommended", protect, controller.getRecommended);

module.exports = router;
