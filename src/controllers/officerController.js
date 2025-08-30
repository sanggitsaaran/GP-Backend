const Incident = require('../models/Incident');
const Assignment = require('../models/Assignment');
const Officer = require('../models/Officer');
const User = require('../models/User');
const Category = require('../models/Category');

// @desc    Get officer dashboard stats
// @route   GET /api/officer/dashboard
// @access  Private (Officer only)
const getOfficerDashboard = async (req, res) => {
  try {
    const officer = await Officer.findOne({ user: req.user.id });
    
    if (!officer) {
      return res.status(404).json({
        success: false,
        message: 'Officer profile not found'
      });
    }

    // Get current assignments
    const activeAssignments = await Assignment.find({
      assignee: officer._id,
      isCurrent: true,
      status: { $in: ['ASSIGNED', 'ACCEPTED', 'IN_PROGRESS'] }
    }).populate({
      path: 'incident',
      populate: {
        path: 'user',
        select: 'name phone'
      }
    });

    // Get dashboard statistics
    const stats = {
      totalAssigned: await Assignment.countDocuments({
        assignee: officer._id,
        isCurrent: true
      }),
      newIncidents: await Assignment.countDocuments({
        assignee: officer._id,
        isCurrent: true,
        status: 'ASSIGNED'
      }),
      inProgress: await Assignment.countDocuments({
        assignee: officer._id,
        isCurrent: true,
        status: 'IN_PROGRESS'
      }),
      completed: await Assignment.countDocuments({
        assignee: officer._id,
        status: 'COMPLETED'
      }),
      pending: await Assignment.countDocuments({
        assignee: officer._id,
        isCurrent: true,
        status: { $in: ['ASSIGNED', 'ACCEPTED'] }
      })
    };

    // Get recent incidents
    const recentIncidents = await Assignment.find({
      assignee: officer._id,
      isCurrent: true
    })
    .populate({
      path: 'incident',
      populate: {
        path: 'user',
        select: 'name phone'
      }
    })
    .sort({ createdAt: -1 })
    .limit(10);

    res.status(200).json({
      success: true,
      data: {
        stats,
        activeAssignments: activeAssignments.map(assignment => ({
          id: assignment._id,
          status: assignment.status,
          assignedAt: assignment.createdAt,
          incident: {
            id: assignment.incident._id,
            title: assignment.incident.title,
            description: assignment.incident.description,
            status: assignment.incident.status,
            severity: assignment.incident.severity,
            categoryId: assignment.incident.categoryId,
            location: assignment.incident.location,
            createdAt: assignment.incident.createdAt,
            citizen: {
              name: assignment.incident.user?.name || 'Anonymous',
              phone: assignment.incident.isAnonymous ? 'Hidden' : assignment.incident.user?.phone
            }
          }
        })),
        recentIncidents: recentIncidents.map(assignment => ({
          id: assignment._id,
          status: assignment.status,
          assignedAt: assignment.createdAt,
          incident: {
            id: assignment.incident._id,
            title: assignment.incident.title,
            status: assignment.incident.status,
            severity: assignment.incident.severity,
            categoryId: assignment.incident.categoryId,
            createdAt: assignment.incident.createdAt
          }
        }))
      }
    });

  } catch (error) {
    console.error('Error in getOfficerDashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Server error occurred'
    });
  }
};

// @desc    Get incidents assigned to officer by category
// @route   GET /api/officer/incidents
// @access  Private (Officer only)
const getOfficerIncidents = async (req, res) => {
  try {
    const { category, status, page = 1, limit = 10 } = req.query;
    
    const officer = await Officer.findOne({ user: req.user.id });
    
    if (!officer) {
      return res.status(404).json({
        success: false,
        message: 'Officer profile not found'
      });
    }

    // Build query for assignments
    let assignmentQuery = {
      assignee: officer._id,
      isCurrent: true
    };

    if (status) {
      assignmentQuery.status = status;
    }

    // Build query for incidents
    let incidentQuery = {};
    
    if (category) {
      incidentQuery.categoryId = category;
    }

    // Get assignments with incident population and filtering
    const assignments = await Assignment.find(assignmentQuery)
      .populate({
        path: 'incident',
        match: incidentQuery,
        populate: {
          path: 'user',
          select: 'name phone'
        }
      })
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    // Filter out assignments where incident match failed (null)
    const validAssignments = assignments.filter(assignment => assignment.incident);

    // Get total count for pagination
    const totalAssignments = await Assignment.countDocuments(assignmentQuery);

    // Format response
    const incidents = validAssignments.map(assignment => ({
      assignmentId: assignment._id,
      assignmentStatus: assignment.status,
      assignedAt: assignment.createdAt,
      notes: assignment.notes,
      incident: {
        id: assignment.incident._id,
        title: assignment.incident.title,
        description: assignment.incident.description,
        categoryId: assignment.incident.categoryId,
        status: assignment.incident.status,
        severity: assignment.incident.severity,
        location: assignment.incident.location,
        media: assignment.incident.media,
        createdAt: assignment.incident.createdAt,
        updatedAt: assignment.incident.updatedAt,
        citizen: {
          id: assignment.incident.user?._id,
          name: assignment.incident.isAnonymous ? 'Anonymous' : assignment.incident.user?.name,
          phone: assignment.incident.isAnonymous ? 'Hidden' : assignment.incident.user?.phone
        }
      }
    }));

    res.status(200).json({
      success: true,
      data: {
        incidents,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalAssignments / parseInt(limit)),
          totalCount: totalAssignments,
          hasNext: parseInt(page) * parseInt(limit) < totalAssignments,
          hasPrev: parseInt(page) > 1
        }
      }
    });

  } catch (error) {
    console.error('Error in getOfficerIncidents:', error);
    res.status(500).json({
      success: false,
      message: 'Server error occurred'
    });
  }
};

// @desc    Update assignment status
// @route   PUT /api/officer/assignments/:assignmentId/status
// @access  Private (Officer only)
const updateAssignmentStatus = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { status, notes } = req.body;

    const officer = await Officer.findOne({ user: req.user.id });
    
    if (!officer) {
      return res.status(404).json({
        success: false,
        message: 'Officer profile not found'
      });
    }

    // Find assignment
    const assignment = await Assignment.findOne({
      _id: assignmentId,
      assignee: officer._id
    }).populate('incident');

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    // Update assignment
    assignment.status = status;
    if (notes) assignment.notes = notes;
    
    if (status === 'COMPLETED') {
      assignment.resolvedAt = new Date();
      assignment.isCurrent = false;
      
      // Update incident status to resolved
      assignment.incident.status = 'RESOLVED';
      await assignment.incident.save();
    }

    await assignment.save();

    res.status(200).json({
      success: true,
      message: 'Assignment status updated successfully',
      data: {
        assignment: {
          id: assignment._id,
          status: assignment.status,
          notes: assignment.notes,
          resolvedAt: assignment.resolvedAt
        }
      }
    });

  } catch (error) {
    console.error('Error in updateAssignmentStatus:', error);
    res.status(500).json({
      success: false,
      message: 'Server error occurred'
    });
  }
};

// @desc    Get incident details
// @route   GET /api/officer/incidents/:incidentId
// @access  Private (Officer only)
const getIncidentDetails = async (req, res) => {
  try {
    const { incidentId } = req.params;
    
    const officer = await Officer.findOne({ user: req.user.id });
    
    if (!officer) {
      return res.status(404).json({
        success: false,
        message: 'Officer profile not found'
      });
    }

    // Check if officer has assignment for this incident
    const assignment = await Assignment.findOne({
      incident: incidentId,
      assignee: officer._id
    });

    if (!assignment) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this incident'
      });
    }

    // Get incident details
    const incident = await Incident.findById(incidentId).populate({
      path: 'user',
      select: 'name phone profileImageUrl'
    });

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        assignment: {
          id: assignment._id,
          status: assignment.status,
          assignedAt: assignment.createdAt,
          notes: assignment.notes,
          resolvedAt: assignment.resolvedAt
        },
        incident: {
          id: incident._id,
          title: incident.title,
          description: incident.description,
          categoryId: incident.categoryId,
          status: incident.status,
          severity: incident.severity,
          location: incident.location,
          media: incident.media,
          isAnonymous: incident.isAnonymous,
          signatureCount: incident.signatureCount,
          createdAt: incident.createdAt,
          updatedAt: incident.updatedAt,
          citizen: incident.isAnonymous ? {
            name: 'Anonymous',
            phone: 'Hidden'
          } : {
            id: incident.user?._id,
            name: incident.user?.name,
            phone: incident.user?.phone,
            profileImageUrl: incident.user?.profileImageUrl
          }
        }
      }
    });

  } catch (error) {
    console.error('Error in getIncidentDetails:', error);
    res.status(500).json({
      success: false,
      message: 'Server error occurred'
    });
  }
};

// @desc    Get available categories for officer's department
// @route   GET /api/officer/categories
// @access  Private (Officer only)
const getOfficerCategories = async (req, res) => {
  try {
    // For now, return all categories
    // In future, this can be filtered based on department
    const categories = await Category.find({ parentId: null }).sort({ name: 1 });
    
    res.status(200).json({
      success: true,
      data: categories
    });

  } catch (error) {
    console.error('Error in getOfficerCategories:', error);
    res.status(500).json({
      success: false,
      message: 'Server error occurred'
    });
  }
};

module.exports = {
  getOfficerDashboard,
  getOfficerIncidents,
  updateAssignmentStatus,
  getIncidentDetails,
  getOfficerCategories
};
