const { validationResult } = require('express-validator');
const responseHelper = require('../utils/responseHelper');

// List addresses for authenticated user
exports.listAddresses = async (req, res, next) => {
  try {
    console.log('listAddresses called');
    
    const user = req.user;
    return responseHelper.success(res, user.addresses || [], 'Addresses fetched successfully');
  } catch (error) {
    next(error);
  }
};

// Add new address
exports.addAddress = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return responseHelper.validationError(res, errors);
    }

    const user = req.user;
    const addressData = {
      fullName: req.body.fullName,
      phone: req.body.phone,
      address: req.body.address,
      city: req.body.city,
      state: req.body.state,
      pincode: req.body.pincode,
      country: req.body.country || 'India',
      isDefault: !!req.body.isDefault,
    };

    // If marking as default or it's first address, unset others
    if (addressData.isDefault || user.addresses.length === 0) {
      user.addresses.forEach((a) => (a.isDefault = false));
      addressData.isDefault = true;
    }

    user.addresses.push(addressData);
    await user.save();

    return responseHelper.success(res, user.addresses, 'Address added successfully', 201);
  } catch (error) {
    next(error);
  }
};

// Update address by subdocument id
exports.updateAddress = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return responseHelper.validationError(res, errors);
    }

    const user = req.user;
    const { addressId } = req.params;

    const address = user.addresses.id(addressId);
    if (!address) {
      return responseHelper.error(res, 'Address not found', 404);
    }

    const updateData = {
      fullName: req.body.fullName,
      phone: req.body.phone,
      address: req.body.address,
      city: req.body.city,
      state: req.body.state,
      pincode: req.body.pincode,
      country: req.body.country,
    };

    // Remove undefined fields
    Object.keys(updateData).forEach((k) => updateData[k] === undefined && delete updateData[k]);

    // If setting as default
    if (req.body.isDefault === true) {
      user.addresses.forEach((a) => (a.isDefault = false));
      address.isDefault = true;
    }

    Object.assign(address, updateData);

    await user.save();
    return responseHelper.success(res, user.addresses, 'Address updated successfully');
  } catch (error) {
    next(error);
  }
};

// Delete address
exports.deleteAddress = async (req, res, next) => {
  try {
    const user = req.user;
    const { addressId } = req.params;

    const address = user.addresses.id(addressId);
    if (!address) {
      return responseHelper.error(res, 'Address not found', 404);
    }

    const wasDefault = address.isDefault;
    address.remove();

    if (wasDefault && user.addresses.length > 0) {
      user.addresses[0].isDefault = true;
    }

    await user.save();
    return responseHelper.success(res, user.addresses, 'Address removed successfully');
  } catch (error) {
    next(error);
  }
};

// Set default address
exports.setDefaultAddress = async (req, res, next) => {
  try {
    const user = req.user;
    const { addressId } = req.params;

    const address = user.addresses.id(addressId);
    if (!address) {
      return responseHelper.error(res, 'Address not found', 404);
    }

    user.addresses.forEach((a) => (a.isDefault = false));
    address.isDefault = true;
    await user.save();

    return responseHelper.success(res, user.addresses, 'Default address set successfully');
  } catch (error) {
    next(error);
  }
};