const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Department = require('../models/Department');
const Officer = require('../models/Officer');
const { generateOTP } = require('../utils/otpGenerator');
const { sendOTP } = require('../utils/smsService');

// @desc    Send OTP for officer authentication
// @route   POST /api/officer-auth/request-otp
// @access  Public
const sendOTPForOfficer = async (req, res) => {
  try {
    const { phone } = req.body;

    // Validate phone number
    if (!phone || !/^\d{10}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid 10-digit phone number'
      });
    }

    // Check if user exists and is an officer
    let user = await User.findOne({ phone }).populate('department');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No officer account found with this phone number. Please contact admin.'
      });
    }

    if (user.role !== 'officer') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. This is for government officials only.'
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Save OTP to user
    user.otp = {
      code: otp,
      expiresAt: otpExpiry
    };
    await user.save();

    // Send OTP (In production, integrate with SMS service)
    console.log(`🔐 OTP for ${phone}: ${otp}`);
    
    // For demo purposes, we'll return the OTP in development
    const otpResponse = process.env.NODE_ENV === 'development' ? { otp } : {};

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      data: {
        phone,
        ...otpResponse
      }
    });

  } catch (error) {
    console.error('Error in sendOTPForOfficer:', error);
    res.status(500).json({
      success: false,
      message: 'Server error occurred'
    });
  }
};

// @desc    Verify OTP and authenticate officer
// @route   POST /api/officer-auth/verify-otp
// @access  Public
const verifyOTPForOfficer = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    // Validate input
    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and OTP are required'
      });
    }

    // Find user
    const user = await User.findOne({ phone }).populate('department');
    
    if (!user || user.role !== 'officer') {
      return res.status(404).json({
        success: false,
        message: 'Officer not found'
      });
    }

    // Check if OTP exists and is not expired
    if (user.isOTPExpired()) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new one.'
      });
    }

    // Verify OTP
    const isValidOTP = await user.matchOTP(otp);
    if (!isValidOTP) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP'
      });
    }

    // Get officer profile
    const officer = await Officer.findOne({ user: user._id }).populate('department');

    // Update last login
    user.lastLogin = new Date();
    user.otp = undefined; // Clear OTP after successful verification
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user._id,
        role: user.role,
        officerId: officer?._id
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '30d' }
    );

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user._id,
          phone: user.phone,
          name: user.name,
          role: user.role,
          department: user.department,
          designation: user.designation,
          escalationLevel: user.escalationLevel,
          isProfileComplete: user.isProfileComplete,
          profileImageUrl: user.profileImageUrl
        },
        officer: officer ? {
          id: officer._id,
          departmentDetails: officer.department,
          jurisdictionId: officer.jurisdictionId,
          designation: officer.designation,
          escalationLevel: officer.escalationLevel,
          isActive: officer.isActive
        } : null
      }
    });

  } catch (error) {
    console.error('Error in verifyOTPForOfficer:', error);
    res.status(500).json({
      success: false,
      message: 'Server error occurred'
    });
  }
};

// @desc    Complete officer profile
// @route   PUT /api/officer-auth/complete-profile
// @access  Private (Officer only)
const completeOfficerProfile = async (req, res) => {
  try {
    const { name, department, designation, jurisdictionId } = req.body;

    // Validate required fields
    if (!name || !department || !designation) {
      return res.status(400).json({
        success: false,
        message: 'Name, department, and designation are required'
      });
    }

    // Find department
    const departmentDoc = await Department.findOne({ code: department });
    if (!departmentDoc) {
      return res.status(404).json({
        success: false,
        message: 'Invalid department code'
      });
    }

    // Update user profile
    const user = await User.findById(req.user.id);
    user.name = name;
    user.department = department;
    user.designation = designation;
    user.isProfileComplete = true;

    await user.save();

    // Create or update officer record
    let officer = await Officer.findOne({ user: user._id });
    
    if (!officer) {
      officer = new Officer({
        user: user._id,
        department: departmentDoc._id,
        jurisdictionId: jurisdictionId || 'default',
        designation,
        escalationLevel: 1 // Default to field level
      });
    } else {
      officer.department = departmentDoc._id;
      officer.designation = designation;
      if (jurisdictionId) officer.jurisdictionId = jurisdictionId;
    }

    await officer.save();

    // Populate and return updated data
    await officer.populate('department');

    res.status(200).json({
      success: true,
      message: 'Profile completed successfully',
      data: {
        user: {
          id: user._id,
          phone: user.phone,
          name: user.name,
          role: user.role,
          department: user.department,
          designation: user.designation,
          isProfileComplete: user.isProfileComplete
        },
        officer: {
          id: officer._id,
          departmentDetails: officer.department,
          jurisdictionId: officer.jurisdictionId,
          designation: officer.designation,
          escalationLevel: officer.escalationLevel,
          isActive: officer.isActive
        }
      }
    });

  } catch (error) {
    console.error('Error in completeOfficerProfile:', error);
    res.status(500).json({
      success: false,
      message: 'Server error occurred'
    });
  }
};

// @desc    Get current officer details
// @route   GET /api/officer-auth/me
// @access  Private (Officer only)
const getCurrentOfficer = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const officer = await Officer.findOne({ user: user._id }).populate('department');

    if (!officer) {
      return res.status(404).json({
        success: false,
        message: 'Officer profile not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          phone: user.phone,
          name: user.name,
          role: user.role,
          department: user.department,
          designation: user.designation,
          escalationLevel: user.escalationLevel,
          isProfileComplete: user.isProfileComplete,
          profileImageUrl: user.profileImageUrl
        },
        officer: {
          id: officer._id,
          departmentDetails: officer.department,
          jurisdictionId: officer.jurisdictionId,
          designation: officer.designation,
          escalationLevel: officer.escalationLevel,
          isActive: officer.isActive
        }
      }
    });

  } catch (error) {
    console.error('Error in getCurrentOfficer:', error);
    res.status(500).json({
      success: false,
      message: 'Server error occurred'
    });
  }
};

module.exports = {
  sendOTPForOfficer,
  verifyOTPForOfficer,
  completeOfficerProfile,
  getCurrentOfficer
};
