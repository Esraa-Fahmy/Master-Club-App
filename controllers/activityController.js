const Activity = require("../models/activityModel");
const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');
const { uploadMixOfImages } = require('../midlewares/uploadImageMiddleWare');
const fs = require('fs');



exports.uploadActivityImages = uploadMixOfImages([
    { name: 'EventImage', maxCount: 1 },
    { name: 'images', maxCount: 5 }
]);


exports.resizeActivityImages = asyncHandler(async (req, res, next) => {
    if (req.files.EventImage) {
        const EventImageFileName = `event-${uuidv4()}-${Date.now()}-cover.jpeg`;

        const path = "uploads/events/";
        if (!fs.existsSync(path)) {
            fs.mkdirSync(path, { recursive: true });
        }
        await sharp(req.files.EventImage[0].buffer)
            .toFormat('jpeg')
            .jpeg({ quality: 95 })
            .toFile(`uploads/events/${EventImageFileName}`);
        req.body.EventImage = EventImageFileName;
    }
    if (req.files.images) {
        req.body.images = [];
        await Promise.all(
            req.files.images.map(async (img, index) => {
                const imageName = `activity-${uuidv4()}-${Date.now()}-${index + 1}.jpeg`;
                const path = "uploads/activites/";
                if (!fs.existsSync(path)) {
                    fs.mkdirSync(path, { recursive: true });
                }
                await sharp(img.buffer)
                    .toFormat('jpeg')
                    .jpeg({ quality: 100 })
                    .toFile(`uploads/activites/${imageName}`);
                req.body.images.push(imageName);
            })
        );
    }
    next();
});


// GET /activities
// supports ?category=, ?search=, ?date=
exports.getActivities = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.category) filter.category = req.query.category;
  if (req.query.search) filter.title = { $regex: req.query.search, $options: "i" };
  if (req.query.date) {
    const d = new Date(req.query.date);
    filter.availableDates = { $in: [d.toISOString().split("T")[0], d] };
    // simpler: front-end can filter by date
  }

  const activities = await Activity.find(filter).populate("category", "name type");
  res.status(200).json({ results: activities.length, data: activities });
});

exports.getActivity = asyncHandler(async (req, res, next) => {
  const a = await Activity.findById(req.params.id).populate("category", "name type");
  if (!a) return next(new ApiError("Activity not found", 404));
  res.status(200).json({ data: a });
});

exports.createActivity = asyncHandler(async (req, res) => {
  const a = await Activity.create(req.body);
  res.status(201).json({ data: a });
});

exports.updateActivity = asyncHandler(async (req, res, next) => {
  const a = await Activity.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!a) return next(new ApiError("Activity not found", 404));
  res.status(200).json({ data: a });
});

exports.deleteActivity = asyncHandler(async (req, res, next) => {
  const a = await Activity.findByIdAndDelete(req.params.id);
  if (!a) return next(new ApiError("Activity not found", 404));
  res.status(204).send();
});
