const mongoose = require("mongoose");

const offerSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
    discountType: { type: String, enum: ["percentage", "fixed"], required: true },
    discountValue: { type: Number, required: true },
    category: { type: mongoose.Schema.ObjectId, ref: "Category" }, // خصم على كاتجوري
    products: [{ type: mongoose.Schema.ObjectId, ref: "Product" }], // خصم على منتجات معينة
    expiresAt: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
   images: [String],
  },
  { timestamps: true }
);


const setImageURL = (doc) => {
  if (doc.images) {
      const imagesList = [];
      doc.images.forEach((image) => {
          const imageUrl = image.startsWith(process.env.BASE_URL)
              ? image
              : `${process.env.BASE_URL}/offers/${image}`;
          imagesList.push(imageUrl);
      });
      doc.images = imagesList;
  }
};

  // findOne, findAll and update
  offerSchema.post('init', (doc) => {
    setImageURL(doc);
  });

  // create
  offerSchema.post('save', (doc) => {
    setImageURL(doc);
  });



module.exports = mongoose.model("Offer", offerSchema);
