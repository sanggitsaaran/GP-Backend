const express = require('express');
const router = express.Router();
const { 
  sendOTPForOfficer, 
  verifyOTPForOfficer, 
  completeOfficerProfile,
  getCurrentOfficer
} = require('../controllers/officerAuthController');
const { protect, restrictTo } = require('../middleware/auth');

// Public routes for officer authentication
router.post('/request-otp', sendOTPForOfficer);
router.post('/verify-otp', verifyOTPForOfficer);

// Protected routes for officers only
router.get('/me', protect, restrictTo('officer'), getCurrentOfficer);
router.put('/complete-profile', protect, restrictTo('officer'), completeOfficerProfile);

module.exports = router;
