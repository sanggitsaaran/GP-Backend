const mongoose = require('mongoose');

// Assignment Schema based on the SQL schema
const AssignmentSchema = new mongoose.Schema({
  incident: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Incident',
    required: true
  },
  assignee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Officer',
    required: true
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    required: true,
    maxlength: 50
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  resolvedAt: {
    type: Date
  },
  notes: {
    type: String
  },
  isCurrent: {
    type: Boolean,
    default: true
  },
  status: {
    type: String,
    enum: ['ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED'],
    default: 'ASSIGNED'
  }
}, { 
  timestamps: true 
});

// Create indexes for performance
AssignmentSchema.index({ incident: 1 });
AssignmentSchema.index({ assignee: 1 });
AssignmentSchema.index({ isCurrent: 1 });
AssignmentSchema.index({ status: 1 });

module.exports = mongoose.model('Assignment', AssignmentSchema);
