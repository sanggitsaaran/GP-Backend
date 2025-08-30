const dotenv = require('dotenv');
const mongoose = require('mongoose');

// Load environment variables
dotenv.config();

// Import the User model
const User = require('./src/models/User');

async function analyzeOfficers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all users with role 'officer' and get ALL fields
    const officers = await User.find({ role: 'officer' }).limit(5);

    console.log('\n🔍 Full Officer Data Analysis:');
    console.log('==============================');
    
    officers.forEach((officer, index) => {
      console.log(`\n${index + 1}. Officer Data:`);
      console.log(JSON.stringify(officer.toObject(), null, 2));
      console.log('---');
    });

    // Close connection
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

analyzeOfficers();
