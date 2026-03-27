const mongoose = require('mongoose');

const guestSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String },
  phone: { type: String, required: true },
  idType: { type: String, enum: ['passport', 'aadhar', 'driving_license', 'other'] },
  idNumber: { type: String },
  address: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Guest', guestSchema);
