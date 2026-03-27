const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  roomNumber: { type: String, required: true, unique: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'RoomCategory', required: true },
  price: { type: Number, required: true },
  status: { type: String, enum: ['available', 'occupied', 'maintenance'], default: 'available' },
  description: { type: String },
  amenities: [{ type: String }],
}, { timestamps: true });

module.exports = mongoose.model('Room', roomSchema);
