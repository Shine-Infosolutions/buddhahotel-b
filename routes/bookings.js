const router = require('express').Router();
const auth = require('../middleware/auth');
const { getBookings, getBooking, createBooking, updateBooking, deleteBooking, checkAvailability, previewNumbers, searchGuest, getBookingByGRC } = require('../controllers/bookingController');

router.get('/check-availability', auth, checkAvailability);
router.get('/preview-numbers', auth, previewNumbers);
router.get('/search-guest', auth, searchGuest);
router.get('/grc/:grc', auth, getBookingByGRC);
router.get('/', auth, getBookings);
router.get('/:id', auth, getBooking);
router.post('/', auth, createBooking);
router.put('/:id', auth, updateBooking);
router.delete('/:id', auth, deleteBooking);

module.exports = router;
