const express = require('express');
const router = express.Router();
const { 
  sendOTPController, 
  verifyOTPController, 
  getCurrentUser, 
  completeProfile,
  updateProfilePicture
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// Set up multer storage for profile pictures
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../uploads/'));
  },
  filename: function (req, file, cb) {
    cb(null, `profile-${req.user._id}-${Date.now()}${path.extname(file.originalname)}`);
  },
});

// Check file type
const fileFilter = (req, file, cb) => {
  const filetypes = /jpeg|jpg|png/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb('Error: Images only!');
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 2000000 }, // 2MB
  fileFilter,
});

// Public routes
router.post('/request-otp', sendOTPController);
router.post('/verify-otp', verifyOTPController);

// Protected routes
router.get('/me', protect, getCurrentUser);
router.put('/complete-profile', protect, completeProfile);
router.put('/profile-picture', protect, upload.single('profilePic'), updateProfilePicture);

module.exports = router;