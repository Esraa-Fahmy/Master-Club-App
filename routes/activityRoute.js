 const express = require("express");
const router = express.Router();
const controller = require("../controllers/activityController");
const { protect, allowedTo } = require("../controllers/authController");

router
  .route("/")
  .get(protect, controller.getActivities)
  .post(protect, allowedTo("admin"),   controller.uploadActivityImages,
    controller.resizeActivityImages, controller.createActivity);

router
  .route("/:id")
  .get(protect, controller.getActivity)
  .put(protect, allowedTo("admin"), controller.uploadActivityImages,
    controller.resizeActivityImages,controller.updateActivity)
  .delete(protect, allowedTo("admin"), controller.deleteActivity);

module.exports = router;
