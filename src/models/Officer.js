const mongoose = require('mongoose');

// Officer Schema based on the SQL schema
const OfficerSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true
  },
  jurisdictionId: {
    type: String,
    required: true // This could reference village/block/district based on department level
  },
  designation: {
    type: String,
    required: true,
    maxlength: 100
  },
  escalationLevel: {
    type: Number,
    required: true,
    enum: [1, 2, 3] // 1: Field, 2: Nodal, 3: Head
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Additional fields for the system
  employeeId: {
    type: String,
    unique: true,
    sparse: true
  },
  contactNumber: {
    type: String
  },
  officeAddress: {
    type: String
  }
}, { 
  timestamps: true 
});

// Create indexes for performance
OfficerSchema.index({ user: 1 });
OfficerSchema.index({ department: 1 });
OfficerSchema.index({ isActive: 1 });
OfficerSchema.index({ escalationLevel: 1 });

module.exports = mongoose.model('Officer', OfficerSchema);
