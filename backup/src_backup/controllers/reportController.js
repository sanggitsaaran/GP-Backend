const Report = require('../models/Report');
const User = require('../models/User');
const multer = require('multer');
const path = require('path');

// Set up multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../uploads/'));
  },
  filename: function (req, file, cb) {
    cb(null, `report-${req.user._id}-${Date.now()}${path.extname(file.originalname)}`);
  },
});

// Check file type
const fileFilter = (req, file, cb) => {
  const filetypes = /jpeg|jpg|png/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb('Error: Images only!');
  }
};

exports.upload = multer({
  storage,
  limits: { fileSize: 5000000 }, // 5MB
  fileFilter,
});

// @desc    Create a new report
// @route   POST /api/reports
// @access  Private/Citizen
exports.createReport = async (req, res) => {
  try {
    const { title, description, category, address, district, state, pincode, latitude, longitude } = req.body;

    // Create report
    const report = new Report({
      title,
      description,
      category,
      location: {
        address,
        district,
        state,
        pincode,
        coordinates: {
          type: 'Point',
          coordinates: [longitude, latitude],
        },
      },
      user: req.user._id,
      status: 'PENDING',
      statusHistory: [
        {
          status: 'PENDING',
          changedBy: req.user._id,
          remarks: 'Report created',
        },
      ],
    });

    // Add images if uploaded
    if (req.files && req.files.length > 0) {
      const imagesPaths = req.files.map(
        (file) => `${req.protocol}://${req.get('host')}/uploads/${file.filename}`
      );
      report.images = imagesPaths;
    }

    await report.save();

    res.status(201).json({
      success: true,
      message: 'Report created successfully',
      data: report,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};

// @desc    Get all reports (filtered by role)
// @route   GET /api/reports
// @access  Private
exports.getReports = async (req, res) => {
  try {
    const { status, category, district, search } = req.query;
    let query = {};

    // Filter by status if provided
    if (status) {
      query.status = status;
    }

    // Filter by category if provided
    if (category) {
      query.category = category;
    }

    // Filter by district if provided
    if (district) {
      query['location.district'] = district;
    }

    // Search if provided
    if (search) {
      query.$text = { $search: search };
    }

    // Filter based on user role
    if (req.user.role === 'citizen') {
      // Citizens can only see their own reports
      query.user = req.user._id;
    } else if (req.user.role === 'volunteer') {
      // Volunteers can see reports in their area
      if (req.user.volunteerArea) {
        query['location.district'] = req.user.volunteerArea;
      }
    } else if (req.user.role === 'officer') {
      // Officers can see reports in their department
      if (req.user.department) {
        query.category = req.user.department;
      }
    }
    // Admins can see all reports (no additional filter)

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;

    const reports = await Report.find(query)
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit)
      .populate('user', 'name phone')
      .populate('assignedTo', 'name role');

    const total = await Report.countDocuments(query);

    res.status(200).json({
      success: true,
      count: reports.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: reports,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};

// @desc    Get a single report
// @route   GET /api/reports/:id
// @access  Private
exports.getReport = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate('user', 'name phone address district state pincode profilePic')
      .populate('assignedTo', 'name role department designation')
      .populate('comments.user', 'name role profilePic');

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found',
      });
    }

    // Check if user has access to this report
    if (
      req.user.role === 'citizen' &&
      report.user._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this report',
      });
    }

    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};

// @desc    Update report status
// @route   PUT /api/reports/:id/status
// @access  Private/Officer, Admin, Volunteer
exports.updateReportStatus = async (req, res) => {
  try {
    const { status, remarks, assignedTo } = req.body;

    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found',
      });
    }

    // Update status
    report.status = status || report.status;

    // Add to status history
    report.statusHistory.push({
      status: status || report.status,
      changedBy: req.user._id,
      remarks: remarks || `Status updated to ${status}`,
    });

    // Update assigned officer if provided
    if (assignedTo) {
      const officer = await User.findById(assignedTo);
      if (!officer || officer.role !== 'officer') {
        return res.status(400).json({
          success: false,
          message: 'Invalid officer ID',
        });
      }
      report.assignedTo = assignedTo;
    }

    await report.save();

    res.status(200).json({
      success: true,
      message: 'Report status updated successfully',
      data: report,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};

// @desc    Add comment to report
// @route   POST /api/reports/:id/comments
// @access  Private
exports.addComment = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        message: 'Please add a comment',
      });
    }

    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found',
      });
    }

    // Add comment
    report.comments.push({
      user: req.user._id,
      text,
      name: req.user.name,
    });

    await report.save();

    res.status(200).json({
      success: true,
      message: 'Comment added successfully',
      data: report.comments[report.comments.length - 1],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};

// @desc    Get reports for current user
// @route   GET /api/reports/me
// @access  Private
exports.getUserReports = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    // Build query
    const query = { user: req.user._id };
    
    // Apply status filter if provided
    if (req.query.status) {
      query.status = req.query.status.toUpperCase();
    }
    
    // Apply category filter if provided
    if (req.query.category) {
      query.category = req.query.category.toUpperCase();
    }

    // Get total count
    const total = await Report.countDocuments(query);

    // Pagination result
    const pagination = {};

    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit,
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit,
      };
    }

    // Get reports
    const reports = await Report.find(query)
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit)
      .populate('user', 'name')
      .populate('assignedTo', 'name');

    res.status(200).json({
      success: true,
      count: reports.length,
      pagination,
      total,
      data: reports,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};

// @desc    Upvote a report
// @route   PUT /api/reports/:id/upvote
// @access  Private
exports.upvoteReport = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found',
      });
    }

    // Check if report has already been upvoted by user
    if (report.upvotes.includes(req.user._id)) {
      // Remove upvote (toggle)
      report.upvotes = report.upvotes.filter(
        (upvote) => upvote.toString() !== req.user._id.toString()
      );
    } else {
      // Add upvote
      report.upvotes.push(req.user._id);
    }

    await report.save();

    res.status(200).json({
      success: true,
      message: 'Report upvote toggled',
      upvotes: report.upvotes.length,
      hasUpvoted: report.upvotes.includes(req.user._id),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};

// @desc    Assign a report to an officer
// @route   PUT /api/reports/:id/assign
// @access  Private/Admin
exports.assignReport = async (req, res) => {
  try {
    const { officerId } = req.body;
    
    if (!officerId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an officer ID',
      });
    }

    // Find the officer
    const officer = await User.findById(officerId);
    
    if (!officer) {
      return res.status(404).json({
        success: false,
        message: 'Officer not found',
      });
    }
    
    // Verify that the user is an officer
    if (officer.role !== 'officer') {
      return res.status(400).json({
        success: false,
        message: 'User is not an officer',
      });
    }

    // Find the report
    const report = await Report.findById(req.params.id);
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found',
      });
    }

    // Assign the report to the officer
    report.assignedTo = officerId;
    
    // Update status to ASSIGNED if it's still PENDING
    if (report.status === 'PENDING') {
      report.status = 'ASSIGNED';
      
      // Add status history entry
      report.statusHistory.push({
        status: 'ASSIGNED',
        changedBy: req.user._id,
        remarks: `Assigned to officer ${officer.name || 'ID: ' + officerId}`,
      });
    }

    await report.save();

    res.status(200).json({
      success: true,
      message: 'Report assigned successfully',
      data: {
        report: {
          _id: report._id,
          title: report.title,
          status: report.status,
          assignedTo: report.assignedTo,
        }
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};

// @desc    Get reports near a location
// @route   GET /api/reports/nearby
// @access  Private
exports.getNearbyReports = async (req, res) => {
  try {
    const { longitude, latitude, maxDistance = 10000 } = req.query; // maxDistance in meters, default 10km
    
    if (!longitude || !latitude) {
      return res.status(400).json({
        success: false,
        message: 'Please provide longitude and latitude',
      });
    }
    
    // Convert to numbers
    const lng = parseFloat(longitude);
    const lat = parseFloat(latitude);
    const distance = parseFloat(maxDistance);
    
    if (isNaN(lng) || isNaN(lat) || isNaN(distance)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinates or distance provided',
      });
    }
    
    // Build query based on user role
    let query = {
      'location.coordinates': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat],
          },
          $maxDistance: distance,
        },
      },
    };
    
    // Apply role-based filtering
    if (req.user.role === 'citizen') {
      // Citizens can only see public reports or their own
      query.$or = [
        { user: req.user._id },
        { visibility: 'public' },
      ];
    } else if (req.user.role === 'volunteer' && req.user.volunteerArea) {
      // Volunteers can see reports in their area
      query['location.district'] = req.user.volunteerArea;
    } else if (req.user.role === 'officer' && req.user.department) {
      // Officers can see reports in their department/category
      query.category = req.user.department;
    }
    
    // Apply category filter if provided
    if (req.query.category) {
      query.category = req.query.category;
    }
    
    // Apply status filter if provided
    if (req.query.status) {
      query.status = req.query.status;
    }
    
    const reports = await Report.find(query)
      .populate('user', 'name')
      .populate('assignedTo', 'name role')
      .limit(50) // Limit to 50 nearby reports
      .select('title category status location images createdAt upvotes');
    
    res.status(200).json({
      success: true,
      count: reports.length,
      data: reports.map(report => ({
        ...report._doc,
        distance: calculateDistance(
          lat, 
          lng, 
          report.location.coordinates[1], 
          report.location.coordinates[0]
        )
      })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message,
    });
  }
};

// @desc    Get report statistics
// @route   GET /api/reports/statistics
// @access  Private/Admin, Officer
exports.getReportStatistics = async (req, res) => {
  try {
    // Filter query based on user role
    let filter = {};
    
    if (req.user.role === 'officer' && req.user.department) {
      filter.category = req.user.department;
    } else if (req.user.role === 'volunteer' && req.user.volunteerArea) {
      filter['location.district'] = req.user.volunteerArea;
    }
    
    // Status counts
    const statusCounts = await Report.aggregate([
      { $match: filter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    
    // Category distribution
    const categoryDistribution = await Report.aggregate([
      { $match: filter },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    
    // District distribution
    const districtDistribution = await Report.aggregate([
      { $match: filter },
      { $group: { _id: '$location.district', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);
    
    // Monthly trends
    const currentYear = new Date().getFullYear();
    const monthlyTrends = await Report.aggregate([
      { 
        $match: { 
          ...filter,
          createdAt: { 
            $gte: new Date(`${currentYear}-01-01`),
            $lte: new Date(`${currentYear}-12-31`),
          },
        },
      },
      {
        $group: {
          _id: { $month: '$createdAt' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    
    // Format the data
    const formattedStatusCounts = {};
    statusCounts.forEach(item => {
      formattedStatusCounts[item._id] = item.count;
    });
    
    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    const formattedMonthlyTrends = months.map(month => {
      const found = monthlyTrends.find(item => item._id === month);
      return {
        month,
        count: found ? found.count : 0,
      };
    });
    
    res.status(200).json({
      success: true,
      data: {
        total: statusCounts.reduce((acc, curr) => acc + curr.count, 0),
        statusCounts: formattedStatusCounts,
        categoryDistribution: categoryDistribution.map(item => ({
          category: item._id,
          count: item.count,
        })),
        districtDistribution: districtDistribution.map(item => ({
          district: item._id,
          count: item.count,
        })),
        monthlyTrends: formattedMonthlyTrends,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};

// Helper function to calculate distance between coordinates in kilometers
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in kilometers
  
  return parseFloat(distance.toFixed(2));
}