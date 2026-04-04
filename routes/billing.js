const router = require('express').Router();
const auth = require('../middleware/auth');
const { getBills, getBill, createBill, updateBill, deleteBill, getBillByBooking, getInvoiceByBooking } = require('../controllers/billingController');

router.get('/invoice/:bookingId', auth, getInvoiceByBooking);
router.get('/booking/:bookingId', auth, getBillByBooking);
router.get('/', auth, getBills);
router.get('/:id', auth, getBill);
router.post('/', auth, createBill);
router.put('/:id', auth, updateBill);
router.delete('/:id', auth, deleteBill);

module.exports = router;
