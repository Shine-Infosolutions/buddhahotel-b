const Guest = require('../models/Guest');

exports.getGuests = async (req, res) => {
  try {
    const guests = await Guest.find();
    res.json(guests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getGuest = async (req, res) => {
  try {
    const guest = await Guest.findById(req.params.id);
    if (!guest) return res.status(404).json({ message: 'Guest not found' });
    res.json(guest);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createGuest = async (req, res) => {
  try {
    const { _id, __v, createdAt, updatedAt, ...data } = req.body;
    const guest = await Guest.create(data);
    res.status(201).json(guest);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateGuest = async (req, res) => {
  try {
    const { _id, __v, createdAt, updatedAt, ...data } = req.body;
    const guest = await Guest.findByIdAndUpdate(req.params.id, { $set: data }, { new: true, runValidators: false });
    if (!guest) return res.status(404).json({ message: 'Guest not found' });
    res.json(guest);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteGuest = async (req, res) => {
  try {
    const guest = await Guest.findByIdAndDelete(req.params.id);
    if (!guest) return res.status(404).json({ message: 'Guest not found' });
    res.json({ message: 'Guest deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
