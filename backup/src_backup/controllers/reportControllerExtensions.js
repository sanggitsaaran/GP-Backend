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
