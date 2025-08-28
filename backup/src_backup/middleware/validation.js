const { body, validationResult } = require('express-validator');
const { formatValidationErrors, errorResponse } = require('../utils/apiUtils');

// Validate request middleware
exports.validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return errorResponse(
      res,
      400,
      'Validation failed',
      formatValidationErrors(errors.array())
    );
  }
  next();
};

// OTP verification validation rules
exports.otpValidationRules = [
  body('phone').notEmpty().withMessage('Phone number is required'),
  body('otp').notEmpty().withMessage('OTP is required').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
];

// Phone number validation rules
exports.phoneValidationRules = [
  body('phone').notEmpty().withMessage('Phone number is required'),
];

// Profile completion validation rules
exports.profileValidationRules = [
  body('name').notEmpty().withMessage('Name is required'),
  body('role').notEmpty().withMessage('Role is required')
    .isIn(['citizen', 'volunteer', 'officer', 'admin']).withMessage('Invalid role'),
];

// Report creation validation rules
exports.reportValidationRules = [
  body('title').notEmpty().withMessage('Title is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('category').notEmpty().withMessage('Category is required')
    .isIn(['WATER', 'ELECTRICITY', 'ROAD', 'SANITATION', 'EDUCATION', 'HEALTH', 'AGRICULTURE', 'OTHER'])
    .withMessage('Invalid category'),
  body('address').notEmpty().withMessage('Address is required'),
  body('district').notEmpty().withMessage('District is required'),
  body('state').notEmpty().withMessage('State is required'),
  body('pincode').notEmpty().withMessage('Pincode is required'),
];

// Comment validation rules
exports.commentValidationRules = [
  body('text').notEmpty().withMessage('Comment text is required'),
];

// Status update validation rules
exports.statusUpdateValidationRules = [
  body('status').notEmpty().withMessage('Status is required')
    .isIn(['PENDING', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'])
    .withMessage('Invalid status'),
];