const express = require("express");
const router = express.Router();
const controller = require("../controllers/bookingController");
const { protect, allowedTo } = require("../controllers/authController");

// 🟢 User routes
router.post("/", protect, allowedTo("user"), controller.createBooking);
router.get("/my", protect, allowedTo("user"), controller.getMyBookings);
router.put("/:id/cancel", protect, allowedTo("user"), controller.cancelBooking);

// 🔵 Admin routes
router.get("/", protect, allowedTo("admin"), controller.getAllBookings);
router.put("/:id/approve", protect, allowedTo("admin"), controller.approveBooking);
router.put("/:id/reject", protect, allowedTo("admin"), controller.rejectBooking);
router.put("/:id/complete", protect, allowedTo("admin"), controller.completeBooking);
router.put("/:id/pay", protect, allowedTo("admin"), controller.payBooking);
router.put("/:id/refund", protect, allowedTo("admin"), controller.refundBooking);

// 🔵 Schedules Management
router.post("/:type/:id/schedules", protect, allowedTo("admin"), controller.addSchedules);
router.put("/:type/:id/schedules/:date", protect, allowedTo("admin"), controller.updateSchedule);
router.delete("/:type/:id/schedules/:date", protect, allowedTo("admin"), controller.deleteSchedule);

// 🟢 User view schedules
router.get("/:type/:id/schedules", protect, allowedTo("user"), controller.getSchedules);

module.exports = router;
