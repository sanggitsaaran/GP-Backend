const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../src/models/User');
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

const generateTestToken = async () => {
  try {
    await connectDB();

    // Find test user
    const user = await User.findOne({ phone: '9876543210' });
    if (!user) {
      console.log('❌ Test user not found. Please run createTestData.js first');
      return;
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('✅ Test user found:');
    console.log(`  Name: ${user.name}`);
    console.log(`  Phone: ${user.phone}`);
    console.log(`  User ID: ${user._id}`);
    console.log('\n🔑 JWT Token:');
    console.log(token);
    console.log('\n📋 Use this token for API testing by setting the Authorization header:');
    console.log(`Authorization: Bearer ${token}`);

    return token;
  } catch (error) {
    console.error('❌ Error generating token:', error);
  } finally {
    await mongoose.connection.close();
  }
};

if (require.main === module) {
  generateTestToken();
}

module.exports = { generateTestToken };
