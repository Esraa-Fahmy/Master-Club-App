const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.ObjectId, ref: "User" },
  items: [{ name: String, quantity: Number, price: Number }],
  total: Number,
  status: { type: String, enum: ["Delivered", "completed", "cancelled"], default: "pending" },
}, { timestamps: true });

module.exports = mongoose.model("Order", orderSchema);
