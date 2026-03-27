const router = require('express').Router();
const auth = require('../middleware/auth');
const { getBills, getBill, createBill, updateBill, deleteBill } = require('../controllers/billingController');

router.get('/', auth, getBills);
router.get('/:id', auth, getBill);
router.post('/', auth, createBill);
router.put('/:id', auth, updateBill);
router.delete('/:id', auth, deleteBill);

module.exports = router;
