const mongoose = require('mongoose');

// Department Schema based on the SQL schema
const DepartmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    maxlength: 100
  },
  code: {
    type: String,
    required: true,
    unique: true,
    maxlength: 20
  },
  description: {
    type: String
  },
  jurisdictionLevel: {
    type: Number,
    required: true,
    enum: [1, 2, 3] // 1: Panchayat, 2: Block, 3: District
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  }
}, { 
  timestamps: true 
});

// Create indexes for performance
DepartmentSchema.index({ jurisdictionLevel: 1 });

module.exports = mongoose.model('Department', DepartmentSchema);
