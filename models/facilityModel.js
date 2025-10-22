const mongoose = require("mongoose");

const slotSchema = new mongoose.Schema({
  id: { type: String },
  time: { type: String, required: true },
  capacity: { type: Number, default: 1 },
  reserved: { type: Number, default: 0 }
}, { _id: false });

const scheduleSchema = new mongoose.Schema({
  date: { type: String, required: true },
  slots: { type: [slotSchema], default: [] }
}, { _id: false });

const facilitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: String,
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    images: [String],
    location: String,
    openingHours: String,
   allowedPlans: [
      { type: mongoose.Schema.Types.ObjectId, ref: "MembershipPlan" }
    ], 
   schedules: { type: [scheduleSchema], default: [] },
    capacityPerSlot: { type: Number },
    isVip: { type: Boolean, default: false },
    isRecommended: {
  type: Boolean,
  default: false
},
  privateBookingAllowed: { type: Boolean, default: false }



  },
  { timestamps: true }
);



const setImageURL = (doc) => {
  if (doc.images) {
      const imagesList = [];
      doc.images.forEach((image) => {
          const imageUrl = image.startsWith(process.env.BASE_URL)
              ? image
              : `${process.env.BASE_URL}/facilities/${image}`;
          imagesList.push(imageUrl);
      });
      doc.images = imagesList;
  }
};

  // findOne, findAll and update
  facilitySchema.post('init', (doc) => {
    setImageURL(doc);
  });

  // create
  facilitySchema.post('save', (doc) => {
    setImageURL(doc);
  });


module.exports = mongoose.model("Facility", facilitySchema);
