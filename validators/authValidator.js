const { check } = require('express-validator');
const validatorMiddleware = require('../midlewares/validatorMiddleware');
const User = require('../models/userModel');

exports.signupValidator = [
  check('userName')
    .notEmpty()
    .withMessage('User required')
    .isLength({ min: 3 })
    .withMessage('Too short User name'),
    

  check('email')
    .notEmpty()
    .withMessage('Email required')
    .isEmail()
    .withMessage('Invalid email address')
    .custom((val) =>
      User.findOne({ email: val }).then((user) => {
        if (user) {
          return Promise.reject(new Error('E-mail already in user'));
        }
      })
    ),

    check('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Invalid phone number'),

  check('password')
    .notEmpty()
    .withMessage('Password required')
   .isLength({ min: 4 })
    .withMessage('Password must be at least 8 characters')
    .custom((password, { req }) => {
      if (password !== req.body.passwordConfirm) {
        throw new Error('Password Confirmation incorrect');
      }
      return true;
    }),

  check('passwordConfirm')
    .notEmpty()
    .withMessage('Password confirmation required'),

  validatorMiddleware,
];



exports.loginValidator = [
    check('email')
      .notEmpty()
      .withMessage('Email required')
      .isEmail()
      .withMessage('Invalid email address'),
  
    check('password')
      .notEmpty()
      .withMessage('Password required')
      .isLength({ min: 4 })
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (!@#$%^&*._-)'),
    validatorMiddleware,
  ];