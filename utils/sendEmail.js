const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendBookingConfirmation = async (booking, pdfBuffer) => {
  const { guest, grcNumber, invoiceNumber, checkIn, checkOut, rooms, totalAmount, adults, children, paymentStatus } = booking;
  if (!guest?.email) throw new Error('Guest email not found');

  const roomList = rooms?.map(r => `Room ${r.roomNumber} (${r.category?.name || ''})`).join(', ') || '—';
  const checkInDate = new Date(checkIn).toLocaleDateString('en-GB');
  const checkOutDate = new Date(checkOut).toLocaleDateString('en-GB');
  const days = Math.max(1, Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)));

  await transporter.sendMail({
    from: `"Buddha Hotel" <${process.env.EMAIL_FROM}>`,
    to: guest.email,
    subject: `Booking Confirmation - ${grcNumber}`,
    attachments: pdfBuffer ? [{
      filename: `Invoice-${grcNumber}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf',
    }] : [],
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e0d5a0;border-radius:8px;overflow:hidden;">
        <div style="background:#3d2e10;padding:24px;text-align:center;">
          <h1 style="color:#C9A84C;margin:0;">Buddha Hotel</h1>
          <p style="color:#fff;margin:8px 0 0;">Booking Confirmation</p>
        </div>
        <div style="padding:24px;">
          <p style="color:#3d2e10;">Dear <strong>${guest.salutation || ''} ${guest.name}</strong>,</p>
          <p style="color:#3d2e10;">Your booking has been confirmed. Here are your booking details:</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;">
            <tr style="background:#FDF6E3;">
              <td style="padding:10px;border:1px solid #E8D5A0;color:#5a4228;font-weight:bold;">GRC Number</td>
              <td style="padding:10px;border:1px solid #E8D5A0;color:#3d2e10;">${grcNumber}</td>
            </tr>
            <tr>
              <td style="padding:10px;border:1px solid #E8D5A0;color:#5a4228;font-weight:bold;">Invoice Number</td>
              <td style="padding:10px;border:1px solid #E8D5A0;color:#3d2e10;">${invoiceNumber}</td>
            </tr>
            <tr style="background:#FDF6E3;">
              <td style="padding:10px;border:1px solid #E8D5A0;color:#5a4228;font-weight:bold;">Check-In</td>
              <td style="padding:10px;border:1px solid #E8D5A0;color:#3d2e10;">${checkInDate}</td>
            </tr>
            <tr>
              <td style="padding:10px;border:1px solid #E8D5A0;color:#5a4228;font-weight:bold;">Check-Out</td>
              <td style="padding:10px;border:1px solid #E8D5A0;color:#3d2e10;">${checkOutDate}</td>
            </tr>
            <tr style="background:#FDF6E3;">
              <td style="padding:10px;border:1px solid #E8D5A0;color:#5a4228;font-weight:bold;">Number of Nights</td>
              <td style="padding:10px;border:1px solid #E8D5A0;color:#3d2e10;">${days}</td>
            </tr>
            <tr>
              <td style="padding:10px;border:1px solid #E8D5A0;color:#5a4228;font-weight:bold;">Rooms</td>
              <td style="padding:10px;border:1px solid #E8D5A0;color:#3d2e10;">${roomList}</td>
            </tr>
            <tr style="background:#FDF6E3;">
              <td style="padding:10px;border:1px solid #E8D5A0;color:#5a4228;font-weight:bold;">Guests</td>
              <td style="padding:10px;border:1px solid #E8D5A0;color:#3d2e10;">${adults || 1} Adult(s)${children ? `, ${children} Child(ren)` : ''}</td>
            </tr>
            <tr>
              <td style="padding:10px;border:1px solid #E8D5A0;color:#5a4228;font-weight:bold;">Total Amount</td>
              <td style="padding:10px;border:1px solid #E8D5A0;color:#9C7C38;font-weight:bold;">&#8377;${totalAmount?.toFixed(2)}</td>
            </tr>
            <tr style="background:#FDF6E3;">
              <td style="padding:10px;border:1px solid #E8D5A0;color:#5a4228;font-weight:bold;">Payment Status</td>
              <td style="padding:10px;border:1px solid #E8D5A0;color:#3d2e10;">${paymentStatus?.toUpperCase()}</td>
            </tr>
          </table>
          <p style="color:#3d2e10;">We look forward to welcoming you at Buddha Hotel!</p>
          <p style="color:#9C7C38;font-size:12px;">If you have any questions, please contact us.</p>
        </div>
        <div style="background:#3d2e10;padding:16px;text-align:center;">
          <p style="color:#C9A84C;margin:0;font-size:12px;">© Buddha Hotel. All rights reserved.</p>
        </div>
      </div>
    `,
  });
};

module.exports = { sendBookingConfirmation };
