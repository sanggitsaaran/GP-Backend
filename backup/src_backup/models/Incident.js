const mongoose = require('mongoose');

// Media Schema for attachments
const MediaSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['photo', 'video', 'audio', 'document'],
    required: true
  },
  uri: {
    type: String,
    required: true
  },
  thumbnailUri: String,
  hash: String, // For tamper verification
  capturedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

// Incident Schema
const IncidentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  categoryId: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: true
  },
  location: {
    latitude: {
      type: Number,
      required: true
    },
    longitude: {
      type: Number,
      required: true
    },
    address: String
  },
  severity: {
    type: Number,
    enum: [1, 2, 3], // 1: Low, 2: Medium, 3: High
    default: 1
  },
  status: {
    type: String,
    enum: [
      'NEW', 'VERIFIED', 'TRIAGED', 'ASSIGNED', 'IN_PROGRESS',
      'PENDING_DEP', 'RESOLVED', 'CITIZEN_CONFIRM', 'CLOSED',
      'REOPENED', 'ESCALATED', 'CANCELLED', 'SPAM'
    ],
    default: 'NEW'
  },
  media: [MediaSchema],
  isAnonymous: {
    type: Boolean,
    default: false
  },
  createdOffline: {
    type: Boolean,
    default: false
  },
  assistedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  signatureCount: {
    type: Number,
    default: 0
  },
  slaDeadline: Date,
  closedAt: Date
}, { 
  timestamps: true 
});

// Create indexes for performance
IncidentSchema.index({ status: 1 });
IncidentSchema.index({ categoryId: 1 });
IncidentSchema.index({ user: 1 });
IncidentSchema.index({ createdAt: -1 });
IncidentSchema.index({ 'location.latitude': 1, 'location.longitude': 1 });

module.exports = mongoose.model('Incident', IncidentSchema);
