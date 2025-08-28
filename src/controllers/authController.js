const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// OTP Utility Functions
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const getOTPExpiryTime = () => {
  return new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now
};

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
};

// @desc    Send OTP to phone
// @route   POST /api/auth/request-otp
// @access  Public
exports.sendOTPController = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required',
      });
    }

    // Generate 6-digit OTP
    const otp = generateOTP();
    const otpExpiry = getOTPExpiryTime();

    // Hash the OTP before storing
    const hashedOTP = await bcrypt.hash(otp, 10);

    // Find user or create new one
    let user = await User.findOne({ phone });
    
    if (!user) {
      user = new User({
        phone,
        otp: {
          code: hashedOTP,
          expiresAt: otpExpiry,
        },
      });
    } else {
      user.otp = {
        code: hashedOTP,
        expiresAt: otpExpiry,
      };
    }

    await user.save();

    // In production, send OTP via SMS service
    console.log(`OTP for ${phone}: ${otp}`); // For development only

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      data: null,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Verify OTP and login
// @route   POST /api/auth/verify-otp
// @access  Public
exports.verifyOTPController = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and OTP are required',
      });
    }

    // Find user
    const user = await User.findOne({ phone });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    console.log('User OTP data:', user.otp);
    console.log('Provided OTP:', otp);
    console.log('OTP Expiry:', user.otp?.expiresAt);
    console.log('Current Time:', new Date());

    // Check if OTP exists and is not expired
    if (!user.otp || !user.otp.code) {
      return res.status(400).json({
        success: false,
        message: 'No OTP found. Please request a new one.',
      });
    }

    // Check expiration
    if (new Date() > user.otp.expiresAt) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new one.',
      });
    }

    // Verify OTP
    const isValidOTP = await user.matchOTP(otp);
    console.log('OTP Match Result:', isValidOTP);
    
    if (!isValidOTP) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP',
      });
    }

    // Clear OTP after successful verification
    user.otp = undefined;
    user.isVerified = true;
    await user.save();

    // Generate JWT token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          _id: user._id,
          phone: user.phone,
          name: user.name,
          email: user.email,
          role: user.role,
          isProfileComplete: user.isProfileComplete,
        },
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-otp');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'User retrieved successfully',
      data: {
        _id: user._id,
        phone: user.phone,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePicture: user.profileImageUrl,
        isProfileComplete: user.isProfileComplete,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Complete user profile
// @route   PUT /api/auth/complete-profile
// @access  Private
exports.completeProfile = async (req, res) => {
  try {
    const { name, role, email } = req.body;

    if (!name || !role) {
      return res.status(400).json({
        success: false,
        message: 'Name and role are required',
      });
    }

    // Validate role
    const validRoles = ['citizen', 'volunteer', 'officer', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role',
      });
    }

    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Update user profile
    user.name = name;
    user.role = role;
    if (email) user.email = email;
    user.isProfileComplete = true;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile completed successfully',
      data: {
        _id: user._id,
        phone: user.phone,
        name: user.name,
        email: user.email,
        role: user.role,
        isProfileComplete: user.isProfileComplete,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Update profile picture
// @route   PUT /api/auth/profile-picture
// @access  Private
exports.updateProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file uploaded',
      });
    }

    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Update profile picture URL
    const profilePictureUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    user.profileImageUrl = profilePictureUrl;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile picture updated successfully',
      data: {
        profilePicture: profilePictureUrl,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};
