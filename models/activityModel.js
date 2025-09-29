const mongoose = require("mongoose");

const slotSchema = new mongoose.Schema({
  id: { type: String }, // uuid يمكن إنشاؤه من السيرفر
  time: { type: String, required: true }, // "10:00-11:00"
  capacity: { type: Number, default: 1 },
  reserved: { type: Number, default: 0 } // عدد المحجوز حتى الآن
}, { _id: false });

const scheduleSchema = new mongoose.Schema({
  date: { type: String, required: true }, // حفظ كـ YYYY-MM-DD للسهل
  slots: { type: [slotSchema], default: [] }
}, { _id: false });

const activitySchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category"},
   subCategory: { type: mongoose.Schema.Types.ObjectId, ref: "SubCategory", required: true },
    benfites : [{
      type :String
    }],
    price: { type: Number },
    images: [String],
    location: String,


      // Events خصائص خاصة بـ
    isEvent: { type: Boolean, default: false },
    isVip: { type: Boolean, default: false },
    startDate: Date,
    endDate: Date,
    EventImage: String,


    availableDates: [Date], // legacy / optional
    allowedPlans: [{ type: mongoose.Schema.ObjectId, ref: "MembershipPlan" }],
    schedules: { type: [scheduleSchema], default: [] }, // new
    capacityPerSlot: { type: Number }, // optional global default
    requiresPlayers: { type: Boolean, default: false } // لو النشاط يحتاج عدد لاعبين
  },
  { timestamps: true }
);





const setImageURL = (doc) => {
  if (doc.EventImage && !doc.EventImage.startsWith(process.env.BASE_URL)) {
      const imageUrl = `${process.env.BASE_URL}/events/${doc.EventImage}`;
      doc.EventImage = imageUrl;
  }
  if (doc.images) {
      const imagesList = [];
      doc.images.forEach((image) => {
          const imageUrl = image.startsWith(process.env.BASE_URL)
              ? image
              : `${process.env.BASE_URL}/activities/${image}`;
          imagesList.push(imageUrl);
      });
      doc.images = imagesList;
  }
};

  // findOne, findAll and update
  activitySchema.post('init', (doc) => {
    setImageURL(doc);
  });

  // create
  activitySchema.post('save', (doc) => {
    setImageURL(doc);
  });




  activitySchema.pre("save", function(next) {
  if(this.schedules && this.schedules.length) {
    this.availableDates = this.schedules.map(s => s.date);
  }
  next();
});


module.exports = mongoose.model("Activity", activitySchema);
