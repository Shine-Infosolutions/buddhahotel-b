const Booking = require('../models/Booking');
const Room = require('../models/Room');
const { sendBookingConfirmation } = require('../utils/sendEmail');

const generateGRC = async () => {
  const currentYear = new Date().getFullYear() % 100; // Get last 2 digits of year (e.g., 26 for 2026)
  const yearPrefix = `GRC${currentYear}`;
  
  // Find the last GRC for the current year
  const last = await Booking.findOne({ 
    grcNumber: { $regex: `^${yearPrefix}` } 
  }).sort({ createdAt: -1 }).select('grcNumber');
  
  const lastNum = last ? parseInt(last.grcNumber.replace(yearPrefix, ''), 10) : 0;
  return `${yearPrefix}${String(lastNum + 1).padStart(4, '0')}`;
};

const generateInvoice = async (checkIn) => {
  const date = new Date(checkIn);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const prefix = `BA/${mm}/`;
  const last = await Booking.findOne({ invoiceNumber: { $regex: `^${prefix}` } }).sort({ createdAt: -1 }).select('invoiceNumber');
  const lastNum = last ? parseInt(last.invoiceNumber.split('/')[2], 10) : 0;
  return `${prefix}${String(lastNum + 1).padStart(4, '0')}`;
};

exports.searchGuest = async (req, res) => {
  try {
    const { q } = req.query;
    const guests = await require('../models/Guest').find({
      $or: [{ name: { $regex: q, $options: 'i' } }, { phone: { $regex: q, $options: 'i' } }],
    }).limit(10);
    res.json(guests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getBookingByGRC = async (req, res) => {
  try {
    const booking = await Booking.findOne({ grcNumber: req.params.grc }).populate('guest');
    if (!booking) return res.status(404).json({ message: 'GRC not found' });
    res.json(booking.guest);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.previewNumbers = async (req, res) => {
  try {
    const { checkIn } = req.query;
    const grc = await generateGRC();
    const invoice = await generateInvoice(checkIn || new Date());
    res.json({ grcNumber: grc, invoiceNumber: invoice });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.checkAvailability = async (req, res) => {
  try {
    const { checkIn, checkOut, categoryId, excludeBookingId } = req.query;
    if (!checkIn || !checkOut) return res.status(400).json({ message: 'checkIn and checkOut are required' });

    const overlapQuery = {
      status: { $in: ['booked', 'checked_in'] },
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
    const bookings = await Booking.find()
      .populate('guest')
      .populate('additionalGuests')
      .populate({ path: 'room', populate: { path: 'category' } })
      .populate({ path: 'rooms', populate: { path: 'category' } })
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('guest')
      .populate('additionalGuests')
      .populate({ path: 'room', populate: { path: 'category' } })
      .populate({ path: 'rooms', populate: { path: 'category' } });
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createBooking = async (req, res) => {
  try {
    const { rooms: roomIds, room, checkIn, checkOut, cgstRate = 2.5, sgstRate = 2.5, discount = 0, extraBeds = [], customPrices = [], roomDiscounts = [] } = req.body;

    const selectedRoomIds = roomIds?.length ? roomIds : [room];

    const overlapping = await Booking.find({
      status: { $in: ['booked', 'checked_in'] },
      $or: [
        { room: { $in: selectedRoomIds } },
        { rooms: { $in: selectedRoomIds } }
      ],
      checkIn: { $lt: new Date(checkOut) },
      checkOut: { $gt: new Date(checkIn) },
    });
    if (overlapping.length > 0) return res.status(400).json({ message: 'One or more rooms are not available for the selected dates' });

    const roomDocs = await Room.find({ _id: { $in: selectedRoomIds } });
    const days = Math.max(1, Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)));

    // Calculate total cost for all rooms
    let totalRoomCost = 0;
    let totalExtraBedCost = 0;
    let totalRoomDiscount = 0;

    for (const roomDoc of roomDocs) {
      // Check if there's a custom price for this room
      const customPriceObj = customPrices.find((cp) => cp.room === roomDoc._id.toString());
      const roomPrice = customPriceObj ? Number(customPriceObj.price) : roomDoc.price;
      const roomSubtotal = days * roomPrice;
      
      // Calculate room discount
      const roomDiscountObj = roomDiscounts.find((rd) => rd.room === roomDoc._id.toString());
      let roomDiscountAmount = 0;
      if (roomDiscountObj) {
        if (roomDiscountObj.discountType === 'percentage') {
          roomDiscountAmount = (roomSubtotal * Number(roomDiscountObj.discountValue)) / 100;
        } else {
          roomDiscountAmount = Number(roomDiscountObj.discountValue);
        }
      }
      
      totalRoomCost += roomSubtotal;
      totalRoomDiscount += roomDiscountAmount;

      // Find extra bed for this room
      const eb = extraBeds.find((e) => e.room === roomDoc._id.toString());
      if (eb?.chargePerDay && eb?.from && eb?.to) {
        const ebDays = Math.max(1, Math.ceil((new Date(eb.to) - new Date(eb.from)) / (1000 * 60 * 60 * 24)));
        totalExtraBedCost += Number(eb.chargePerDay) * ebDays;
      }
    }

    const taxableAmount = totalRoomCost + totalExtraBedCost - totalRoomDiscount;
    const cgst = (taxableAmount * cgstRate) / 100;
    const sgst = (taxableAmount * sgstRate) / 100;
    const totalAmount = Math.round((taxableAmount + cgst + sgst - discount) * 100) / 100;
    const grcNumber = await generateGRC();
    const invoiceNumber = await generateInvoice(checkIn);

    // Create single booking with multiple rooms
    const booking = await Booking.create({
      ...req.body,
      rooms: selectedRoomIds,
      room: selectedRoomIds[0], // Keep first room for backward compatibility
      taxableAmount,
      totalAmount,
      extraBeds,
      customPrices,
      roomDiscounts,
      status: req.body.status || 'booked',
      grcNumber,
      invoiceNumber,
      numberOfRooms: selectedRoomIds.length,
    });

    // Update all rooms to occupied
    await Room.updateMany({ _id: { $in: selectedRoomIds } }, { status: 'occupied' });

    res.status(201).json(booking);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateBooking = async (req, res) => {
  try {
    const existingBooking = await Booking.findById(req.params.id);
    if (!existingBooking) return res.status(404).json({ message: 'Booking not found' });

    // If dates, extra beds, custom prices, or room discounts changed, recalculate costs
    if (req.body.checkIn || req.body.checkOut || req.body.extraBeds !== undefined || req.body.customPrices !== undefined || req.body.roomDiscounts !== undefined) {
      const checkIn = req.body.checkIn || existingBooking.checkIn;
      const checkOut = req.body.checkOut || existingBooking.checkOut;
      const roomIds = existingBooking.rooms?.length ? existingBooking.rooms : [existingBooking.room];
      const extraBeds = req.body.extraBeds !== undefined ? req.body.extraBeds : existingBooking.extraBeds;
      const customPrices = req.body.customPrices !== undefined ? req.body.customPrices : existingBooking.customPrices;
      const roomDiscounts = req.body.roomDiscounts !== undefined ? req.body.roomDiscounts : existingBooking.roomDiscounts;
      const cgstRate = req.body.cgstRate !== undefined ? req.body.cgstRate : existingBooking.cgstRate;
      const sgstRate = req.body.sgstRate !== undefined ? req.body.sgstRate : existingBooking.sgstRate;
      const discount = req.body.discount !== undefined ? req.body.discount : existingBooking.discount;

      const roomDocs = await Room.find({ _id: { $in: roomIds } });
      const days = Math.max(1, Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)));
      
      let totalRoomCost = 0;
      let totalExtraBedCost = 0;
      let totalRoomDiscount = 0;

      for (const roomDoc of roomDocs) {
        // Check if there's a custom price for this room
        const customPriceObj = customPrices?.find((cp) => cp.room.toString() === roomDoc._id.toString());
        const roomPrice = customPriceObj ? Number(customPriceObj.price) : roomDoc.price;
        const roomSubtotal = days * roomPrice;
        
        // Calculate room discount
        const roomDiscountObj = roomDiscounts?.find((rd) => rd.room.toString() === roomDoc._id.toString());
        let roomDiscountAmount = 0;
        if (roomDiscountObj) {
          if (roomDiscountObj.discountType === 'percentage') {
            roomDiscountAmount = (roomSubtotal * Number(roomDiscountObj.discountValue)) / 100;
          } else {
            roomDiscountAmount = Number(roomDiscountObj.discountValue);
          }
        }
        
        totalRoomCost += roomSubtotal;
        totalRoomDiscount += roomDiscountAmount;

        const eb = extraBeds?.find((e) => e.room.toString() === roomDoc._id.toString());
        if (eb?.chargePerDay && eb?.from && eb?.to) {
          const ebDays = Math.max(1, Math.ceil((new Date(eb.to) - new Date(eb.from)) / (1000 * 60 * 60 * 24)));
          totalExtraBedCost += Number(eb.chargePerDay) * ebDays;
        }
      }

      const taxableAmount = totalRoomCost + totalExtraBedCost - totalRoomDiscount;
      const cgst = (taxableAmount * cgstRate) / 100;
      const sgst = (taxableAmount * sgstRate) / 100;
      const totalAmount = Math.round((taxableAmount + cgst + sgst - discount) * 100) / 100;

      req.body.taxableAmount = taxableAmount;
      req.body.totalAmount = totalAmount;
    }

    const booking = await Booking.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('guest')
      .populate('additionalGuests')
      .populate({ path: 'room', populate: { path: 'category' } })
      .populate({ path: 'rooms', populate: { path: 'category' } });
    
    if (req.body.status === 'checked_in') {
      const roomIds = booking.rooms?.length ? booking.rooms : [booking.room];
      await Room.updateMany({ _id: { $in: roomIds } }, { status: 'occupied' });
    }
    if (req.body.status === 'checked_out' || req.body.status === 'cancelled') {
      const roomIds = booking.rooms?.length ? booking.rooms : [booking.room];
      await Room.updateMany({ _id: { $in: roomIds } }, { status: 'available' });
    }
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.sendConfirmation = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('guest')
      .populate({ path: 'rooms', populate: { path: 'category' } });
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    const pdfBuffer = req.body.pdf ? Buffer.from(req.body.pdf, 'base64') : null;
    await sendBookingConfirmation(booking, pdfBuffer);
    res.json({ message: 'Confirmation email sent successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    const roomIds = booking.rooms?.length ? booking.rooms : [booking.room];
    await Room.updateMany({ _id: { $in: roomIds } }, { status: 'available' });
    res.json({ message: 'Booking deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
