const express = require('express');
const router = express.Router();
const { 
  getAllDepartments,
  getDepartmentByCode,
  createDepartment
} = require('../controllers/departmentController');
const { protect, restrictTo } = require('../middleware/auth');

// Public routes
router.get('/', getAllDepartments);
router.get('/:code', getDepartmentByCode);

// Protected routes (Admin only)
router.post('/', protect, restrictTo('admin'), createDepartment);

module.exports = router;
