const express = require('express');
const {
  getUsers,
  uploadUserImage,
  resizeImage,
  createUser,
  getUserById,
  updateUser,
  deleteUser,
  getMyProfile,
  updateMyPassword,
  updateMyProfile,
  deleteMyAccount,
  addAddress,
  removeAddress,
  addPaymentMethod,
  removePaymentMethod,
  getMyMembership,
  getMyOrders,
  getMyDevices,
  logoutAllDevices,
  logoutDevice,
  updateAddress,
  updatePaymentMethod
} = require('../controllers/userController');

const {
  createUserValidator,
  getUserValidator,
  updateUserValidator,
  deleteUserValidator,
  changeAccountPasswordValidator,
  updateLoggedUserDataValidator,
} = require('../validators/userValidator');

const Auth = require('../controllers/authController');

const router = express.Router();

router.use(Auth.protect);

// -------------------- Logged User --------------------

// Profile
router.get('/me', getMyProfile);
router.put('/me/password', changeAccountPasswordValidator, updateMyPassword);
router.put(
  '/me',
  uploadUserImage,
  resizeImage,
  updateLoggedUserDataValidator,
  updateMyProfile
);
router.delete('/me', deleteMyAccount);

// Membership
router.get('/me/membership', getMyMembership);

// Orders
router.get('/me/orders', getMyOrders);

// Addresses
router.post('/me/addresses', addAddress);
router.put('/me/addresses/:addressId', updateAddress)
router.delete('/me/addresses/:addressId', removeAddress);

// Payment Methods
router.post('/me/payment-methods', addPaymentMethod);
router.put('/me/payment-methods/:methodId', updatePaymentMethod)
router.delete('/me/payment-methods/:methodId', removePaymentMethod);

//Logged Devices
router.get("/my-devices",getMyDevices );
router.delete("/my-devices/:deviceId", logoutDevice);
router.delete("/my-devices", logoutAllDevices);




// -------------------- Admin --------------------

router
  .route('/')
  .get(Auth.allowedTo('admin'), getUsers)
  .post(
    Auth.allowedTo('admin'),
    uploadUserImage,
    resizeImage,
    createUserValidator,
    createUser
  );

router
  .route('/:id')
  .get(Auth.allowedTo('admin'), getUserValidator, getUserById)
  .put(
    Auth.allowedTo('admin'),
    uploadUserImage,
    resizeImage,
    updateUserValidator,
    updateUser
  )
  .delete(Auth.allowedTo('admin'), deleteUserValidator, deleteUser);

module.exports = router;
