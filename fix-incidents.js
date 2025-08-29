const mongoose = require('mongoose');
require('dotenv').config();

async function fixOrphanedIncidents() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('📦 Connected to MongoDB');
    
    const Incident = require('./src/models/Incident');
    const User = require('./src/models/User');
    
    // Find a citizen user to assign orphaned incidents to
    const citizenUser = await User.findOne({ role: 'citizen' });
    console.log('👤 Found citizen user:', citizenUser?.phone);
    
    if (citizenUser) {
      // Update all incidents with undefined reportedBy
      const result = await Incident.updateMany(
        { reportedBy: { $exists: false } },
        { $set: { reportedBy: citizenUser._id } }
      );
      
      console.log('✅ Updated incidents:', result.modifiedCount);
      
      // Also update incidents with null reportedBy
      const result2 = await Incident.updateMany(
        { reportedBy: null },
        { $set: { reportedBy: citizenUser._id } }
      );
      
      console.log('✅ Updated null reportedBy incidents:', result2.modifiedCount);
      
      // Verify the fix
      const allIncidents = await Incident.find().populate('reportedBy', 'phone role');
      console.log('📊 All incidents after fix:');
      allIncidents.forEach(incident => {
        console.log(`ID: ${incident._id}, Status: ${incident.status}, ReportedBy: ${incident.reportedBy?.phone || 'null'}`);
      });
    } else {
      console.log('❌ No citizen user found to assign incidents to');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Database error:', error);
    process.exit(1);
  }
}

fixOrphanedIncidents();
