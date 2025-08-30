// Enhanced Incident Schema with SLA and Priority Management
const mongoose = require('mongoose');

const incidentPrioritySchema = new mongoose.Schema({
  incident: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Incident',
    required: true
  },
  
  // SLA Management
  slaDeadline: {
    type: Date,
    required: true
  },
  slaBreached: {
    type: Boolean,
    default: false
  },
  timeToDeadline: {
    type: Number, // minutes remaining
    default: 0
  },
  
  // Priority Calculation
  priorityScore: {
    type: Number,
    required: true,
    default: 0
  },
  urgencyLevel: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'EMERGENCY'],
    default: 'MEDIUM'
  },
  
  // Community Support Weight
  signatureWeight: {
    type: Number,
    default: 0
  },
  upvoteWeight: {
    type: Number,
    default: 0
  },
  
  // Category-Based Priority
  categoryPriority: {
    type: Number,
    enum: [1, 2, 3, 4, 5], // 1=Lowest, 5=Highest
    default: 3
  },
  
  // Auto-calculated fields
  daysSinceReported: {
    type: Number,
    default: 0
  },
  isOverdue: {
    type: Boolean,
    default: false
  },
  
  // Escalation tracking
  escalationTriggers: [{
    trigger: {
      type: String,
      enum: ['SLA_BREACH', 'MANUAL', 'SEVERITY_UPGRADE', 'RESOURCE_CONSTRAINT', 'INTERDEPARTMENT']
    },
    triggeredAt: {
      type: Date,
      default: Date.now
    },
    triggeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: String
  }]
  
}, { 
  timestamps: true 
});

// Priority calculation method
incidentPrioritySchema.methods.calculatePriority = function() {
  const incident = this.incident;
  
  // Base priority from category (1-5)
  let score = this.categoryPriority * 20;
  
  // Severity multiplier (1-5)
  score += (incident.severity || 1) * 15;
  
  // Community support (signatures + upvotes)
  score += Math.min(this.signatureWeight * 2, 30);
  score += Math.min(this.upvoteWeight * 1, 20);
  
  // Time-based urgency (days since reported)
  if (this.daysSinceReported > 7) score += 25;
  else if (this.daysSinceReported > 3) score += 15;
  else if (this.daysSinceReported > 1) score += 10;
  
  // SLA deadline urgency
  if (this.slaBreached) score += 50;
  else if (this.timeToDeadline < 60) score += 30; // 1 hour
  else if (this.timeToDeadline < 480) score += 20; // 8 hours
  else if (this.timeToDeadline < 1440) score += 10; // 24 hours
  
  this.priorityScore = score;
  
  // Set urgency level
  if (score >= 100) this.urgencyLevel = 'EMERGENCY';
  else if (score >= 80) this.urgencyLevel = 'CRITICAL';
  else if (score >= 60) this.urgencyLevel = 'HIGH';
  else if (score >= 40) this.urgencyLevel = 'MEDIUM';
  else this.urgencyLevel = 'LOW';
  
  return score;
};

// SLA calculation method
incidentPrioritySchema.methods.calculateSLA = function() {
  const incident = this.incident;
  let hoursToResolve = 72; // Default 3 days
  
  // Adjust based on category
  switch(incident.categoryId?.toLowerCase()) {
    case 'emergency':
    case 'health':
      hoursToResolve = 4; // 4 hours
      this.categoryPriority = 5;
      break;
    case 'water':
    case 'electricity':
      hoursToResolve = 24; // 1 day
      this.categoryPriority = 4;
      break;
    case 'sanitation':
    case 'road':
      hoursToResolve = 48; // 2 days
      this.categoryPriority = 3;
      break;
    case 'education':
      hoursToResolve = 120; // 5 days
      this.categoryPriority = 2;
      break;
    default:
      hoursToResolve = 72; // 3 days
      this.categoryPriority = 2;
  }
  
  // Adjust based on severity
  if (incident.severity >= 4) hoursToResolve = Math.max(hoursToResolve / 2, 2);
  else if (incident.severity >= 3) hoursToResolve = Math.max(hoursToResolve * 0.75, 4);
  
  this.slaDeadline = new Date(incident.createdAt.getTime() + (hoursToResolve * 60 * 60 * 1000));
  
  // Calculate time remaining
  const now = new Date();
  this.timeToDeadline = Math.max(0, Math.floor((this.slaDeadline - now) / (1000 * 60)));
  this.slaBreached = now > this.slaDeadline;
  this.isOverdue = this.slaBreached;
  
  // Calculate days since reported
  this.daysSinceReported = Math.floor((now - incident.createdAt) / (1000 * 60 * 60 * 24));
};

// Update priority scores for all incidents (background job)
incidentPrioritySchema.statics.updateAllPriorities = async function() {
  const priorities = await this.find().populate('incident');
  
  for (const priority of priorities) {
    priority.calculateSLA();
    priority.calculatePriority();
    await priority.save();
  }
  
  return priorities.length;
};

// Create indexes for performance
incidentPrioritySchema.index({ incident: 1 });
incidentPrioritySchema.index({ priorityScore: -1 });
incidentPrioritySchema.index({ slaDeadline: 1 });
incidentPrioritySchema.index({ urgencyLevel: 1 });
incidentPrioritySchema.index({ isOverdue: 1 });

module.exports = mongoose.model('IncidentPriority', incidentPrioritySchema);
