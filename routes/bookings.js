const router = require('express').Router();
const auth = require('../middleware/auth');
const { getBookings, getBooking, createBooking, updateBooking, deleteBooking, checkAvailability } = require('../controllers/bookingController');

router.get('/check-availability', auth, checkAvailability);
router.get('/', auth, getBookings);
router.get('/:id', auth, getBooking);
router.post('/', auth, createBooking);
router.put('/:id', auth, updateBooking);
router.delete('/:id', auth, deleteBooking);

module.exports = router;
