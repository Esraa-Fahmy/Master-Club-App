const express = require('express');
const { getAllsubCategories, createsubCategory, getSingleSubCategory, updatesubCategory, deletesubCategory, setCategoryIdToBody, uploadsubCategoryImage, resizeImage } = require('../controllers/subCategoryController');

const Auth = require('../controllers/authController')


const activityRoute = require("./activityRoute");

const router = express.Router({ mergeParams: true });

// 🟢 Nested route للأنشطة جوه SubCategory
router.use("/:subCategoryId/activities", activityRoute);



router.route('/')
// subCategoryRoute.js
router.route('/')
  .get(Auth.protect,
  getAllsubCategories)
  .post(
    Auth.protect,
    Auth.allowedTo('admin'),
       uploadsubCategoryImage,
        resizeImage,
    setCategoryIdToBody,
    createsubCategory
  );

router.route('/:id')
.get(Auth.protect, getSingleSubCategory)
.put(Auth.protect,  Auth.allowedTo('admin'), uploadsubCategoryImage, resizeImage, updatesubCategory)
.delete(Auth.protect, Auth.allowedTo('admin'), deletesubCategory);

module.exports = router;