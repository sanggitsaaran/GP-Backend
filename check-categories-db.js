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

const checkDatabase = async () => {
  try {
    await connectDB();
    
    console.log('🔍 Checking Category Collection...');
    
    // Get all categories
    const categories = await Category.find({});
    console.log(`✅ Found ${categories.length} total categories`);
    
    // Get active categories (what the API returns)
    const activeCategories = await Category.find({ isActive: true }).sort({ name: 1 });
    console.log(`✅ Found ${activeCategories.length} active categories`);
    
    console.log('\n📋 Active Categories (same as API response):');
    activeCategories.forEach(cat => {
      console.log(`  • ID: ${cat._id}`);
      console.log(`    Name: ${cat.name}`);
      console.log(`    Icon: ${cat.icon}`);
      console.log(`    Color: ${cat.color}`);
      console.log(`    Active: ${cat.isActive}`);
      console.log('');
    });
    
    // Test the exact query the API uses
    console.log('🧪 Testing exact API query...');
    const apiResult = await Category.find({ isActive: true }).sort({ name: 1 });
    console.log(`✅ API query returns ${apiResult.length} categories`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

checkDatabase();
