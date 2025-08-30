const Department = require('../models/Department');

// @desc    Get all departments
// @route   GET /api/departments
// @access  Public
const getAllDepartments = async (req, res) => {
  try {
    const departments = await Department.find().sort({ name: 1 });
    
    res.status(200).json({
      success: true,
      data: departments
    });

  } catch (error) {
    console.error('Error in getAllDepartments:', error);
    res.status(500).json({
      success: false,
      message: 'Server error occurred'
    });
  }
};

// @desc    Get department by code
// @route   GET /api/departments/:code
// @access  Public
const getDepartmentByCode = async (req, res) => {
  try {
    const { code } = req.params;
    
    const department = await Department.findOne({ code: code.toUpperCase() });
    
    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: department
    });

  } catch (error) {
    console.error('Error in getDepartmentByCode:', error);
    res.status(500).json({
      success: false,
      message: 'Server error occurred'
    });
  }
};

// @desc    Create new department (Admin only)
// @route   POST /api/departments
// @access  Private (Admin only)
const createDepartment = async (req, res) => {
  try {
    const { name, code, description, jurisdictionLevel, parentId } = req.body;

    // Validate required fields
    if (!name || !code || !jurisdictionLevel) {
      return res.status(400).json({
        success: false,
        message: 'Name, code, and jurisdiction level are required'
      });
    }

    // Check if department code already exists
    const existingDepartment = await Department.findOne({ code: code.toUpperCase() });
    if (existingDepartment) {
      return res.status(409).json({
        success: false,
        message: 'Department code already exists'
      });
    }

    // Create department
    const department = new Department({
      name,
      code: code.toUpperCase(),
      description,
      jurisdictionLevel,
      parentId
    });

    await department.save();

    res.status(201).json({
      success: true,
      message: 'Department created successfully',
      data: department
    });

  } catch (error) {
    console.error('Error in createDepartment:', error);
    res.status(500).json({
      success: false,
      message: 'Server error occurred'
    });
  }
};

module.exports = {
  getAllDepartments,
  getDepartmentByCode,
  createDepartment
};
