const Billing = require('../models/Billing');

exports.getBills = async (req, res) => {
  try {
    const bills = await Billing.find().populate('guest').populate('booking');
    res.json(bills);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getBill = async (req, res) => {
  try {
    const bill = await Billing.findById(req.params.id).populate('guest').populate('booking');
    if (!bill) return res.status(404).json({ message: 'Bill not found' });
    res.json(bill);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createBill = async (req, res) => {
  try {
    const { roomCharges, extraCharges = 0, discount = 0 } = req.body;
    const totalAmount = roomCharges + extraCharges - discount;
    const bill = await Billing.create({ ...req.body, totalAmount });
    res.status(201).json(bill);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateBill = async (req, res) => {
  try {
    const bill = await Billing.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!bill) return res.status(404).json({ message: 'Bill not found' });
    res.json(bill);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteBill = async (req, res) => {
  try {
    const bill = await Billing.findByIdAndDelete(req.params.id);
    if (!bill) return res.status(404).json({ message: 'Bill not found' });
    res.json({ message: 'Bill deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getBillByBooking = async (req, res) => {
  try {
    const bill = await Billing.findOne({ booking: req.params.bookingId }).populate('guest').populate('booking');
    if (!bill) return res.status(404).json({ message: 'No bill found for this booking' });
    res.json(bill);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getInvoiceByBooking = async (req, res) => {
  try {
    const Booking = require('../models/Booking');
    const booking = await Booking.findById(req.params.bookingId)
      .populate('guest')
      .populate({ path: 'room', populate: { path: 'category' } })
      .populate({ path: 'rooms', populate: { path: 'category' } });
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const days = Math.max(1, Math.ceil((new Date(booking.checkOut) - new Date(booking.checkIn)) / (1000 * 60 * 60 * 24)));
    
    // Support both single room and multiple rooms
    const rooms = booking.rooms?.length ? booking.rooms : (booking.room ? [booking.room] : []);
    
    const items = [];
    let totalRoomRent = 0;
    
    // Add each room as a separate line item with daily breakdown
    rooms.forEach((room) => {
      // Check for custom price
      const customPriceObj = booking.customPrices?.find(cp => cp.room.toString() === room._id.toString());
      const roomRate = customPriceObj ? customPriceObj.price : room.price;
      const roomSubtotal = roomRate * days;
      
      // Check for room discount
      const roomDiscountObj = booking.roomDiscounts?.find(rd => rd.room.toString() === room._id.toString());
      let roomDiscountAmount = 0;
      if (roomDiscountObj) {
        if (roomDiscountObj.discountType === 'percentage') {
          roomDiscountAmount = (roomSubtotal * roomDiscountObj.discountValue) / 100;
        } else {
          roomDiscountAmount = roomDiscountObj.discountValue;
        }
      }
      
      const roomAmount = roomSubtotal - roomDiscountAmount;
      totalRoomRent += roomAmount;
      
      // Generate daily entries for each night
      for (let i = 0; i < days; i++) {
        const currentDate = new Date(booking.checkIn);
        currentDate.setDate(currentDate.getDate() + i);
        
        items.push({
          date: currentDate.toLocaleDateString('en-GB'),
          particulars: `Room Rent ${room.category?.name || ''} (Room: ${room.roomNumber})${customPriceObj ? ' (Custom Rate)' : ''}${roomDiscountAmount > 0 && i === 0 ? ` - Discount ${roomDiscountObj.discountType === 'percentage' ? roomDiscountObj.discountValue + '%' : '₹' + roomDiscountAmount}` : ''}`,
          roomRate,
          declaredRate: i === 0 ? roomAmount : null,
          hsn: i === 0 ? 996311 : null,
          taxRate: (booking.cgstRate || 0) + (booking.sgstRate || 0),
          amount: i === 0 ? roomAmount : null,
        });
      }
    });

    // Calculate extra bed total from extraBeds array
    let extraBedTotal = 0;
    (booking.extraBeds || []).forEach((eb) => {
      const ebFrom = eb.from ? new Date(eb.from) : new Date(booking.checkIn);
      const ebTo = eb.to ? new Date(eb.to) : new Date(booking.checkOut);
      const ebDays = Math.max(1, Math.ceil((ebTo - ebFrom) / (1000 * 60 * 60 * 24)));
      const ebAmount = (eb.chargePerDay || 0) * ebDays;
      if (ebAmount > 0) {
        extraBedTotal += ebAmount;
        // Find which room this extra bed belongs to
        const room = rooms.find(r => r._id.toString() === eb.room.toString());
        items.push({
          date: ebFrom.toLocaleDateString('en-GB'),
          particulars: `Extra Bed Charge - Room ${room?.roomNumber || ''} (${ebDays} night${ebDays > 1 ? 's' : ''} × ₹${eb.chargePerDay})`,
          roomRate: eb.chargePerDay,
          declaredRate: ebAmount,
          hsn: 996311,
          taxRate: (booking.cgstRate || 0) + (booking.sgstRate || 0),
          amount: ebAmount,
        });
      }
    });

    const taxableAmount = booking.taxableAmount || (totalRoomRent + extraBedTotal);
    const cgstRate = booking.cgstRate ?? 0;
    const sgstRate = booking.sgstRate ?? 0;
    const cgstAmount = booking.cgstAmount ?? +(taxableAmount * cgstRate / 100).toFixed(2);
    const sgstAmount = booking.sgstAmount ?? +(taxableAmount * sgstRate / 100).toFixed(2);
    const discount = booking.discount || 0;
    const grandTotal = booking.totalAmount || Math.round((taxableAmount + cgstAmount + sgstAmount - discount) * 100) / 100;

    const totalAdvance = (booking.advancePayments || []).reduce((s, p) => s + (p.amount || 0), 0);
    
    // Get all room numbers
    const roomNumbers = rooms.map(r => r.roomNumber).join(', ');
    const roomTypes = [...new Set(rooms.map(r => r.category?.name).filter(Boolean))].join(', ');

    res.json({
      invoiceDetails: {
        invoiceNumber: booking.invoiceNumber,
        invoiceDate: new Date().toLocaleDateString('en-GB'),
        grcNumber: booking.grcNumber,
        roomNumber: roomNumbers,
        roomType: roomTypes,
        checkIn: new Date(booking.checkIn).toLocaleDateString('en-GB'),
        checkOut: new Date(booking.checkOut).toLocaleDateString('en-GB'),
        checkInTime: booking.checkInTime || '12:00',
        checkOutTime: booking.checkOutTime || '12:00',
        nights: days,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        paymentMode: booking.paymentMode,
      },
      guestDetails: {
        name: booking.guest?.name,
        address: booking.guest?.address,
        city: booking.guest?.city,
        phone: booking.guest?.phone,
        email: booking.guest?.email,
        idType: booking.guest?.idType,
        idNumber: booking.guest?.idNumber,
      },
      items,
      taxes: {
        taxableAmount,
        cgstRate,
        sgstRate,
        cgstAmount: +cgstAmount.toFixed(2),
        sgstAmount: +sgstAmount.toFixed(2),
      },
      summary: {
        roomAmount: totalRoomRent,
        extraBedAmount: extraBedTotal,
        taxableAmount,
        cgstAmount: +cgstAmount.toFixed(2),
        sgstAmount: +sgstAmount.toFixed(2),
        discount,
        grandTotal,
        totalAdvance,
        balanceDue: Math.max(0, grandTotal - totalAdvance),
      },
      advancePayments: booking.advancePayments?.filter(ap => !ap.isFinalPayment) || [],
      billingInstruction: booking.billingInstruction,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
