const mongoose = require('mongoose');

const advancePaymentSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  method: { type: String },
  date: { type: Date, default: Date.now },
  note: { type: String },
});

const extraBedSchema = new mongoose.Schema({
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
  chargePerDay: { type: Number, default: 0 },
  from: { type: Date },
  to: { type: Date },
});

const customPriceSchema = new mongoose.Schema({
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
  price: { type: Number, required: true },
});

const roomDiscountSchema = new mongoose.Schema({
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
  discountType: { type: String, enum: ['percentage', 'fixed'], default: 'fixed' },
  discountValue: { type: Number, default: 0 },
});

const bookingSchema = new mongoose.Schema({
  guest: { type: mongoose.Schema.Types.ObjectId, ref: 'Guest', required: true },
  additionalGuests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Guest' }],
  rooms: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Room' }],
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
  checkIn: { type: Date, required: true },
  checkOut: { type: Date, required: true },
  checkInTime: { type: String, default: '12:00' },
  checkOutTime: { type: String, default: '12:00' },
  numberOfRooms: { type: Number, default: 1 },
  adults: { type: Number, default: 1 },
  children: { type: Number, default: 0 },
  arrivalFrom: { type: String },
  purposeOfVisit: { type: String },
  extraBeds: [extraBedSchema],
  customPrices: [customPriceSchema],
  roomDiscounts: [roomDiscountSchema],
  remarks: { type: String },
  status: { type: String, enum: ['booked', 'checked_in', 'checked_out', 'cancelled'], default: 'booked' },
  taxableAmount: { type: Number, default: 0 },
  cgstRate: { type: Number, default: 2.5 },
  sgstRate: { type: Number, default: 2.5 },
  discount: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  paymentMode: { type: String, enum: ['cash', 'card', 'upi', 'bank_transfer', 'other'] },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'partial'], default: 'pending' },
  advancePayments: [advancePaymentSchema],
  billingInstruction: { type: String },
  grcNumber: { type: String, unique: true },
  invoiceNumber: { type: String, unique: true },
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);
