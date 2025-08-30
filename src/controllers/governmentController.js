const Department = require('../models/Department');
const Officer = require('../models/Officer');
const Incident = require('../models/Incident');
const Assignment = require('../models/Assignment');
const User = require('../models/User');
const IncidentPriority = require('../models/IncidentPriority');

// Government hierarchy structure
const GOVERNMENT_HIERARCHY = {
  VILLAGE: {
    level: 1,
    parentLevel: 'BLOCK',
    jurisdiction: ['VILLAGE', 'WARD'],
    departments: ['HEALTH', 'SANITATION', 'WATER_SUPPLY', 'ELECTRICITY'],
    maxBudget: 50000 // ₹50,000
  },
  BLOCK: {
    level: 2,
    parentLevel: 'DISTRICT',
    jurisdiction: ['BLOCK', 'TEHSIL', 'MANDAL'],
    departments: ['PWD', 'RURAL_DEVELOPMENT', 'AGRICULTURE', 'EDUCATION'],
    maxBudget: 1000000 // ₹10 lakh
  },
  DISTRICT: {
    level: 3,
    parentLevel: null,
    jurisdiction: ['DISTRICT', 'CITY'],
    departments: ['COLLECTOR_OFFICE', 'POLICE', 'REVENUE', 'SOCIAL_WELFARE'],
    maxBudget: null // No limit
  }
};

// @desc    Get government structure and hierarchy
// @route   GET /api/officer/government/structure
// @access  Private (Officer only)
const getGovernmentStructure = async (req, res) => {
  try {
    const officer = await Officer.findOne({ user: req.user.id })
      .populate('department')
      .populate('user');
    
    if (!officer) {
      return res.status(404).json({
        success: false,
        message: 'Officer profile not found'
      });
    }

    // Get all departments by hierarchy level
    const departmentsByLevel = {};
    const allDepartments = await Department.find({ isActive: true })
      .select('name code hierarchyLevel jurisdiction maxBudget parentDepartment');

    // Organize departments by hierarchy level
    allDepartments.forEach(dept => {
      const level = dept.hierarchyLevel || 'VILLAGE';
      if (!departmentsByLevel[level]) {
        departmentsByLevel[level] = [];
      }
      departmentsByLevel[level].push(dept);
    });

    // Get officers count by level and department
    const officerStatsByLevel = {};
    
    for (const level of Object.keys(GOVERNMENT_HIERARCHY)) {
      const levelOfficers = await Officer.find({
        department: { $in: departmentsByLevel[level]?.map(d => d._id) || [] },
        isActive: true
      }).populate('department', 'name');

      officerStatsByLevel[level] = {
        totalOfficers: levelOfficers.length,
        departments: departmentsByLevel[level] || [],
        officersByEscalationLevel: {
          field: levelOfficers.filter(o => o.escalationLevel === 1).length,
          nodal: levelOfficers.filter(o => o.escalationLevel === 2).length,
          head: levelOfficers.filter(o => o.escalationLevel === 3).length
        }
      };
    }

    res.status(200).json({
      success: true,
      data: {
        currentOfficer: {
          id: officer._id,
          name: officer.user.name,
          designation: officer.user.designation,
          escalationLevel: officer.escalationLevel,
          department: {
            id: officer.department._id,
            name: officer.department.name,
            code: officer.department.code,
            hierarchyLevel: officer.department.hierarchyLevel || 'VILLAGE'
          }
        },
        hierarchy: GOVERNMENT_HIERARCHY,
        departmentsByLevel: departmentsByLevel,
        officerStatsByLevel: officerStatsByLevel,
        jurisdictionFlow: [
          'Village/Ward Level → Block/Tehsil Level → District Level',
          'Field Officers → Nodal Officers → Head Officers',
          'Department Specific → Cross-Department → Administrative'
        ]
      }
    });

  } catch (error) {
    console.error('Error in getGovernmentStructure:', error);
    res.status(500).json({
      success: false,
      message: 'Server error occurred'
    });
  }
};

// @desc    Get incidents by jurisdiction and department
// @route   GET /api/officer/government/jurisdiction-incidents
// @access  Private (Officer only)
const getJurisdictionIncidents = async (req, res) => {
  try {
    const { 
      jurisdictionLevel, 
      department, 
      includeCrossDept = false,
      page = 1, 
      limit = 20 
    } = req.query;

    const officer = await Officer.findOne({ user: req.user.id })
      .populate('department');
    
    if (!officer) {
      return res.status(404).json({
        success: false,
        message: 'Officer profile not found'
      });
    }

    // Determine jurisdiction scope based on officer level
    const officerJurisdiction = GOVERNMENT_HIERARCHY[officer.department.hierarchyLevel || 'VILLAGE'];
    let targetJurisdiction = jurisdictionLevel ? 
      GOVERNMENT_HIERARCHY[jurisdictionLevel.toUpperCase()] : 
      officerJurisdiction;

    // Build query for incidents based on jurisdiction
    let incidentQuery = {};

    // Filter by location jurisdiction (this would need location hierarchy in Incident model)
    if (targetJurisdiction) {
      incidentQuery.jurisdictionLevel = { $in: targetJurisdiction.jurisdiction };
    }

    // Get assignments within jurisdiction
    let assignmentQuery = {};
    
    if (department && department !== 'ALL') {
      const targetDept = await Department.findById(department);
      if (targetDept) {
        assignmentQuery['assignee'] = {
          $in: await Officer.find({ department: department }).select('_id')
        };
      }
    } else if (!includeCrossDept) {
      // Only same department if not including cross-department
      assignmentQuery['assignee'] = {
        $in: await Officer.find({ department: officer.department._id }).select('_id')
      };
    }

    // Get relevant assignments
    const assignments = await Assignment.find({
      ...assignmentQuery,
      isCurrent: true
    })
    .populate({
      path: 'incident',
      match: incidentQuery,
      populate: [
        { path: 'user', select: 'name phone location' },
        { path: 'category', select: 'name' }
      ]
    })
    .populate({
      path: 'assignee',
      populate: [
        { path: 'user', select: 'name designation' },
        { path: 'department', select: 'name hierarchyLevel' }
      ]
    })
    .sort({ createdAt: -1 });

    // Filter out null incidents (due to populate match)
    const validAssignments = assignments.filter(a => a.incident);

    // Get priorities for these incidents
    const incidentIds = validAssignments.map(a => a.incident._id);
    const priorities = await IncidentPriority.find({
      incident: { $in: incidentIds }
    });

    const priorityMap = {};
    priorities.forEach(p => {
      priorityMap[p.incident.toString()] = p;
    });

    // Sort by priority score
    validAssignments.sort((a, b) => {
      const priorityA = priorityMap[a.incident._id.toString()];
      const priorityB = priorityMap[b.incident._id.toString()];
      
      if (!priorityA && !priorityB) return 0;
      if (!priorityA) return 1;
      if (!priorityB) return -1;
      
      return priorityB.priorityScore - priorityA.priorityScore;
    });

    // Apply pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const paginatedAssignments = validAssignments.slice(startIndex, startIndex + parseInt(limit));

    // Format response
    const formattedIncidents = paginatedAssignments.map(assignment => {
      const priority = priorityMap[assignment.incident._id.toString()];
      
      return {
        assignmentId: assignment._id,
        assignedAt: assignment.createdAt,
        status: assignment.status,
        
        incident: {
          id: assignment.incident._id,
          title: assignment.incident.title,
          description: assignment.incident.description,
          categoryId: assignment.incident.categoryId,
          categoryName: assignment.incident.category?.name,
          severity: assignment.incident.severity,
          status: assignment.incident.status,
          location: assignment.incident.location,
          jurisdictionLevel: assignment.incident.jurisdictionLevel,
          createdAt: assignment.incident.createdAt,
          
          citizen: assignment.incident.isAnonymous ? {
            name: 'Anonymous',
            phone: 'Hidden'
          } : {
            id: assignment.incident.user?._id,
            name: assignment.incident.user?.name,
            phone: assignment.incident.user?.phone,
            location: assignment.incident.user?.location
          }
        },
        
        assignedOfficer: {
          id: assignment.assignee._id,
          name: assignment.assignee.user.name,
          designation: assignment.assignee.user.designation,
          escalationLevel: assignment.assignee.escalationLevel,
          department: {
            id: assignment.assignee.department._id,
            name: assignment.assignee.department.name,
            hierarchyLevel: assignment.assignee.department.hierarchyLevel
          }
        },
        
        priority: priority ? {
          score: priority.priorityScore,
          urgencyLevel: priority.urgencyLevel,
          slaDeadline: priority.slaDeadline,
          slaBreached: priority.slaBreached
        } : null,
        
        crossDepartment: assignment.assignee.department._id.toString() !== officer.department._id.toString()
      };
    });

    // Get jurisdiction statistics
    const stats = {
      totalIncidents: validAssignments.length,
      sameDepartment: validAssignments.filter(a => 
        a.assignee.department._id.toString() === officer.department._id.toString()
      ).length,
      crossDepartment: validAssignments.filter(a => 
        a.assignee.department._id.toString() !== officer.department._id.toString()
      ).length,
      urgencyBreakdown: {
        critical: validAssignments.filter(a => {
          const p = priorityMap[a.incident._id.toString()];
          return p && p.urgencyLevel === 'CRITICAL';
        }).length,
        high: validAssignments.filter(a => {
          const p = priorityMap[a.incident._id.toString()];
          return p && p.urgencyLevel === 'HIGH';
        }).length,
        medium: validAssignments.filter(a => {
          const p = priorityMap[a.incident._id.toString()];
          return p && p.urgencyLevel === 'MEDIUM';
        }).length,
        low: validAssignments.filter(a => {
          const p = priorityMap[a.incident._id.toString()];
          return p && p.urgencyLevel === 'LOW';
        }).length
      }
    };

    res.status(200).json({
      success: true,
      data: {
        incidents: formattedIncidents,
        statistics: stats,
        jurisdiction: {
          current: officerJurisdiction,
          viewing: targetJurisdiction,
          includingCrossDepartment: includeCrossDept === 'true'
        },
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(validAssignments.length / parseInt(limit)),
          totalCount: validAssignments.length,
          hasNext: startIndex + parseInt(limit) < validAssignments.length,
          hasPrev: parseInt(page) > 1
        }
      }
    });

  } catch (error) {
    console.error('Error in getJurisdictionIncidents:', error);
    res.status(500).json({
      success: false,
      message: 'Server error occurred'
    });
  }
};

// @desc    Coordinate with other departments
// @route   POST /api/officer/government/coordinate
// @access  Private (Officer only)
const coordinateWithDepartments = async (req, res) => {
  try {
    const { 
      incidentId, 
      targetDepartments, 
      coordinationType,
      message,
      urgencyLevel = 'MEDIUM' 
    } = req.body;

    // Validation
    if (!incidentId || !targetDepartments || !Array.isArray(targetDepartments)) {
      return res.status(400).json({
        success: false,
        message: 'Incident ID and target departments are required'
      });
    }

    const officer = await Officer.findOne({ user: req.user.id })
      .populate('department')
      .populate('user');
    
    if (!officer) {
      return res.status(404).json({
        success: false,
        message: 'Officer profile not found'
      });
    }

    // Verify officer has access to incident
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

    // Get target departments and their officers
    const departments = await Department.find({
      _id: { $in: targetDepartments },
      isActive: true
    });

    if (departments.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No valid target departments found'
      });
    }

    // Find appropriate officers in target departments based on incident severity
    const incident = assignment.incident;
    let requiredEscalationLevel = 1; // Default to field officers

    // Determine required escalation level based on severity and coordination type
    if (incident.severity >= 4 || coordinationType === 'EMERGENCY') {
      requiredEscalationLevel = 2; // Nodal officers for high severity
    }
    if (coordinationType === 'POLICY' || incident.estimatedCost > 500000) {
      requiredEscalationLevel = 3; // Head officers for policy/high cost
    }

    const coordinationAssignments = [];
    
    for (const department of departments) {
      // Find officers of appropriate level in the department
      const deptOfficers = await Officer.find({
        department: department._id,
        escalationLevel: { $gte: requiredEscalationLevel },
        isActive: true
      }).populate('user', 'name designation phone');

      if (deptOfficers.length > 0) {
        // Assign to the most suitable officer (e.g., least loaded)
        const targetOfficer = deptOfficers[0]; // Simple assignment - can be improved with workload balancing

        // Create coordination assignment
        const coordAssignment = new Assignment({
          incident: incidentId,
          assignee: targetOfficer._id,
          assignedBy: req.user.id,
          role: 'COORDINATOR',
          status: 'ASSIGNED',
          coordinationType: coordinationType,
          coordinationMessage: message
        });

        await coordAssignment.save();
        coordinationAssignments.push({
          assignment: coordAssignment,
          officer: targetOfficer,
          department: department
        });
      }
    }

    // Update incident status to indicate coordination
    incident.status = 'COORDINATING';
    incident.coordinatingDepartments = targetDepartments;
    incident.coordinationInitiatedBy = officer._id;
    incident.coordinationInitiatedAt = new Date();
    await incident.save();

    // Update priority with coordination trigger
    let priority = await IncidentPriority.findOne({ incident: incidentId });
    if (!priority) {
      priority = new IncidentPriority({ incident: incidentId });
    }

    priority.escalationTriggers.push({
      trigger: 'INTERDEPARTMENT_COORDINATION',
      triggeredAt: new Date(),
      triggeredBy: req.user.id,
      reason: `Coordination initiated with ${departments.map(d => d.name).join(', ')}`
    });

    // Boost priority for coordinated incidents
    priority.calculateSLA();
    priority.calculatePriority();
    priority.priorityScore += 20; // Coordination bonus

    await priority.save();

    console.log(`🤝 COORDINATION: Incident ${incidentId} coordination initiated by ${officer.user.name} with ${departments.length} departments`);

    res.status(200).json({
      success: true,
      message: 'Inter-department coordination initiated successfully',
      data: {
        incidentId: incidentId,
        coordinationType: coordinationType,
        initiatingOfficer: {
          id: officer._id,
          name: officer.user.name,
          department: officer.department.name
        },
        coordinatedDepartments: departments.map(dept => ({
          id: dept._id,
          name: dept.name,
          hierarchyLevel: dept.hierarchyLevel
        })),
        assignments: coordinationAssignments.map(ca => ({
          assignmentId: ca.assignment._id,
          officer: {
            id: ca.officer._id,
            name: ca.officer.user.name,
            designation: ca.officer.user.designation,
            phone: ca.officer.user.phone
          },
          department: {
            id: ca.department._id,
            name: ca.department.name
          }
        })),
        coordinationInitiatedAt: new Date()
      }
    });

  } catch (error) {
    console.error('Error in coordinateWithDepartments:', error);
    res.status(500).json({
      success: false,
      message: 'Server error occurred'
    });
  }
};

// @desc    Get coordination status and assignments
// @route   GET /api/officer/government/coordination/:incidentId
// @access  Private (Officer only)
const getCoordinationStatus = async (req, res) => {
  try {
    const { incidentId } = req.params;
    
    // Get all coordination assignments for this incident
    const coordinationAssignments = await Assignment.find({
      incident: incidentId,
      role: 'COORDINATOR'
    })
    .populate({
      path: 'assignee',
      populate: [
        { path: 'user', select: 'name designation phone' },
        { path: 'department', select: 'name hierarchyLevel' }
      ]
    })
    .populate('assignedBy', 'name designation')
    .sort({ createdAt: 1 });

    // Get the incident details
    const incident = await Incident.findById(incidentId)
      .populate('coordinationInitiatedBy', 'name designation')
      .populate('coordinatingDepartments', 'name hierarchyLevel');

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found'
      });
    }

    // Format coordination status
    const coordinationStatus = coordinationAssignments.map(assignment => ({
      assignmentId: assignment._id,
      status: assignment.status,
      assignedAt: assignment.createdAt,
      resolvedAt: assignment.resolvedAt,
      coordinationType: assignment.coordinationType,
      message: assignment.coordinationMessage,
      
      coordinator: {
        id: assignment.assignee._id,
        name: assignment.assignee.user.name,
        designation: assignment.assignee.user.designation,
        phone: assignment.assignee.user.phone,
        escalationLevel: assignment.assignee.escalationLevel,
        department: {
          id: assignment.assignee.department._id,
          name: assignment.assignee.department.name,
          hierarchyLevel: assignment.assignee.department.hierarchyLevel
        }
      },
      
      assignedBy: assignment.assignedBy ? {
        id: assignment.assignedBy._id,
        name: assignment.assignedBy.name
      } : null
    }));

    // Calculate coordination metrics
    const metrics = {
      totalCoordinators: coordinationAssignments.length,
      activeCoordinators: coordinationAssignments.filter(a => a.status === 'ASSIGNED').length,
      completedCoordinators: coordinationAssignments.filter(a => a.status === 'COMPLETED').length,
      departmentsInvolved: [...new Set(coordinationAssignments.map(a => a.assignee.department.name))].length,
      averageResponseTime: null // Can be calculated if needed
    };

    res.status(200).json({
      success: true,
      data: {
        incident: {
          id: incident._id,
          title: incident.title,
          status: incident.status,
          coordinationInitiatedAt: incident.coordinationInitiatedAt,
          coordinationInitiatedBy: incident.coordinationInitiatedBy
        },
        coordinationStatus: coordinationStatus,
        metrics: metrics,
        coordinatingDepartments: incident.coordinatingDepartments || []
      }
    });

  } catch (error) {
    console.error('Error in getCoordinationStatus:', error);
    res.status(500).json({
      success: false,
      message: 'Server error occurred'
    });
  }
};

module.exports = {
  getGovernmentStructure,
  getJurisdictionIncidents,
  coordinateWithDepartments,
  getCoordinationStatus
};
