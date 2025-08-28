#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://127.0.0.1:5000/api';
let authToken = null;

// Test data
const testPhone = '9876543210';
const testUser = {
  name: 'John Doe',
  email: 'john.doe@example.com',
  role: 'citizen'
};

const testIncident = {
  categoryId: '60b01c97fc2be524faf21d28', // Will be updated with real category ID
  title: 'Broken Street Light',
  description: 'The street light on Main Street has been broken for 3 days causing safety issues at night.',
  location: {
    latitude: 12.9716,
    longitude: 77.5946,
    address: 'Main Street, Bangalore'
  },
  severity: 2
};

// Helper function to make API calls
async function apiCall(method, endpoint, data = null, token = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      ...(data && { data })
    };

    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.message || error.message,
      status: error.response?.status
    };
  }
}

// Test functions
async function testHealthCheck() {
  console.log('\n🏥 Testing Health Check...');
  const result = await apiCall('GET', '/health');
  if (result.success) {
    console.log('✅ Health check passed:', result.data.message);
  } else {
    console.log('❌ Health check failed:', result.error);
  }
  return result.success;
}

async function testRequestOTP() {
  console.log('\n📱 Testing OTP Request...');
  const result = await apiCall('POST', '/auth/request-otp', { phone: testPhone });
  if (result.success) {
    console.log('✅ OTP request successful:', result.data.message);
  } else {
    console.log('❌ OTP request failed:', result.error);
  }
  return result.success;
}

async function testVerifyOTP() {
  console.log('\n🔐 Testing OTP Verification...');
  // Use a dummy OTP - in real testing, you'd get this from console logs
  const result = await apiCall('POST', '/auth/verify-otp', { 
    phone: testPhone, 
    otp: '123456' // This will likely fail, but tests the endpoint
  });
  
  if (result.success) {
    authToken = result.data.token;
    console.log('✅ OTP verification successful, token received');
    return true;
  } else {
    console.log('⚠️ OTP verification failed (expected):', result.error);
    return false;
  }
}

async function testCompleteProfile() {
  if (!authToken) {
    console.log('\n⏭️ Skipping profile completion (no auth token)');
    return false;
  }

  console.log('\n👤 Testing Profile Completion...');
  const result = await apiCall('POST', '/auth/complete-profile', testUser, authToken);
  if (result.success) {
    console.log('✅ Profile completion successful:', result.data.message);
  } else {
    console.log('❌ Profile completion failed:', result.error);
  }
  return result.success;
}

async function testGetCategories() {
  console.log('\n📋 Testing Categories Fetch...');
  const result = await apiCall('GET', '/incidents/categories');
  if (result.success) {
    console.log('✅ Categories fetched successfully:');
    result.data.data.forEach(cat => {
      console.log(`  - ${cat.name} (${cat.color})`);
    });
    
    // Update test incident with real category ID
    if (result.data.data.length > 0) {
      testIncident.categoryId = result.data.data[0]._id;
    }
  } else {
    console.log('❌ Categories fetch failed:', result.error);
  }
  return result.success;
}

async function testCreateIncident() {
  if (!authToken) {
    console.log('\n⏭️ Skipping incident creation (no auth token)');
    return false;
  }

  console.log('\n🚨 Testing Incident Creation...');
  const result = await apiCall('POST', '/incidents', testIncident, authToken);
  if (result.success) {
    console.log('✅ Incident created successfully:', result.data.data.title);
  } else {
    console.log('❌ Incident creation failed:', result.error);
  }
  return result.success;
}

async function testGetMyIncidents() {
  if (!authToken) {
    console.log('\n⏭️ Skipping my incidents fetch (no auth token)');
    return false;
  }

  console.log('\n📊 Testing My Incidents Fetch...');
  const result = await apiCall('GET', '/incidents/my', null, authToken);
  if (result.success) {
    console.log('✅ My incidents fetched successfully:');
    result.data.data.forEach(incident => {
      console.log(`  - ${incident.title} (${incident.status})`);
    });
  } else {
    console.log('❌ My incidents fetch failed:', result.error);
  }
  return result.success;
}

async function testGetIncidentStatistics() {
  if (!authToken) {
    console.log('\n⏭️ Skipping statistics fetch (no auth token)');
    return false;
  }

  console.log('\n📈 Testing Incident Statistics...');
  const result = await apiCall('GET', '/incidents/statistics', null, authToken);
  if (result.success) {
    console.log('✅ Statistics fetched successfully:', result.data.data);
  } else {
    console.log('❌ Statistics fetch failed:', result.error);
  }
  return result.success;
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting GramPulse Backend API Tests...');
  console.log('='.repeat(50));

  const tests = [
    testHealthCheck,
    testRequestOTP,
    testVerifyOTP,
    testCompleteProfile,
    testGetCategories,
    testCreateIncident,
    testGetMyIncidents,
    testGetIncidentStatistics
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    const result = await test();
    if (result) passed++;
    else failed++;
  }

  console.log('\n' + '='.repeat(50));
  console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
  
  if (passed === tests.length) {
    console.log('🎉 All tests passed! Backend is working perfectly.');
  } else if (passed >= tests.length - 3) {
    console.log('✅ Core functionality working! Some auth-dependent tests failed (expected).');
  } else {
    console.log('⚠️ Some critical tests failed. Check server logs.');
  }
}

// Handle command line execution
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { runAllTests, apiCall, BASE_URL };
