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
      .populate({ path: 'room', populate: { path: 'category' } });
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const days = Math.max(1, Math.ceil((new Date(booking.checkOut) - new Date(booking.checkIn)) / (1000 * 60 * 60 * 24)));
    const roomRate = booking.room?.price || 0;
    const roomRentAmount = roomRate * days;

    // Calculate extra bed total from extraBeds array
    const extraBedTotal = (booking.extraBeds || []).reduce((sum, eb) => {
      const ebFrom = eb.from ? new Date(eb.from) : new Date(booking.checkIn);
      const ebTo = eb.to ? new Date(eb.to) : new Date(booking.checkOut);
      const ebDays = Math.max(1, Math.ceil((ebTo - ebFrom) / (1000 * 60 * 60 * 24)));
      return sum + (eb.chargePerDay || 0) * ebDays;
    }, 0);

    const taxableAmount = booking.taxableAmount || (roomRentAmount + extraBedTotal);
    const cgstRate = booking.cgstRate ?? 0;
    const sgstRate = booking.sgstRate ?? 0;
    const cgstAmount = booking.cgstAmount ?? +(taxableAmount * cgstRate / 100).toFixed(2);
    const sgstAmount = booking.sgstAmount ?? +(taxableAmount * sgstRate / 100).toFixed(2);
    const discount = booking.discount || 0;
    const grandTotal = booking.totalAmount || Math.round((taxableAmount + cgstAmount + sgstAmount - discount) * 100) / 100;

    const items = [];
    items.push({
      date: new Date(booking.checkIn).toLocaleDateString('en-GB'),
      particulars: `Room Rent ${booking.room?.category?.name || ''} (Room: ${booking.room?.roomNumber || ''})`,
      roomRate,
      declaredRate: roomRentAmount,
      hsn: 996311,
      taxRate: cgstRate + sgstRate,
      amount: roomRentAmount,
    });

    // Add each extra bed as a separate line item
    (booking.extraBeds || []).forEach((eb) => {
      const ebFrom = eb.from ? new Date(eb.from) : new Date(booking.checkIn);
      const ebTo = eb.to ? new Date(eb.to) : new Date(booking.checkOut);
      const ebDays = Math.max(1, Math.ceil((ebTo - ebFrom) / (1000 * 60 * 60 * 24)));
      const ebAmount = (eb.chargePerDay || 0) * ebDays;
      if (ebAmount > 0) {
        items.push({
          date: ebFrom.toLocaleDateString('en-GB'),
          particulars: `Extra Bed Charge (${ebDays} night${ebDays > 1 ? 's' : ''} × ₹${eb.chargePerDay})`,
          roomRate: eb.chargePerDay,
          declaredRate: ebAmount,
          hsn: 996311,
          taxRate: cgstRate + sgstRate,
          amount: ebAmount,
        });
      }
    });

    const totalAdvance = (booking.advancePayments || []).reduce((s, p) => s + (p.amount || 0), 0);

    res.json({
      invoiceDetails: {
        invoiceNumber: booking.invoiceNumber,
        invoiceDate: new Date().toLocaleDateString('en-GB'),
        grcNumber: booking.grcNumber,
        roomNumber: booking.room?.roomNumber,
        roomType: booking.room?.category?.name,
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
        roomAmount: roomRentAmount,
        extraBedAmount: extraBedTotal,
        taxableAmount,
        cgstAmount: +cgstAmount.toFixed(2),
        sgstAmount: +sgstAmount.toFixed(2),
        discount,
        grandTotal,
        totalAdvance,
        balanceDue: Math.max(0, grandTotal - totalAdvance),
      },
      advancePayments: booking.advancePayments || [],
      billingInstruction: booking.billingInstruction,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
