const router = require('express').Router();
const auth = require('../middleware/auth');
const { upload } = require('../config/cloudinary');
const { getGuests, getGuest, createGuest, updateGuest, deleteGuest } = require('../controllers/guestController');

router.get('/', auth, getGuests);
router.get('/:id', auth, getGuest);
router.post('/', auth, upload.fields([{ name: 'guestPhoto', maxCount: 1 }, { name: 'idProofPhotos', maxCount: 10 }]), createGuest);
router.put('/:id', auth, upload.fields([{ name: 'guestPhoto', maxCount: 1 }, { name: 'idProofPhotos', maxCount: 10 }]), updateGuest);
router.delete('/:id', auth, deleteGuest);

module.exports = router;
