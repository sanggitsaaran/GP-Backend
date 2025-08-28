const express = require('express');
const router = express.Router();
const Incident = require('../models/Incident');
const Category = require('../models/Category');
const { protect: auth } = require('../middleware/auth');

// Get all categories
router.get('/categories', async (req, res) => {
  try {
    console.log('🌐', new Date().toISOString(), '- GET /api/incidents/categories');
    
    const categories = await Category.find({ isActive: true }).sort({ name: 1 });
    
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('❌ Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories'
    });
  }
});

// Create new incident
router.post('/', auth, async (req, res) => {
  try {
    console.log('🌐', new Date().toISOString(), '- POST /api/incidents');
    console.log('📤 Request body:', req.body);
    
    const {
      categoryId,
      title,
      description,
      location,
      severity = 1,
      isAnonymous = false
    } = req.body;

    // Validation
    if (!categoryId || !title || !description || !location) {
      return res.status(400).json({
        success: false,
        message: 'Category, title, description, and location are required'
      });
    }

    if (!location.latitude || !location.longitude) {
      return res.status(400).json({
        success: false,
        message: 'Location coordinates are required'
      });
    }

    // Create incident
    const incident = new Incident({
      user: req.user.userId,
      categoryId,
      title,
      description,
      location,
      severity,
      isAnonymous
    });

    await incident.save();
    
    // Populate user info for response
    await incident.populate('user', 'name phone');

    console.log('✅ Incident created:', incident._id);

    res.status(201).json({
      success: true,
      message: 'Incident reported successfully',
      data: incident
    });
  } catch (error) {
    console.error('❌ Error creating incident:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create incident'
    });
  }
});

// Get user's incidents
router.get('/my', auth, async (req, res) => {
  try {
    console.log('🌐', new Date().toISOString(), '- GET /api/incidents/my');
    
    const incidents = await Incident.find({ user: req.user.userId })
      .sort({ createdAt: -1 })
      .populate('user', 'name phone');

    res.json({
      success: true,
      data: incidents
    });
  } catch (error) {
    console.error('❌ Error fetching user incidents:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch incidents'
    });
  }
});

// Get nearby incidents
router.get('/nearby', auth, async (req, res) => {
  try {
    console.log('🌐', new Date().toISOString(), '- GET /api/incidents/nearby');
    
    const { lat, lng, radius = 5000 } = req.query; // radius in meters
    
    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    // Simple distance calculation (for basic functionality)
    // In production, use MongoDB's geospatial queries
    const incidents = await Incident.find({
      status: { $nin: ['CLOSED', 'CANCELLED', 'SPAM'] }
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('user', 'name');

    res.json({
      success: true,
      data: incidents
    });
  } catch (error) {
    console.error('❌ Error fetching nearby incidents:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch nearby incidents'
    });
  }
});

// Get incident statistics
router.get('/statistics', auth, async (req, res) => {
  try {
    console.log('🌐', new Date().toISOString(), '- GET /api/incidents/statistics');
    
    const stats = await Promise.all([
      Incident.countDocuments({ status: 'NEW' }),
      Incident.countDocuments({ status: 'IN_PROGRESS' }),
      Incident.countDocuments({ status: 'RESOLVED' }),
      Incident.countDocuments({ user: req.user.userId })
    ]);

    res.json({
      success: true,
      data: {
        newIncidents: stats[0],
        inProgress: stats[1],
        resolved: stats[2],
        myIncidents: stats[3]
      }
    });
  } catch (error) {
    console.error('❌ Error fetching statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics'
    });
  }
});

module.exports = router;
