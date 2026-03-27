const mongoose = require('mongoose');

const advancePaymentSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  method: { type: String },
  date: { type: Date, default: Date.now },
  note: { type: String },
});

const bookingSchema = new mongoose.Schema({
  guest: { type: mongoose.Schema.Types.ObjectId, ref: 'Guest', required: true },
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  checkIn: { type: Date, required: true },
  checkOut: { type: Date, required: true },
  checkInTime: { type: String, default: '12:00' },
  checkOutTime: { type: String, default: '12:00' },
  numberOfRooms: { type: Number, default: 1 },
  arrivalFrom: { type: String },
  purposeOfVisit: { type: String },
  extraBedChargePerDay: { type: Number, default: 0 },
  remarks: { type: String },
  status: { type: String, enum: ['confirmed', 'checked_in', 'checked_out', 'cancelled'], default: 'confirmed' },
  // Payment
  taxableAmount: { type: Number, default: 0 },
  cgstRate: { type: Number, default: 2.5 },
  sgstRate: { type: Number, default: 2.5 },
  discount: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  paymentMode: { type: String, enum: ['cash', 'card', 'upi', 'bank_transfer', 'other'] },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'partial'], default: 'pending' },
  advancePayments: [advancePaymentSchema],
  billingInstruction: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);
