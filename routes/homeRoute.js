const express = require("express");
const router = express.Router();
const controller = require("../controllers/homeController");
const { protect } = require("../controllers/authController");

router.get("/", protect, controller.getHomeData);
router.get("/vip-events", protect, controller.getVipEvents);

module.exports = router;
