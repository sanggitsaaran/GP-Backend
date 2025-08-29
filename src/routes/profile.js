const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const multer = require('multer');
const path = require('path');

// Configure multer for profile image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/profile/')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// @route   GET /api/profile
// @desc    Get current user profile
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    console.log('👤 Getting profile for user:', req.user._id);
    
    const user = req.user; // User is already loaded by auth middleware
    
    // Check if profile is complete
    const isProfileComplete = !!(
      user.name && 
      user.email && 
      user.phone
    );
    
    // Update isProfileComplete if it has changed
    if (user.isProfileComplete !== isProfileComplete) {
      user.isProfileComplete = isProfileComplete;
      await user.save();
    }

    console.log('✅ Profile retrieved successfully');
    
    res.json({
      success: true,
      data: {
        _id: user._id,
        phone: user.phone,
        name: user.name,
        email: user.email,
        role: user.role,
        language: user.language,
        profileImageUrl: user.profileImageUrl,
        kycStatus: user.kycStatus,
        isVerified: user.isVerified,
        isProfileComplete: isProfileComplete,
        wardVillageId: user.wardVillageId,
        department: user.department,
        designation: user.designation,
        escalationLevel: user.escalationLevel,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    console.error('❌ Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while retrieving profile'
    });
  }
});

// @route   PUT /api/profile
// @desc    Update user profile
// @access  Private
router.put('/', protect, async (req, res) => {
  try {
    console.log('✏️ Updating profile for user:', req.user._id);
    console.log('📝 Update data:', req.body);
    
    const { name, email, language, department, designation } = req.body;
    
    const user = req.user; // User is already loaded by auth middleware

    // Update fields
    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;
    if (language !== undefined) user.language = language;
    if (department !== undefined) user.department = department;
    if (designation !== undefined) user.designation = designation;

    // Check if profile is now complete
    const isProfileComplete = !!(
      user.name && 
      user.email && 
      user.phone
    );
    
    user.isProfileComplete = isProfileComplete;
    
    await user.save();

    console.log('✅ Profile updated successfully');
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        _id: user._id,
        phone: user.phone,
        name: user.name,
        email: user.email,
        role: user.role,
        language: user.language,
        profileImageUrl: user.profileImageUrl,
        kycStatus: user.kycStatus,
        isVerified: user.isVerified,
        isProfileComplete: isProfileComplete,
        wardVillageId: user.wardVillageId,
        department: user.department,
        designation: user.designation,
        escalationLevel: user.escalationLevel,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    console.error('❌ Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating profile'
    });
  }
});

// @route   POST /api/profile/upload-image
// @desc    Upload profile image
// @access  Private
router.post('/upload-image', protect, upload.single('profileImage'), async (req, res) => {
  try {
    console.log('📸 Uploading profile image for user:', req.user._id);
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update profile image URL
    const imageUrl = `/uploads/profile/${req.file.filename}`;
    user.profileImageUrl = imageUrl;
    
    await user.save();

    console.log('✅ Profile image uploaded successfully:', imageUrl);
    
    res.json({
      success: true,
      message: 'Profile image uploaded successfully',
      data: {
        profileImageUrl: imageUrl
      }
    });
  } catch (error) {
    console.error('❌ Upload profile image error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while uploading profile image'
    });
  }
});

// @route   GET /api/profile/completeness
// @desc    Check profile completeness
// @access  Private
router.get('/completeness', protect, async (req, res) => {
  try {
    console.log('🔍 Checking profile completeness for user:', req.user._id);
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const missingFields = [];
    const requiredFields = [
      { field: 'name', label: 'Full Name' },
      { field: 'email', label: 'Email Address' },
      { field: 'phone', label: 'Phone Number' }
    ];

    // Check required fields
    requiredFields.forEach(({ field, label }) => {
      if (!user[field] || user[field].trim() === '') {
        missingFields.push({
          field,
          label,
          required: true
        });
      }
    });

    const isComplete = missingFields.length === 0;
    const completionPercentage = Math.round(
      ((requiredFields.length - missingFields.length) / requiredFields.length) * 100
    );

    console.log('📊 Profile completeness:', completionPercentage + '%');
    
    res.json({
      success: true,
      data: {
        isComplete,
        completionPercentage,
        missingFields,
        totalFields: requiredFields.length,
        completedFields: requiredFields.length - missingFields.length
      }
    });
  } catch (error) {
    console.error('❌ Check profile completeness error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while checking profile completeness'
    });
  }
});

// @route   DELETE /api/profile/image
// @desc    Delete profile image
// @access  Private
router.delete('/image', protect, async (req, res) => {
  try {
    console.log('🗑️ Deleting profile image for user:', req.user._id);
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.profileImageUrl = null;
    await user.save();

    console.log('✅ Profile image deleted successfully');
    
    res.json({
      success: true,
      message: 'Profile image deleted successfully'
    });
  } catch (error) {
    console.error('❌ Delete profile image error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting profile image'
    });
  }
});

module.exports = router;
