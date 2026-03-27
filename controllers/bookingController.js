const Booking = require('../models/Booking');
const Room = require('../models/Room');

exports.checkAvailability = async (req, res) => {
  try {
    const { checkIn, checkOut, categoryId, excludeBookingId } = req.query;
    if (!checkIn || !checkOut) return res.status(400).json({ message: 'checkIn and checkOut are required' });

    const overlapQuery = {
      status: { $in: ['confirmed', 'checked_in'] },
      checkIn: { $lt: new Date(checkOut) },
      checkOut: { $gt: new Date(checkIn) },
    };
    if (excludeBookingId) overlapQuery._id = { $ne: excludeBookingId };

    const overlappingBookings = await Booking.find(overlapQuery).select('room');

    const bookedRoomIds = overlappingBookings.map((b) => b.room.toString());

    const query = { status: 'available', _id: { $nin: bookedRoomIds } };
    if (categoryId) query.category = categoryId;

    const rooms = await Room.find(query).populate('category');

    // Group by category
    const grouped = rooms.reduce((acc, room) => {
      const catId = room.category?._id?.toString() || 'uncategorized';
      const catName = room.category?.name || 'Uncategorized';
      if (!acc[catId]) acc[catId] = { categoryId: catId, categoryName: catName, basePrice: room.category?.basePrice, rooms: [] };
      acc[catId].rooms.push(room);
      return acc;
    }, {});

    res.json({ available: rooms.length > 0, grouped: Object.values(grouped), total: rooms.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getBookings = async (req, res) => {
  try {
    const bookings = await Booking.find().populate('guest').populate({ path: 'room', populate: { path: 'category' } });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('guest').populate({ path: 'room', populate: { path: 'category' } });
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createBooking = async (req, res) => {
  try {
    const { rooms: roomIds, room, checkIn, checkOut, cgstRate = 2.5, sgstRate = 2.5, extraBedChargePerDay = 0, discount = 0 } = req.body;

    // Support both single room and bulk rooms
    const selectedRoomIds = roomIds?.length ? roomIds : [room];

    // Check all rooms are available for the date range
    const overlapping = await Booking.find({
      status: { $in: ['confirmed', 'checked_in'] },
      room: { $in: selectedRoomIds },
      checkIn: { $lt: new Date(checkOut) },
      checkOut: { $gt: new Date(checkIn) },
    });
    if (overlapping.length > 0) return res.status(400).json({ message: 'One or more rooms are not available for the selected dates' });

    const roomDocs = await Room.find({ _id: { $in: selectedRoomIds } });
    const days = Math.max(1, Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)));

    const bookings = [];
    for (const roomDoc of roomDocs) {
      const roomCost = days * roomDoc.price;
      const extraBedCost = extraBedChargePerDay * days;
      const taxableAmount = roomCost + extraBedCost;
      const cgst = (taxableAmount * cgstRate) / 100;
      const sgst = (taxableAmount * sgstRate) / 100;
      const totalAmount = taxableAmount + cgst + sgst - discount;
      const booking = await Booking.create({ ...req.body, room: roomDoc._id, taxableAmount, totalAmount });
      bookings.push(booking);
    }

    res.status(201).json(bookings.length === 1 ? bookings[0] : bookings);
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
