const Booking = require('../models/Booking');
const Room = require('../models/Room');

exports.getBookings = async (req, res) => {
  try {
    const bookings = await Booking.find().populate('guest').populate('room');
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('guest').populate('room');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createBooking = async (req, res) => {
  try {
    const { room, checkIn, checkOut } = req.body;
    const roomDoc = await Room.findById(room);
    if (!roomDoc) return res.status(404).json({ message: 'Room not found' });
    if (roomDoc.status !== 'available') return res.status(400).json({ message: 'Room is not available' });

    const days = Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24));
    const totalAmount = days * roomDoc.price;

    const booking = await Booking.create({ ...req.body, totalAmount });
    await Room.findByIdAndUpdate(room, { status: 'occupied' });
    res.status(201).json(booking);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateBooking = async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (req.body.status === 'checked_out' || req.body.status === 'cancelled') {
      await Room.findByIdAndUpdate(booking.room, { status: 'available' });
    }
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    await Room.findByIdAndUpdate(booking.room, { status: 'available' });
    res.json({ message: 'Booking deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
