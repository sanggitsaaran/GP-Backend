const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { requireOfficer } = require('../middleware/officer');
const {
  getEscalationPaths,
  escalateIncident,
  getEscalationHistory,
  getPendingEscalations
} = require('../controllers/escalationController');

// All routes are protected and require officer role
router.use(protect);
router.use(requireOfficer);

// @desc    Get available escalation paths for an incident
// @route   GET /api/officer/escalation/:incidentId/paths
// @access  Private (Officer only)
router.get('/:incidentId/paths', getEscalationPaths);

// @desc    Escalate an incident
// @route   POST /api/officer/escalation/:incidentId/escalate
// @access  Private (Officer only)
router.post('/:incidentId/escalate', escalateIncident);

// @desc    Get escalation history for an incident
// @route   GET /api/officer/escalation/:incidentId/history
// @access  Private (Officer only)
router.get('/:incidentId/history', getEscalationHistory);

// @desc    Get incidents available for assignment (for senior officers)
// @route   GET /api/officer/escalation/pending-assignments
// @access  Private (Officer only)
router.get('/pending-assignments', getPendingEscalations);

module.exports = router;
