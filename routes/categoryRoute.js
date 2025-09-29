const express = require("express");
const router = express.Router();
const controller = require("../controllers/categoryController");
const { protect, allowedTo } = require("../controllers/authController");

const subCategoriesRoute = require('./subCategoryRoute')

router.use('/:categoryId/subcategories', subCategoriesRoute)

router
  .route("/")
  .get(protect, controller.getCategories)
  .post(protect, allowedTo("admin"),   controller.uploadCategoryImage,
    controller.resizeImage, controller.createCategory);

router
  .route("/:id")
  .get(protect, controller.getCategory)
  .put(protect, allowedTo("admin"),   controller.uploadCategoryImage,
    controller.resizeImage, controller.updateCategory)
  .delete(protect, allowedTo("admin"), controller.deleteCategory);

module.exports = router;
