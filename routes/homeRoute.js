const express = require("express");
const router = express.Router();
const controller = require("../controllers/homeController");
const { protect } = require("../controllers/authController");

// Home main data
router.get("/", protect, controller.getHomeData);

// VIP Events
router.get("/events", protect, controller.getAllEvents);

// Recommended (activities or facilities)
router.get("/recommended", protect, controller.getRecommended);

module.exports = router;
