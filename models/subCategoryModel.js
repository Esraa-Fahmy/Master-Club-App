const mongoose = require("mongoose");

const subCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
    },
    image: {
      type: String,
    },
category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
  },
  { timestamps: true }
);



const setImageURL = (doc) => {
  if (doc.image) {
    const imageUrl = `${process.env.BASE_URL}/subCategories/${doc.image}`;
    doc.image = imageUrl;
  }
};
// findOne, findAll and update
subCategorySchema.post('init', (doc) => {
  setImageURL(doc);
});

// create
subCategorySchema.post('save', (doc) => {
  setImageURL(doc);
});



module.exports = mongoose.model("SubCategory", subCategorySchema);
