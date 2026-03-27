const mongoose = require('mongoose');

const billingSchema = new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  guest: { type: mongoose.Schema.Types.ObjectId, ref: 'Guest', required: true },
  roomCharges: { type: Number, required: true },
  extraCharges: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'partial'], default: 'pending' },
  paymentMethod: { type: String, enum: ['cash', 'card', 'upi', 'other'] },
}, { timestamps: true });

module.exports = mongoose.model('Billing', billingSchema);
