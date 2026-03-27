const router = require('express').Router();
const auth = require('../middleware/auth');
const { getGuests, getGuest, createGuest, updateGuest, deleteGuest } = require('../controllers/guestController');

router.get('/', auth, getGuests);
router.get('/:id', auth, getGuest);
router.post('/', auth, createGuest);
router.put('/:id', auth, updateGuest);
router.delete('/:id', auth, deleteGuest);

module.exports = router;
