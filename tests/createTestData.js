const mongoose = require('mongoose');
const User = require('../src/models/User');
const Incident = require('../src/models/Incident');
const Category = require('../src/models/Category');
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

// Create test user and incidents
const createTestData = async () => {
  try {
    await connectDB();

    // Get categories
    const categories = await Category.find();
    if (categories.length === 0) {
      console.log('❌ No categories found. Please run seedCategories.js first');
      return;
    }

    // Create test user
    const testUser = {
      phone: '9876543210',
      name: 'John Doe',
      email: 'john.doe@example.com',
      role: 'citizen',
      isVerified: true,
      profileComplete: true,
      location: {
        latitude: 12.9716,
        longitude: 77.5946,
        address: 'Bangalore, Karnataka'
      }
    };

    // Remove existing test user
    await User.deleteOne({ phone: testUser.phone });
    
    // Create new test user
    const user = await User.create(testUser);
    console.log('✅ Test user created:', user.name);

    // Remove existing test incidents
    await Incident.deleteMany({ user: user._id });

    // Create test incidents with different statuses
    const testIncidents = [
      {
        user: user._id,
        categoryId: categories[0]._id,
        title: 'Broken Street Light on Main Road',
        description: 'The street light near bus stop has been not working for 3 days causing safety issues.',
        location: {
          latitude: 12.9716,
          longitude: 77.5946,
          address: 'Main Road, Bangalore'
        },
        severity: 2,
        status: 'NEW',
        isAnonymous: false
      },
      {
        user: user._id,
        categoryId: categories[1]._id,
        title: 'Water Supply Issue in Residential Area',
        description: 'No water supply for the past 2 days in our residential block.',
        location: {
          latitude: 12.9750,
          longitude: 77.5950,
          address: 'Residential Block A, Bangalore'
        },
        severity: 3,
        status: 'IN_PROGRESS',
        isAnonymous: false
      },
      {
        user: user._id,
        categoryId: categories[2]._id,
        title: 'Power Outage in Commercial Area',
        description: 'Frequent power cuts affecting local businesses.',
        location: {
          latitude: 12.9700,
          longitude: 77.5930,
          address: 'Commercial Street, Bangalore'
        },
        severity: 2,
        status: 'ASSIGNED',
        isAnonymous: false
      },
      {
        user: user._id,
        categoryId: categories[3]._id,
        title: 'Garbage Collection Delayed',
        description: 'Garbage has not been collected for a week in our area.',
        location: {
          latitude: 12.9680,
          longitude: 77.5910,
          address: 'Waste Collection Point, Bangalore'
        },
        severity: 1,
        status: 'RESOLVED',
        isAnonymous: false
      },
      {
        user: user._id,
        categoryId: categories[4]._id,
        title: 'Suspicious Activity Near Park',
        description: 'Unusual activities reported near the children\'s park at night.',
        location: {
          latitude: 12.9720,
          longitude: 77.5940,
          address: 'City Park, Bangalore'
        },
        severity: 3,
        status: 'VERIFIED',
        isAnonymous: true
      },
      {
        user: user._id,
        categoryId: categories[0]._id,
        title: 'Pothole on Highway',
        description: 'Large pothole causing vehicle damage on the main highway.',
        location: {
          latitude: 12.9800,
          longitude: 77.6000,
          address: 'Highway Exit 5, Bangalore'
        },
        severity: 3,
        status: 'CLOSED',
        isAnonymous: false
      }
    ];

    // Create incidents
    const incidents = await Incident.insertMany(testIncidents);
    console.log(`✅ Created ${incidents.length} test incidents:`);
    
    incidents.forEach((incident, index) => {
      console.log(`  ${index + 1}. ${incident.title} (${incident.status})`);
    });

    console.log('\n🎉 Test data created successfully!');
    console.log('\n📱 Test User Details:');
    console.log(`  Phone: ${testUser.phone}`);
    console.log(`  Name: ${testUser.name}`);
    console.log(`  Email: ${testUser.email}`);
    console.log(`  User ID: ${user._id}`);

  } catch (error) {
    console.error('❌ Error creating test data:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
};

// Run the script
if (require.main === module) {
  createTestData();
}

module.exports = { createTestData };
