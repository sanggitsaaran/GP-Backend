const dotenv = require('dotenv');
const mongoose = require('mongoose');

// Load environment variables
dotenv.config();

// Import the User model
const User = require('./src/models/User');

async function listGovernmentOfficers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all users with role 'officer'
    const officers = await User.find({ role: 'officer' })
      .select('name phone email department designation escalationLevel')
      .sort({ department: 1, escalationLevel: 1 });

    console.log('\n🏛️  GOVERNMENT OFFICERS/OFFICIALS DIRECTORY');
    console.log('=============================================\n');
    
    if (officers.length === 0) {
      console.log('❌ No government officers found in database');
    } else {
      officers.forEach((officer, index) => {
        console.log(`${index + 1}. 👤 ${officer.name}`);
        console.log(`   📞 Phone: ${officer.phone}`);
        console.log(`   📧 Email: ${officer.email || 'Not provided'}`);
        console.log(`   🏛️  Department: ${officer.department || 'Not specified'}`);
        console.log(`   💼 Designation: ${officer.designation || 'Not specified'}`);
        console.log(`   ⭐ Level: ${officer.escalationLevel || 1}`);
        console.log('   ─────────────────────────────────────────');
      });
      
      console.log(`\n📊 Total Government Officers: ${officers.length}`);
      
      // Department breakdown
      const deptCount = {};
      officers.forEach(officer => {
        const dept = officer.department || 'Unspecified';
        deptCount[dept] = (deptCount[dept] || 0) + 1;
      });
      
      console.log('\n🏢 Department Breakdown:');
      Object.entries(deptCount).forEach(([dept, count]) => {
        console.log(`   ${dept}: ${count} officer(s)`);
      });
    }

    // Test authentication for the user's reported login issue
    console.log('\n🔍 AUTHENTICATION ANALYSIS');
    console.log('===========================');
    
    const testPhones = ['9876543212', '9876543211', '9876543213', '9876543214'];
    
    for (const phone of testPhones) {
      const officer = await User.findOne({ phone, role: 'officer' });
      if (officer) {
        console.log(`✅ ${phone} → ${officer.name} (${officer.department})`);
      } else {
        console.log(`❌ ${phone} → No officer found`);
      }
    }

    // Close connection
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

listGovernmentOfficers();
