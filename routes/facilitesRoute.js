const express = require("express");
const router = express.Router();
const controller = require("../controllers/facilitesController");
const { protect, allowedTo } = require("../controllers/authController");

router
  .route("/")
  .get(protect, controller.getFacilities)
  .post(protect, allowedTo("admin"), controller.uploadFacilityImages, controller.resizeFacilityImages, controller.createFacility);

router
  .route("/:id")
  .get(protect, controller.getFacility)
  .put(protect, allowedTo("admin"),  controller.uploadFacilityImages, controller.resizeFacilityImages, controller.updateFacility)
  .delete(protect, allowedTo("admin"), controller.deleteFacility);

module.exports = router;
