const router = require('express').Router();
const auth = require('../middleware/auth');
const { getStaff, getStaffById, createStaff, updateStaff, deleteStaff } = require('../controllers/staffController');

router.get('/', auth, getStaff);
router.get('/:id', auth, getStaffById);
router.post('/', auth, createStaff);
router.put('/:id', auth, updateStaff);
router.delete('/:id', auth, deleteStaff);

module.exports = router;
