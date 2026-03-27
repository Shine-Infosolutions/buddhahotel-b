const router = require('express').Router();
const auth = require('../middleware/auth');
const { getRooms, getRoom, createRoom, updateRoom, deleteRoom } = require('../controllers/roomController');

router.get('/', auth, getRooms);
router.get('/:id', auth, getRoom);
router.post('/', auth, createRoom);
router.put('/:id', auth, updateRoom);
router.delete('/:id', auth, deleteRoom);

module.exports = router;
