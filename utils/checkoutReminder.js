const cron = require('node-cron');
const twilio = require('twilio');
const Booking = require('../models/Booking');

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const getCheckoutDateTime = (booking) => {
  const date = new Date(booking.checkOut);
  const [hours, minutes] = (booking.checkOutTime || '12:00').split(':').map(Number);
  // checkOut is stored as midnight UTC, build the datetime using IST offset (UTC+5:30)
  const checkoutIST = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    hours - 5,          // convert IST to UTC
    minutes - 30,
  ));
  return checkoutIST;
};

const sendCheckoutReminders = async () => {
  try {
    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 60 * 1000);
    const in31 = new Date(now.getTime() + 31 * 60 * 1000);

    // fetch all checked_in bookings where checkOut date is today or tomorrow (wide net, filter precisely below)
    const bookings = await Booking.find({
      status: 'checked_in',
      reminderSent: { $ne: true },
    }).populate('guest');

    for (const booking of bookings) {
      const checkoutDateTime = getCheckoutDateTime(booking);
      // only send if checkout is within the 30-31 min window
      if (checkoutDateTime < in30 || checkoutDateTime >= in31) continue;

      const phone = booking.guest?.whatsappNo || booking.guest?.phone;
      if (!phone) continue;

      const cleanPhone = phone.replace(/\D/g, '');
      const toNumber = cleanPhone.startsWith('91') ? `whatsapp:+${cleanPhone}` : `whatsapp:+91${cleanPhone}`;

      await client.messages.create({
        from: process.env.TWILIO_WHATSAPP_FROM,
        to: toNumber,
        body: `Dear ${booking.guest.name}, your checkout at Buddha Hotel is due in 30 minutes (${booking.checkOutTime || '12:00'}). Please proceed to the front desk. We hope you enjoyed your stay! 🙏`,
      });

      booking.reminderSent = true;
      await booking.save();
      console.log(`✅ Checkout reminder sent to ${booking.guest.name} (${toNumber})`);
    }
  } catch (err) {
    console.error('❌ Checkout reminder error:', err.message);
  }
};

// runs every minute
cron.schedule('* * * * *', sendCheckoutReminders);
console.log('🕐 Checkout reminder cron job started');

module.exports = sendCheckoutReminders;
