const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "Product price is required"],
    },
    discountPrice: {
      type: Number,
      default: 0,
    },
    quantity: {
      type: Number,
      required: [true, "Product quantity is required"],
      min: 0,
    },
    images: [String], // صور متعددة
    coverImage: String, // صورة غلاف

    // 🔗 علاقة مع الكاتجوري
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    // 👑 منتجات خاصة بالـ VIP أو عامة
    membershipType: {
      type: String,
      enum: ["general", "vip"],
      default: "general",
    },

    // ⭐ Featured & Latest
    isFeatured: { type: Boolean, default: false },

    // متوسط التقييم
    averageRating: { type: Number, default: 0 },

    numReviews: { type: Number, default: 0 },
  },
  { timestamps: true }
);



const setImageURL = (doc) => {
  if (doc.coverImage && !doc.coverImage.startsWith(process.env.BASE_URL)) {
      const imageUrl = `${process.env.BASE_URL}/products/${doc.coverImage}`;
      doc.coverImage = imageUrl;
  }
  if (doc.images) {
      const imagesList = [];
      doc.images.forEach((image) => {
          const imageUrl = image.startsWith(process.env.BASE_URL)
              ? image
              : `${process.env.BASE_URL}/products/${image}`;
          imagesList.push(imageUrl);
      });
      doc.images = imagesList;
  }
};

  // findOne, findAll and update
  productSchema.post('init', (doc) => {
    setImageURL(doc);
  });

  // create
  productSchema.post('save', (doc) => {
    setImageURL(doc);
  });



module.exports = mongoose.model("Product", productSchema);
