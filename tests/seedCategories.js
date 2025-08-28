const mongoose = require('mongoose');
const Category = require('./src/models/Category');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

// Essential categories for GramPulse
const categories = [
  {
    name: 'Roads & Transportation',
    icon: 'road',
    color: '#FF6B6B'
  },
  {
    name: 'Water Supply',
    icon: 'water-drop',
    color: '#4ECDC4'
  },
  {
    name: 'Electricity',
    icon: 'electrical-services',
    color: '#FFE66D'
  },
  {
    name: 'Waste Management',
    icon: 'delete',
    color: '#95E1D3'
  },
  {
    name: 'Public Safety',
    icon: 'security',
    color: '#F38BA8'
  },
  {
    name: 'Healthcare',
    icon: 'local-hospital',
    color: '#A8DADC'
  },
  {
    name: 'Education',
    icon: 'school',
    color: '#457B9D'
  },
  {
    name: 'Public Works',
    icon: 'construction',
    color: '#1D3557'
  },
  {
    name: 'Agriculture',
    icon: 'agriculture',
    color: '#2D6A4F'
  },
  {
    name: 'Other',
    icon: 'more-horiz',
    color: '#6C757D'
  }
];

const seedCategories = async () => {
  try {
    await connectDB();
    
    // Clear existing categories
    await Category.deleteMany({});
    console.log('🗑️ Cleared existing categories');
    
    // Insert new categories
    const insertedCategories = await Category.insertMany(categories);
    console.log(`✅ Inserted ${insertedCategories.length} categories`);
    
    console.log('📋 Categories seeded:');
    insertedCategories.forEach(cat => {
      console.log(`  - ${cat.name} (${cat.color})`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding categories:', error);
    process.exit(1);
  }
};

seedCategories();
