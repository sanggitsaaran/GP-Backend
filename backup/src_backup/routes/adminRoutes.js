const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const User = require('../models/User');
const Report = require('../models/Report');

// Get admin dashboard data
router.get('/dashboard', protect, authorize('admin'), async (req, res) => {
  try {
    // Get counts for users by role
    const userCounts = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);
    
    const roleCounts = {};
    userCounts.forEach(item => {
      roleCounts[item._id] = item.count;
    });
    
    // Get counts for reports by status
    const reportCounts = await Report.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    const statusCounts = {};
    reportCounts.forEach(item => {
      statusCounts[item._id] = item.count;
    });
    
    // Get category distribution
    const categoryAggregation = await Report.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    const categoryDistribution = categoryAggregation.map(item => ({
      category: item._id,
      count: item.count
    }));
    
    // Get recent reports
    const recentReports = await Report.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('user', 'name')
      .select('title category status location.address createdAt');
    
    // Get recent users
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name email role createdAt');
    
    const dashboardData = {
      users: {
        total: Object.values(roleCounts).reduce((a, b) => a + b, 0),
        citizens: roleCounts.citizen || 0,
        volunteers: roleCounts.volunteer || 0,
        officers: roleCounts.officer || 0,
        admins: roleCounts.admin || 0
      },
      reports: {
        total: Object.values(statusCounts).reduce((a, b) => a + b, 0),
        pending: statusCounts.PENDING || 0,
        assigned: statusCounts.ASSIGNED || 0,
        inProgress: statusCounts.IN_PROGRESS || 0,
        resolved: statusCounts.RESOLVED || 0,
        rejected: statusCounts.REJECTED || 0
      },
      categoryDistribution,
      recentReports,
      recentUsers
    };

    res.status(200).json({
      success: true,
      data: dashboardData,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
});

// Get all users with pagination and filtering
router.get('/users', protect, authorize('admin'), async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    
    // Build query
    let query = {};
    
    // Apply role filter if provided
    if (req.query.role) {
      query.role = req.query.role;
    }
    
    // Apply search filter if provided
    if (req.query.search) {
      query.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    
    // Get total count
    const total = await User.countDocuments(query);
    
    // Pagination
    const pagination = {};
    
    if (startIndex + limit < total) {
      pagination.next = { page: page + 1, limit };
    }
    
    if (startIndex > 0) {
      pagination.prev = { page: page - 1, limit };
    }
    
    // Get users
    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit)
      .select('name email role verified createdAt');
    
    res.status(200).json({
      success: true,
      count: users.length,
      pagination,
      total,
      data: users,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
});

// Change user role
router.put('/users/:userId/role', protect, authorize('admin'), async (req, res) => {
  try {
    const { role } = req.body;
    
    // Validate role
    const validRoles = ['citizen', 'volunteer', 'officer', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role',
      });
    }
    
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { role },
      { new: true, runValidators: true }
    ).select('name email role');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
    
    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
});

// Get all reports with pagination and filtering
router.get('/reports', protect, authorize('admin'), async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    
    // Build query
    let query = {};
    
    // Apply status filter if provided
    if (req.query.status) {
      query.status = req.query.status;
    }
    
    // Apply category filter if provided
    if (req.query.category) {
      query.category = req.query.category;
    }
    
    // Apply search filter if provided
    if (req.query.search) {
      query.$or = [
        { title: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    
    // Get total count
    const total = await Report.countDocuments(query);
    
    // Pagination
    const pagination = {};
    
    if (startIndex + limit < total) {
      pagination.next = { page: page + 1, limit };
    }
    
    if (startIndex > 0) {
      pagination.prev = { page: page - 1, limit };
    }
    
    // Get reports
    const reports = await Report.find(query)
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit)
      .populate('user', 'name')
      .populate('assignedTo', 'name')
      .select('title category status location.address user assignedTo createdAt updatedAt');
    
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
});

// Get system statistics
router.get('/statistics', protect, authorize('admin'), async (req, res) => {
  try {
    // Get daily report counts for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const dailyReportCounts = await Report.aggregate([
      { 
        $match: { 
          createdAt: { $gte: thirtyDaysAgo } 
        } 
      },
      {
        $group: {
          _id: { 
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } 
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // Get resolution time statistics
    const resolutionStats = await Report.aggregate([
      {
        $match: { 
          status: 'RESOLVED',
          resolvedAt: { $exists: true },
          createdAt: { $exists: true }
        }
      },
      {
        $project: {
          resolutionTimeHours: { 
            $divide: [
              { $subtract: ['$resolvedAt', '$createdAt'] },
              3600000 // Convert ms to hours
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          averageTimeHours: { $avg: '$resolutionTimeHours' },
          minTimeHours: { $min: '$resolutionTimeHours' },
          maxTimeHours: { $max: '$resolutionTimeHours' },
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Get category performance
    const categoryPerformance = await Report.aggregate([
      {
        $match: { 
          status: 'RESOLVED',
          resolvedAt: { $exists: true },
          createdAt: { $exists: true }
        }
      },
      {
        $group: {
          _id: '$category',
          averageTimeHours: { 
            $avg: { 
              $divide: [
                { $subtract: ['$resolvedAt', '$createdAt'] },
                3600000 // Convert ms to hours
              ]
            }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    const statistics = {
      dailyReportCounts: dailyReportCounts.map(item => ({
        date: item._id,
        count: item.count
      })),
      resolutionPerformance: resolutionStats.length > 0 ? {
        averageTimeHours: parseFloat(resolutionStats[0].averageTimeHours.toFixed(2)),
        minTimeHours: parseFloat(resolutionStats[0].minTimeHours.toFixed(2)),
        maxTimeHours: parseFloat(resolutionStats[0].maxTimeHours.toFixed(2)),
        totalResolved: resolutionStats[0].count
      } : null,
      categoryPerformance: categoryPerformance.map(item => ({
        category: item._id,
        averageTimeHours: parseFloat(item.averageTimeHours.toFixed(2)),
        count: item.count
      }))
    };
    
    res.status(200).json({
      success: true,
      data: statistics,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
});

module.exports = router;
