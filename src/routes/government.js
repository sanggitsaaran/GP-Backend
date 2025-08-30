const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { requireOfficer } = require('../middleware/officer');
const {
  getGovernmentStructure,
  getJurisdictionIncidents,
  coordinateWithDepartments,
  getCoordinationStatus
} = require('../controllers/governmentController');

// All routes are protected and require officer role
router.use(protect);
router.use(requireOfficer);

// @desc    Get government structure and hierarchy
// @route   GET /api/officer/government/structure
// @access  Private (Officer only)
router.get('/structure', getGovernmentStructure);

// @desc    Get incidents by jurisdiction and department
// @route   GET /api/officer/government/jurisdiction-incidents
// @access  Private (Officer only)
router.get('/jurisdiction-incidents', getJurisdictionIncidents);

// @desc    Coordinate with other departments
// @route   POST /api/officer/government/coordinate
// @access  Private (Officer only)
router.post('/coordinate', coordinateWithDepartments);

// @desc    Get coordination status and assignments
// @route   GET /api/officer/government/coordination/:incidentId
// @access  Private (Officer only)
router.get('/coordination/:incidentId', getCoordinationStatus);

module.exports = router;
