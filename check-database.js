// MongoDB Connection Test
const mongoose = require('mongoose');
require('dotenv').config();

async function checkDatabase() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected Successfully');
    
    // Check Users Collection
    const User = require('./src/models/User');
    const users = await User.find({});
    console.log(`\n👥 Users Collection: ${users.length} users found`);
    users.forEach((user, index) => {
      console.log(`  ${index + 1}. Phone: ${user.phone}, Created: ${user.createdAt}`);
      if (user.name) console.log(`     Name: ${user.name}, Village: ${user.village}`);
    });
    
    // Check Categories Collection
    const Category = require('./src/models/Category');
    const categories = await Category.find({});
    console.log(`\n📋 Categories Collection: ${categories.length} categories found`);
    categories.forEach((cat, index) => {
      console.log(`  ${index + 1}. ${cat.name} (${cat.icon})`);
    });
    
    // Check Incidents Collection
    const Incident = require('./src/models/Incident');
    const incidents = await Incident.find({});
    console.log(`\n📝 Incidents Collection: ${incidents.length} incidents found`);
    incidents.forEach((incident, index) => {
      console.log(`  ${index + 1}. ${incident.title} - Status: ${incident.status}`);
    });
    
    console.log('\n🎉 Database verification complete!');
    
  } catch (error) {
    console.error('❌ Database Error:', error.message);
  } finally {
    mongoose.disconnect();
    process.exit(0);
  }
}

checkDatabase();
