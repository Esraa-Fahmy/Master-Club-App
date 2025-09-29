const mongoose = require("mongoose");
const subCategoryModel = require("./subCategoryModel");

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
    },
    image: {
      type: String,
    },
    type: {
      type: String,
      enum: ["product", "activity", "facility"],
      required: [true, "Category type is required"],
    },
  },
  { timestamps: true }
);




const setImageURL = (doc) => {
    if (doc.image) {
      const imageUrl = `${process.env.BASE_URL}/categories/${doc.image}`;
      doc.image = imageUrl;
    }
  };
  // findOne, findAll and update
  categorySchema.post('init', (doc) => {
    setImageURL(doc);
  });
  
  // create
  categorySchema.post('save', (doc) => {
    setImageURL(doc);
  });



  categorySchema.pre("deleteMany", async function (next) {
    const categories = await this.model.find(this.getFilter()); // جلب جميع التصنيفات قبل الحذف
    const categoryIds = categories.map(cat => cat._id);

    // حذف كل الـ subCategories المرتبطة بهذه التصنيفات
    await subCategoryModel.deleteMany({ category: { $in: categoryIds } });

    next();
});

module.exports = mongoose.model("Category", categorySchema);
