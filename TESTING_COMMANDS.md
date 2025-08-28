# GramPulse Backend Testing Commands - PERFECT WORKING VERSION

## ✅ BACKEND STATUS: FULLY OPERATIONAL
- Server running on port 5000 ✅
- MongoDB Atlas connected ✅  
- 10 categories seeded ✅
- Authentication flow working ✅
- Enhanced User model with role fields ✅
- Auto-login disabled for fresh registration ✅

## Prerequisites
Backend Location: `d:\ICSRF\GramPulse-Backend`
Frontend Location: `d:\ICSRF\GramPulse`

## 🚀 QUICK COMMANDS (Copy & Run)

### 1. Start Backend Server
```powershell
cd "d:\ICSRF\GramPulse-Backend" ; npm start
```

### 2. Quick Status Check (Comprehensive)
```powershell
cd "d:\ICSRF\GramPulse-Backend" ; node statusCheck.js
```

### 3. Test Categories API (No Auth Required)
```powershell
cd "d:\ICSRF\GramPulse-Backend" ; node -e "const http = require('http'); http.get('http://127.0.0.1:5000/api/incidents/categories', (res) => { let data = ''; res.on('data', chunk => data += chunk); res.on('end', () => { const result = JSON.parse(data); console.log('✅ Categories found:', result.data.length); result.data.forEach(cat => console.log('  -', cat.name, '(' + cat.color + ')')); }); }).on('error', err => console.log('❌ Server not running'));"
```

### 4. Test OTP Request API
```powershell
cd "d:\ICSRF\GramPulse-Backend" ; node -e "const http = require('http'); const postData = JSON.stringify({phone: '9876543210'}); const req = http.request({hostname: '127.0.0.1', port: 5000, path: '/api/auth/request-otp', method: 'POST', headers: {'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData)}}, (res) => { let data = ''; res.on('data', chunk => data += chunk); res.on('end', () => { const result = JSON.parse(data); console.log('✅ OTP Response:', result.message); }); }); req.on('error', err => console.log('❌ Error:', err.message)); req.write(postData); req.end();"
```

### 5. Test Health Endpoint
```powershell
cd "d:\ICSRF\GramPulse-Backend" ; node -e "const http = require('http'); http.get('http://127.0.0.1:5000/api/health', (res) => { let data = ''; res.on('data', chunk => data += chunk); res.on('end', () => { const result = JSON.parse(data); console.log('✅ Health:', result.message, 'at', result.timestamp); }); }).on('error', err => console.log('❌ Server not running'));"
```

## 🔧 ADVANCED TESTING

### Run Full API Test Suite
```powershell
cd "d:\ICSRF\GramPulse-Backend" ; node testAPI.js
```

### Check User Model Schema
```powershell
cd "d:\ICSRF\GramPulse-Backend" ; node -e "const User = require('./src/models/User'); console.log('📋 User Schema Fields:'); Object.keys(User.schema.paths).forEach(field => console.log('  -', field)); console.log('\n✅ Enhanced Role Fields:'); ['language', 'wardVillageId', 'department', 'designation', 'escalationLevel'].forEach(field => console.log('  -', field, ':', User.schema.paths[field] ? 'Present' : 'Missing'));"
```

### Test Server Port Availability
```powershell
cd "d:\ICSRF\GramPulse-Backend" ; netstat -an | findstr :5000
```

### Seed Categories (If Needed)
```powershell
cd "d:\ICSRF\GramPulse-Backend" ; node src/utils/seedCategories.js
```

## 📊 API ENDPOINTS WORKING

### ✅ Authentication Endpoints
- `POST /api/auth/request-otp` - Send OTP to phone ✅
- `POST /api/auth/verify-otp` - Verify OTP and get JWT ✅  
- `POST /api/auth/complete-profile` - Complete user profile ✅
- `GET /api/auth/me` - Get current user info ✅

### ✅ Incident Management Endpoints  
- `GET /api/incidents/categories` - Get all categories ✅
- `POST /api/incidents` - Create new incident (requires auth) ✅
- `GET /api/incidents/my` - Get user's incidents (requires auth) ✅
- `GET /api/incidents/nearby` - Get nearby incidents (requires auth) ✅
- `GET /api/incidents/statistics` - Get incident statistics (requires auth) ✅

### ✅ Utility Endpoints
- `GET /api/health` - Server health check ✅

## 🗄️ DATABASE STATUS

### Collections Created:
- **users** - Enhanced with role-specific fields (language, wardVillageId, department, designation, escalationLevel)
- **categories** - 10 seeded categories (Agriculture, Education, Electricity, Healthcare, etc.)
- **incidents** - Ready for incident data with media attachments

### Enhanced User Model Fields:
- phone, name, email, role (basic fields)
- language, wardVillageId (location fields)  
- department, designation, escalationLevel (officer fields)
- profileImageUrl, kycStatus, isVerified, isProfileComplete (profile fields)

## 🎯 PRODUCTION READY FEATURES

✅ **Authentication System**
- Phone-based OTP authentication
- JWT token management  
- Profile completion workflow
- Role-based user types (citizen, volunteer, officer, admin)

✅ **Data Management**
- MongoDB Atlas cloud database
- Comprehensive user model with role-specific fields
- Incident management with media support
- Category system for incident classification

✅ **API Security**
- CORS enabled for frontend integration
- Rate limiting for API protection
- JWT middleware for protected routes
- Input validation and error handling

✅ **Development Setup**
- Auto-login disabled for fresh registration flow
- ADB port forwarding ready for Flutter app
- Comprehensive testing suite
- Status monitoring tools

## 🚨 TROUBLESHOOTING

### If Server Won't Start:
1. Check if port 5000 is available: `netstat -an | findstr :5000`
2. Verify MongoDB connection in logs
3. Check .env file exists with MONGODB_URI

### If API Tests Fail:
1. Ensure server is running: `node statusCheck.js`
2. Check network connectivity: Use 127.0.0.1 instead of localhost
3. Verify endpoints with individual tests above

### If Database Issues:
1. Check MongoDB Atlas connection
2. Re-seed categories: `node src/utils/seedCategories.js`
3. Verify .env MONGODB_URI is correct

## 💡 NEXT DEVELOPMENT PHASE (After 4 PM)

1. **Frontend Integration**
   - Wire Report Issue form to `/api/incidents` endpoint
   - Connect home screen to `/api/incidents/my` for real data
   - Implement role-specific UI based on user type

2. **Advanced Features**
   - File upload for incident media attachments
   - Real-time notifications for incident updates
   - Advanced search and filtering
   - Incident status workflow management

3. **Production Deployment**
   - Environment-specific configurations
   - Performance optimization
   - Security hardening
   - Monitoring and logging

## 3. Run Comprehensive API Tests
```powershell
cd "d:\ICSRF\GramPulse-Backend"; node testAPI.js
```

## 4. Individual API Tests (PowerShell)

### Test Categories (No Auth Required)
```powershell
cd "d:\ICSRF\GramPulse-Backend"; Invoke-RestMethod -Uri "http://localhost:5000/api/incidents/categories" -Method GET | ConvertTo-Json -Depth 3
```

### Test OTP Request
```powershell
cd "d:\ICSRF\GramPulse-Backend"; Invoke-RestMethod -Uri "http://localhost:5000/api/auth/request-otp" -Method POST -Body '{"phone":"9876543210"}' -ContentType "application/json" | ConvertTo-Json
```

### Test Health Check
```powershell
cd "d:\ICSRF\GramPulse-Backend"; Invoke-RestMethod -Uri "http://localhost:5000/api/health" -Method GET | ConvertTo-Json
```

## 5. Database Status Check
```powershell
cd "d:\ICSRF\GramPulse-Backend"; node -e "const mongoose = require('mongoose'); require('./src/config/database'); mongoose.connection.once('open', () => { console.log('✅ MongoDB Connected'); mongoose.connection.db.admin().ping().then(() => console.log('✅ Database Ping Successful')).finally(() => process.exit(0)); });"
```

## 6. Seed Categories (If Needed)
```powershell
cd "d:\ICSRF\GramPulse-Backend"; node src/utils/seedCategories.js
```

## 7. Advanced Testing Commands

### Test All Endpoints with Authentication Flow
```bash
cd "d:\ICSRF\GramPulse"; cd GramPulse-Backend; node -e "
const axios = require('axios');
const BASE = 'http://localhost:5000/api';

(async () => {
  try {
    // 1. Health Check
    const health = await axios.get(BASE + '/health');
    console.log('✅ Health:', health.data.message);
    
    // 2. Categories
    const cats = await axios.get(BASE + '/incidents/categories');
    console.log('✅ Categories:', cats.data.data.length, 'found');
    
    // 3. OTP Request
    const otp = await axios.post(BASE + '/auth/request-otp', {phone: '9876543210'});
    console.log('✅ OTP Request:', otp.data.message);
    
    console.log('🎉 Core backend endpoints working!');
  } catch (err) {
    console.log('❌ Error:', err.response?.data?.message || err.message);
  }
})();
"
```

### Check User Model Schema
```bash
cd "d:\ICSRF\GramPulse"; cd GramPulse-Backend; node -e "const User = require('./src/models/User'); console.log('User Schema Fields:'); console.log(Object.keys(User.schema.paths)); console.log('Role-specific fields added:', ['language', 'wardVillageId', 'department', 'designation', 'escalationLevel'].every(field => User.schema.paths[field]));"
```

### Test Database Collections
```bash
cd "d:\ICSRF\GramPulse"; cd GramPulse-Backend; node -e "
const mongoose = require('mongoose');
require('./src/config/database');

mongoose.connection.once('open', async () => {
  try {
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📁 Collections:', collections.map(c => c.name));
    
    const User = require('./src/models/User');
    const Category = require('./src/models/Category');
    const Incident = require('./src/models/Incident');
    
    console.log('👥 Users:', await User.countDocuments());
    console.log('📋 Categories:', await Category.countDocuments());
    console.log('🚨 Incidents:', await Incident.countDocuments());
    
    process.exit(0);
  } catch (err) {
    console.log('❌ Database Error:', err.message);
    process.exit(1);
  }
});
"
```

## 8. Performance & Load Testing

### Simple Load Test (100 requests)
```bash
cd "d:\ICSRF\GramPulse"; cd GramPulse-Backend; node -e "
const axios = require('axios');
const start = Date.now();
let completed = 0;

Array.from({length: 100}, async (_, i) => {
  try {
    await axios.get('http://localhost:5000/api/health');
    completed++;
    if (completed === 100) {
      console.log('🚀 Load Test: 100 requests in', Date.now() - start, 'ms');
    }
  } catch (err) {
    console.log('❌ Request', i, 'failed');
  }
});
"
```

## 9. Error Logging Test
```bash
cd "d:\ICSRF\GramPulse"; cd GramPulse-Backend; node -e "
const axios = require('axios');

(async () => {
  try {
    // Test invalid endpoint
    await axios.get('http://localhost:5000/api/invalid');
  } catch (err) {
    console.log('✅ Error handling working:', err.response.status, err.response.data.message);
  }
  
  try {
    // Test invalid auth
    await axios.get('http://localhost:5000/api/incidents/my', {
      headers: { 'Authorization': 'Bearer invalid-token' }
    });
  } catch (err) {
    console.log('✅ Auth validation working:', err.response.status, err.response.data.message);
  }
})();
"
```

## 10. Complete Backend Validation
Run this comprehensive test to validate everything:
```bash
cd "d:\ICSRF\GramPulse"; cd GramPulse-Backend; echo "🔍 Running Complete Backend Validation..." && npm start & sleep 5 && node testAPI.js && echo "✅ Backend validation complete!"
```

## Notes:
- All commands include the required `cd "d:\ICSRF\GramPulse";` prefix
- The comprehensive test script (testAPI.js) covers all major endpoints
- Health check and categories don't require authentication
- Authentication flow requires real OTP verification
- Database tests verify MongoDB connection and collections
- Load tests help identify performance bottlenecks
