const mongoose = require('mongoose');

const roomCategorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  basePrice: { type: Number, required: true },
  amenities: [{ type: String }],
}, { timestamps: true });

module.exports = mongoose.model('RoomCategory', roomCategorySchema);
