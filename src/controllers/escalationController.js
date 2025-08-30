const Incident = require('../models/Incident');
const Assignment = require('../models/Assignment');
const Officer = require('../models/Officer');
const User = require('../models/User');
const Department = require('../models/Department');
const IncidentPriority = require('../models/IncidentPriority');

// Escalation hierarchy configuration
const ESCALATION_HIERARCHY = {
  // Level 1: Junior Officer → Senior Officer (same department)
  1: {
    nextLevel: 2,
    description: 'Field Officer to Nodal Officer',
    maxBudget: 25000, // ₹25,000
    jurisdiction: 'VILLAGE'
  },
  // Level 2: Department Head → Block Development Officer
  2: {
    nextLevel: 3,
    description: 'Nodal Officer to Head Officer',
    maxBudget: 500000, // ₹5 lakh
    jurisdiction: 'BLOCK'
  },
  // Level 3: Block Level → District Collector
  3: {
    nextLevel: 4,
    description: 'Head Officer to District Level',
    maxBudget: null, // No limit
    jurisdiction: 'DISTRICT'
  }
};

// @desc    Get available escalation paths for an incident
// @route   GET /api/officer/escalation/:incidentId/paths
// @access  Private (Officer only)
const getEscalationPaths = async (req, res) => {
  try {
    const { incidentId } = req.params;
    
    const officer = await Officer.findOne({ user: req.user.id })
      .populate('department')
      .populate('user');
    
    if (!officer) {
      return res.status(404).json({
        success: false,
        message: 'Officer profile not found'
      });
    }

    // Verify officer has access to this incident
    const assignment = await Assignment.findOne({
      incident: incidentId,
      assignee: officer._id,
      isCurrent: true
    }).populate('incident');

    if (!assignment) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this incident'
      });
    }

    const incident = assignment.incident;
    const currentLevel = officer.escalationLevel;
    
    // Get escalation hierarchy info
    const currentHierarchy = ESCALATION_HIERARCHY[currentLevel];
    
    if (!currentHierarchy) {
      return res.status(400).json({
        success: false,
        message: 'Invalid escalation level'
      });
    }

    // Find officers at next level in same department
    const nextLevelOfficers = await Officer.find({
      department: officer.department._id,
      escalationLevel: currentHierarchy.nextLevel,
      isActive: true
    }).populate('user', 'name phone designation');

    // Find officers in related departments for inter-department coordination
    const relatedDepartments = await Department.find({
      _id: { $ne: officer.department._id },
      isActive: true
    });

    const interDeptOfficers = await Officer.find({
      department: { $in: relatedDepartments.map(d => d._id) },
      escalationLevel: { $gte: currentLevel },
      isActive: true
    }).populate('user', 'name phone designation')
      .populate('department', 'name code');

    // Determine escalation triggers
    const priority = await IncidentPriority.findOne({ incident: incidentId });
    const escalationTriggers = [];

    // SLA breach trigger
    if (priority && priority.slaBreached) {
      escalationTriggers.push({
        type: 'SLA_BREACH',
        description: 'SLA deadline has been breached',
        automatic: true,
        priority: 'HIGH'
      });
    }

    // Severity upgrade trigger
    if (incident.severity >= 4) {
      escalationTriggers.push({
        type: 'SEVERITY_UPGRADE',
        description: 'High severity incident requiring senior attention',
        automatic: false,
        priority: 'CRITICAL'
      });
    }

    // Resource constraint trigger
    if (currentHierarchy.maxBudget && incident.estimatedCost > currentHierarchy.maxBudget) {
      escalationTriggers.push({
        type: 'RESOURCE_CONSTRAINT',
        description: `Estimated cost exceeds level authority (₹${currentHierarchy.maxBudget})`,
        automatic: true,
        priority: 'HIGH'
      });
    }

    // Manual escalation (always available)
    escalationTriggers.push({
      type: 'MANUAL',
      description: 'Manual escalation by officer',
      automatic: false,
      priority: 'MEDIUM'
    });

    // Inter-department coordination
    if (incident.categoryId && needsInterDepartmentCoordination(incident.categoryId)) {
      escalationTriggers.push({
        type: 'INTERDEPARTMENT',
        description: 'Requires coordination with other departments',
        automatic: false,
        priority: 'MEDIUM'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        incident: {
          id: incident._id,
          title: incident.title,
          severity: incident.severity,
          categoryId: incident.categoryId,
          estimatedCost: incident.estimatedCost
        },
        currentOfficer: {
          id: officer._id,
          name: officer.user.name,
          level: officer.escalationLevel,
          levelName: getEscalationLevelName(officer.escalationLevel),
          department: officer.department.name
        },
        escalationPaths: [
          {
            type: 'HIERARCHY',
            description: currentHierarchy.description,
            targetLevel: currentHierarchy.nextLevel,
            targetLevelName: getEscalationLevelName(currentHierarchy.nextLevel),
            availableOfficers: nextLevelOfficers.map(o => ({
              id: o._id,
              name: o.user.name,
              designation: o.user.designation,
              phone: o.user.phone
            }))
          },
          {
            type: 'INTERDEPARTMENT',
            description: 'Inter-department coordination',
            targetLevel: currentLevel,
            targetLevelName: 'Same Level - Different Department',
            availableOfficers: interDeptOfficers.map(o => ({
              id: o._id,
              name: o.user.name,
              designation: o.user.designation,
              department: o.department.name,
              phone: o.user.phone
            }))
          }
        ],
        escalationTriggers,
        hierarchy: currentHierarchy
      }
    });

  } catch (error) {
    console.error('Error in getEscalationPaths:', error);
    res.status(500).json({
      success: false,
      message: 'Server error occurred'
    });
  }
};

// @desc    Escalate an incident
// @route   POST /api/officer/escalation/:incidentId/escalate
// @access  Private (Officer only)
const escalateIncident = async (req, res) => {
  try {
    const { incidentId } = req.params;
    const { 
      targetOfficerId, 
      escalationType, 
      reason, 
      attemptedSolutions,
      urgencyJustification 
    } = req.body;

    // Validation
    if (!targetOfficerId || !escalationType || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Target officer, escalation type, and reason are required'
      });
    }

    const officer = await Officer.findOne({ user: req.user.id })
      .populate('user')
      .populate('department');
    
    if (!officer) {
      return res.status(404).json({
        success: false,
        message: 'Officer profile not found'
      });
    }

    // Verify current assignment
    const currentAssignment = await Assignment.findOne({
      incident: incidentId,
      assignee: officer._id,
      isCurrent: true
    }).populate('incident');

    if (!currentAssignment) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this incident'
      });
    }

    // Verify target officer
    const targetOfficer = await Officer.findById(targetOfficerId)
      .populate('user')
      .populate('department');

    if (!targetOfficer) {
      return res.status(404).json({
        success: false,
        message: 'Target officer not found'
      });
    }

    // Validate escalation hierarchy
    if (escalationType === 'HIERARCHY' && targetOfficer.escalationLevel <= officer.escalationLevel) {
      return res.status(400).json({
        success: false,
        message: 'Cannot escalate to same or lower level officer'
      });
    }

    // Create new assignment for target officer
    const newAssignment = new Assignment({
      incident: incidentId,
      assignee: targetOfficerId,
      assignedBy: req.user.id,
      role: targetOfficer.designation,
      status: 'ASSIGNED'
    });

    await newAssignment.save();

    // Mark current assignment as no longer current
    currentAssignment.isCurrent = false;
    currentAssignment.resolvedAt = new Date();
    currentAssignment.notes = `Escalated to ${targetOfficer.user.name} - ${reason}`;
    await currentAssignment.save();

    // Update incident status
    const incident = currentAssignment.incident;
    incident.status = 'ESCALATED';
    incident.escalatedAt = new Date();
    incident.escalatedFrom = officer._id;
    incident.escalatedTo = targetOfficerId;
    await incident.save();

    // Update priority with escalation trigger
    let priority = await IncidentPriority.findOne({ incident: incidentId });
    if (!priority) {
      priority = new IncidentPriority({ incident: incidentId });
    }

    priority.escalationTriggers.push({
      trigger: escalationType,
      triggeredAt: new Date(),
      triggeredBy: req.user.id,
      reason: reason
    });

    // Recalculate priority (escalated incidents get higher priority)
    priority.calculateSLA();
    priority.calculatePriority();
    priority.priorityScore += 30; // Escalation bonus

    await priority.save();

    // Log escalation activity
    console.log(`🔺 ESCALATION: Incident ${incidentId} escalated from ${officer.user.name} (Level ${officer.escalationLevel}) to ${targetOfficer.user.name} (Level ${targetOfficer.escalationLevel})`);

    // TODO: Send notifications to relevant parties
    // - Notify target officer
    // - Notify department heads
    // - Log in audit trail

    res.status(200).json({
      success: true,
      message: 'Incident escalated successfully',
      data: {
        escalation: {
          incidentId: incidentId,
          fromOfficer: {
            id: officer._id,
            name: officer.user.name,
            level: officer.escalationLevel,
            department: officer.department.name
          },
          toOfficer: {
            id: targetOfficer._id,
            name: targetOfficer.user.name,
            level: targetOfficer.escalationLevel,
            department: targetOfficer.department.name
          },
          escalationType: escalationType,
          reason: reason,
          escalatedAt: new Date(),
          newAssignmentId: newAssignment._id
        }
      }
    });

  } catch (error) {
    console.error('Error in escalateIncident:', error);
    res.status(500).json({
      success: false,
      message: 'Server error occurred'
    });
  }
};

// @desc    Get escalation history for an incident
// @route   GET /api/officer/escalation/:incidentId/history
// @access  Private (Officer only)
const getEscalationHistory = async (req, res) => {
  try {
    const { incidentId } = req.params;
    
    // Get all assignments for this incident
    const assignments = await Assignment.find({ incident: incidentId })
      .populate({
        path: 'assignee',
        populate: [
          { path: 'user', select: 'name designation' },
          { path: 'department', select: 'name' }
        ]
      })
      .populate('assignedBy', 'name')
      .sort({ createdAt: 1 });

    // Get priority with escalation triggers
    const priority = await IncidentPriority.findOne({ incident: incidentId });

    // Format escalation trail
    const escalationTrail = assignments.map((assignment, index) => ({
      step: index + 1,
      assignment: {
        id: assignment._id,
        status: assignment.status,
        startedAt: assignment.createdAt,
        resolvedAt: assignment.resolvedAt,
        notes: assignment.notes,
        isCurrent: assignment.isCurrent
      },
      officer: {
        id: assignment.assignee._id,
        name: assignment.assignee.user.name,
        designation: assignment.assignee.user.designation,
        escalationLevel: assignment.assignee.escalationLevel,
        escalationLevelName: getEscalationLevelName(assignment.assignee.escalationLevel),
        department: assignment.assignee.department.name
      },
      assignedBy: assignment.assignedBy ? {
        id: assignment.assignedBy._id,
        name: assignment.assignedBy.name
      } : null,
      escalationTrigger: priority?.escalationTriggers.find(trigger => 
        trigger.triggeredAt && 
        Math.abs(trigger.triggeredAt - assignment.createdAt) < 60000 // Within 1 minute
      )
    }));

    res.status(200).json({
      success: true,
      data: {
        incidentId: incidentId,
        escalationTrail: escalationTrail,
        escalationTriggers: priority?.escalationTriggers || [],
        currentLevel: escalationTrail.length > 0 ? 
          escalationTrail[escalationTrail.length - 1].officer.escalationLevel : 1
      }
    });

  } catch (error) {
    console.error('Error in getEscalationHistory:', error);
    res.status(500).json({
      success: false,
      message: 'Server error occurred'
    });
  }
};

// @desc    Get incidents available for assignment (for senior officers)
// @route   GET /api/officer/escalation/pending-assignments
// @access  Private (Officer only)
const getPendingEscalations = async (req, res) => {
  try {
    const { department, urgency, page = 1, limit = 20 } = req.query;
    
    const officer = await Officer.findOne({ user: req.user.id })
      .populate('department');
    
    if (!officer) {
      return res.status(404).json({
        success: false,
        message: 'Officer profile not found'
      });
    }

    // Find incidents escalated to officers of this level or below
    let query = {
      status: 'ESCALATED',
      escalatedTo: { $exists: true }
    };

    // Get assignments that are assigned to officers in this department or level
    const eligibleAssignments = await Assignment.find({
      status: 'ASSIGNED',
      isCurrent: true
    })
    .populate({
      path: 'assignee',
      match: {
        escalationLevel: { $lte: officer.escalationLevel },
        ...(department ? { department: department } : {})
      },
      populate: [
        { path: 'user', select: 'name designation' },
        { path: 'department', select: 'name' }
      ]
    })
    .populate({
      path: 'incident',
      populate: [
        { path: 'user', select: 'name phone' },
        { path: 'category', select: 'name' }
      ]
    });

    // Filter out null assignees (due to populate match)
    const validAssignments = eligibleAssignments.filter(a => a.assignee);

    // Get priorities for these incidents
    const incidentIds = validAssignments.map(a => a.incident._id);
    const priorities = await IncidentPriority.find({
      incident: { $in: incidentIds }
    });

    // Apply urgency filter
    let filteredAssignments = validAssignments;
    if (urgency) {
      const urgencyIncidents = priorities
        .filter(p => p.urgencyLevel === urgency.toUpperCase())
        .map(p => p.incident.toString());
      
      filteredAssignments = validAssignments.filter(a => 
        urgencyIncidents.includes(a.incident._id.toString())
      );
    }

    // Sort by priority
    const priorityMap = {};
    priorities.forEach(p => {
      priorityMap[p.incident.toString()] = p;
    });

    filteredAssignments.sort((a, b) => {
      const priorityA = priorityMap[a.incident._id.toString()];
      const priorityB = priorityMap[b.incident._id.toString()];
      
      if (!priorityA && !priorityB) return 0;
      if (!priorityA) return 1;
      if (!priorityB) return -1;
      
      return priorityB.priorityScore - priorityA.priorityScore;
    });

    // Pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const paginatedAssignments = filteredAssignments.slice(startIndex, startIndex + parseInt(limit));

    const formattedIncidents = paginatedAssignments.map(assignment => {
      const priority = priorityMap[assignment.incident._id.toString()];
      
      return {
        assignmentId: assignment._id,
        assignedAt: assignment.createdAt,
        
        currentOfficer: {
          id: assignment.assignee._id,
          name: assignment.assignee.user.name,
          designation: assignment.assignee.user.designation,
          escalationLevel: assignment.assignee.escalationLevel,
          department: assignment.assignee.department.name
        },
        
        priority: priority ? {
          score: priority.priorityScore,
          urgencyLevel: priority.urgencyLevel,
          slaDeadline: priority.slaDeadline,
          slaBreached: priority.slaBreached,
          escalationTriggers: priority.escalationTriggers
        } : null,
        
        incident: {
          id: assignment.incident._id,
          title: assignment.incident.title,
          description: assignment.incident.description,
          categoryId: assignment.incident.categoryId,
          categoryName: assignment.incident.category?.name,
          severity: assignment.incident.severity,
          status: assignment.incident.status,
          location: assignment.incident.location,
          createdAt: assignment.incident.createdAt,
          escalatedAt: assignment.incident.escalatedAt,
          
          citizen: assignment.incident.isAnonymous ? {
            name: 'Anonymous',
            phone: 'Hidden'
          } : {
            id: assignment.incident.user?._id,
            name: assignment.incident.user?.name,
            phone: assignment.incident.user?.phone
          }
        }
      };
    });

    res.status(200).json({
      success: true,
      data: {
        incidents: formattedIncidents,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(filteredAssignments.length / parseInt(limit)),
          totalCount: filteredAssignments.length,
          hasNext: startIndex + parseInt(limit) < filteredAssignments.length,
          hasPrev: parseInt(page) > 1
        },
        officer: {
          level: officer.escalationLevel,
          levelName: getEscalationLevelName(officer.escalationLevel),
          department: officer.department.name
        }
      }
    });

  } catch (error) {
    console.error('Error in getPendingEscalations:', error);
    res.status(500).json({
      success: false,
      message: 'Server error occurred'
    });
  }
};

// Helper function to determine if category needs inter-department coordination
function needsInterDepartmentCoordination(categoryId) {
  const interDeptCategories = [
    'INFRASTRUCTURE', 'EMERGENCY', 'FLOOD', 'DISASTER',
    'MAJOR_ROAD', 'HOSPITAL', 'SCHOOL_INFRASTRUCTURE'
  ];
  
  return interDeptCategories.includes(categoryId?.toUpperCase());
}

// Helper function to get escalation level name
function getEscalationLevelName(level) {
  switch (level) {
    case 1: return 'Field Officer';
    case 2: return 'Nodal Officer';
    case 3: return 'Head Officer';
    default: return 'Officer';
  }
}

module.exports = {
  getEscalationPaths,
  escalateIncident,
  getEscalationHistory,
  getPendingEscalations
};
