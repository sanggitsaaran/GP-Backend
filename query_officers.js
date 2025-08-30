const dotenv = require('dotenv');
const mongoose = require('mongoose');

// Load environment variables
dotenv.config();

// Import the User model
const User = require('./src/models/User');

async function queryOfficers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all users with role 'officer'
    const officers = await User.find({ role: 'officer' })
      .select('name phoneNumber email role department position district block createdAt')
      .sort({ createdAt: -1 });

    console.log('\n📋 Government Officers/Officials in Database:');
    console.log('================================================');
    
    if (officers.length === 0) {
      console.log('❌ No government officers found in database');
    } else {
      officers.forEach((officer, index) => {
        console.log(`\n${index + 1}. ${officer.name}`);
        console.log(`   📞 Phone: ${officer.phoneNumber}`);
        console.log(`   📧 Email: ${officer.email || 'Not provided'}`);
        console.log(`   🏛️ Department: ${officer.department || 'Not specified'}`);
        console.log(`   💼 Position: ${officer.position || 'Not specified'}`);
        console.log(`   🌍 District: ${officer.district || 'Not specified'}`);
        console.log(`   🏘️ Block: ${officer.block || 'Not specified'}`);
        console.log(`   📅 Registered: ${officer.createdAt ? officer.createdAt.toDateString() : 'Unknown'}`);
      });
    }

    // Also check all users to see what we have
    const allUsers = await User.find({}).select('name phoneNumber role').sort({ createdAt: -1 });
    console.log('\n\n📊 All Users Summary:');
    console.log('====================');
    console.log(`Total Users: ${allUsers.length}`);
    
    const roleCount = {};
    allUsers.forEach(user => {
      roleCount[user.role] = (roleCount[user.role] || 0) + 1;
    });
    
    Object.entries(roleCount).forEach(([role, count]) => {
      console.log(`${role}: ${count}`);
    });

    // Close connection
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

queryOfficers();
