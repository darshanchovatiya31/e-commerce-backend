const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const addressesController = require('../controllers/addressesController');
const { addressFields, partialAddressFields, idParam } = require('../validators/addressValidators');

// Temporary: public ping to verify router is mounted correctly
router.get('/ping', (req, res) => {
  res.json({ ok: true, route: 'addresses/ping' });
});

// All routes require authentication
router.use(authMiddleware);

// GET /api/addresses - list all addresses of current user
router.get('/', addressesController.listAddresses);

// POST /api/addresses - create new address
router.post('/', addressFields, addressesController.addAddress);

// PUT /api/addresses/:addressId - update address
router.put('/:addressId', idParam, partialAddressFields, addressesController.updateAddress);

// DELETE /api/addresses/:addressId - remove address
router.delete('/:addressId', idParam, addressesController.deleteAddress);

// PATCH /api/addresses/:addressId/default - set default address
router.patch('/:addressId/default', idParam, addressesController.setDefaultAddress);

module.exports = router;