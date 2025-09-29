const express = require("express");
const router = express.Router();
const controller = require("../controllers/categoryController");
const { protect, allowedTo } = require("../controllers/authController");

router
  .route("/")
  .get(protect, controller.getCategories)
  .post(protect, allowedTo("admin"), controller.createCategory);

router
  .route("/:id")
  .get(protect, controller.getCategory)
  .put(protect, allowedTo("admin"), controller.updateCategory)
  .delete(protect, allowedTo("admin"), controller.deleteCategory);

module.exports = router;
