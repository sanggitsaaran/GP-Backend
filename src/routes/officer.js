const express = require('express');
const router = express.Router();
const { 
  getOfficerDashboard,
  getOfficerIncidents,
  updateAssignmentStatus,
  getIncidentDetails,
  getOfficerCategories
} = require('../controllers/officerController');
const { protect, restrictTo } = require('../middleware/auth');

// All routes are protected and restricted to officers
router.use(protect);
router.use(restrictTo('officer'));

// Officer dashboard and incidents
router.get('/dashboard', getOfficerDashboard);
router.get('/incidents', getOfficerIncidents);
router.get('/incidents/:incidentId', getIncidentDetails);
router.get('/categories', getOfficerCategories);

// Assignment management
router.put('/assignments/:assignmentId/status', updateAssignmentStatus);

module.exports = router;
