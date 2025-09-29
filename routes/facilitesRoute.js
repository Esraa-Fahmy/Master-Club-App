const express = require("express");
const router = express.Router();
const controller = require("../controllers/facilitesController");
const { protect, allowedTo } = require("../controllers/authController");

router
  .route("/")
  .get(protect, controller.getFacilities)
  .post(protect, allowedTo("admin"), controller.createFacility);

router
  .route("/:id")
  .get(protect, controller.getFacility)
  .put(protect, allowedTo("admin"), controller.updateFacility)
  .delete(protect, allowedTo("admin"), controller.deleteFacility);

module.exports = router;
