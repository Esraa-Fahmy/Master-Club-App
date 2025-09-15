const express = require("express");
const {
  createPlan,
  getPlans,
  getPlan,
  updatePlan,
  deletePlan,
} = require("../controllers/memberShipPlanController");

const { protect, allowedTo } = require("../controllers/authController");

const router = express.Router();

// ✅ Get all plans (public)
router.get("/", getPlans);

// ✅ Get single plan (public)
router.get("/:id", getPlan);

// ✅ Create new plan (admin only)
router.post("/", protect, allowedTo("admin"), createPlan);

// ✅ Update plan (admin only)
router.put("/:id", protect, allowedTo("admin"), updatePlan);

// ✅ Delete plan (admin only)
router.delete("/:id", protect, allowedTo("admin"), deletePlan);

module.exports = router;
