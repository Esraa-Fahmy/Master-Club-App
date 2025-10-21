const express = require("express");
const router = express.Router();
const controller = require("../controllers/wishlistController");
const { protect, allowedTo } = require("../controllers/authController");

router
  .route("/")
  .get(protect, allowedTo('user'), controller.getMyWishlist);

  router
  .route("/toggle") // جلب كل العناصر لليوزر الحالي
  .post(protect, allowedTo('user'), controller.toggleWishlist); // إضافة عنصر جديد

router
  .route("/clear")
  .delete(protect, allowedTo('user'), controller.clearWishlist); // مسح كل عناصر الويش ليست


module.exports = router;
