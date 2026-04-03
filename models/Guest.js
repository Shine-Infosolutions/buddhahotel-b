const mongoose = require('mongoose');

const guestSchema = new mongoose.Schema({
  salutation: { type: String, enum: ['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.'], default: 'Mr.' },
  name: { type: String, required: true },
  age: { type: Number },
  gender: { type: String, enum: ['male', 'female', 'other'] },
  phone: { type: String, required: true },
  whatsappNo: { type: String },
  email: { type: String },
  address: { type: String },
  pinCode: { type: String },
  city: { type: String },
  state: { type: String },
  nationality: { type: String },
  dateOfBirth: { type: Date },
  anniversaryDate: { type: Date },
  companyDetails: { type: String },
  idType: { type: String, enum: ['passport', 'aadhar', 'driving_license', 'voter_id', 'other'] },
  idNumber: { type: String },
  isVIP: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Guest', guestSchema);
