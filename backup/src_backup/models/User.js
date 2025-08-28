const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// OTP Schema
const OTPSchema = new mongoose.Schema({
  code: { 
    type: String, 
    required: true 
  },
  expiresAt: { 
    type: Date, 
    required: true 
  }
});

// User Schema
const UserSchema = new mongoose.Schema({
  phone: { 
    type: String, 
    required: true, 
    unique: true 
  },
  name: { 
    type: String 
  },
  email: { 
    type: String 
  },
  role: { 
    type: String, 
    enum: ['citizen', 'volunteer', 'officer', 'admin'], 
    default: 'citizen' 
  },
  language: {
    type: String,
    default: 'en'
  },
  profileImageUrl: { 
    type: String 
  },
  kycStatus: { 
    type: String, 
    enum: ['pending', 'verified', 'rejected'], 
    default: 'pending' 
  },
  isVerified: { 
    type: Boolean, 
    default: false 
  },
  isProfileComplete: { 
    type: Boolean, 
    default: false 
  },
  lastLogin: { 
    type: Date 
  },
  wardVillageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Jurisdiction'
  },
  // Officer-specific fields
  department: {
    type: String
  },
  designation: {
    type: String
  },
  escalationLevel: {
    type: Number,
    enum: [1, 2, 3], // 1: Field, 2: Nodal, 3: Head
    default: 1
  },
  otp: OTPSchema,
}, { 
  timestamps: true 
});

// Check if OTP is expired
UserSchema.methods.isOTPExpired = function() {
  if (!this.otp || !this.otp.expiresAt) {
    return true;
  }
  return new Date() > this.otp.expiresAt;
};

// Compare OTP with hashed OTP in database
UserSchema.methods.matchOTP = async function(candidateOTP) {
  if (!this.otp || !this.otp.code) {
    return false;
  }
  
  // First try direct comparison (if OTP is stored as plain text)
  if (this.otp.code === candidateOTP) {
    return true;
  }
  
  // Then try bcrypt comparison (if OTP is hashed)
  try {
    return await bcrypt.compare(candidateOTP, this.otp.code);
  } catch (error) {
    console.error('OTP comparison error:', error);
    return false;
  }
};

module.exports = mongoose.model('User', UserSchema);
