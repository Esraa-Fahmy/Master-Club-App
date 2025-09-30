const express = require("express");
const router = express.Router();
const controller = require("../controllers/wishlistController");
const { protect, allowedTo } = require("../controllers/authController");

router
  .route("/")
  .get(protect, allowedTo('user'), controller.getMyWishlist) // جلب كل العناصر لليوزر الحالي
  .post(protect, allowedTo('user'), controller.addToWishlist); // إضافة عنصر جديد

router
  .route("/clear")
  .delete(protect, allowedTo('user'), controller.clearWishlist); // مسح كل عناصر الويش ليست

router
  .route("/:id")
  .delete(protect, allowedTo('user'), controller.removeFromWishlist); // مسح عنصر معين بالـ ID

module.exports = router;
