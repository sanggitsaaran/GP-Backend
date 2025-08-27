# GramPulse Backend Implementation Plan

Based on the frontend requirements, here are the necessary updates to fully support the GramPulse mobile application.

## 1. Authentication Module Updates

### Current Status:
- OTP request and verification implemented
- User profile completion implemented
- JWT token generation implemented

### Required Updates:
- Rename `sendOTPController` to `requestOtpController` to match frontend API naming
- Update route from `/api/auth/send-otp` to `/api/auth/request-otp`
- Ensure OTP expirations are properly handled
- Add language preference field to User model
- Update token refresh mechanism

## 2. Report Management Updates

### Current Status:
- Create report implemented
- Get reports (all and single) implemented
- Update report status implemented
- Add comments implemented
- Upvote reports implemented

### Required Updates:
- Implement report assignment to officers: `PUT /api/reports/:id/assign`
- Add filtering by district, state, and category
- Implement proper geospatial queries for location-based searches
- Add endpoint for user's own reports: `GET /api/reports/me`
- Improve image upload handling for reports
- Implement report deletion functionality

## 3. User Management Updates

### Current Status:
- User profile updates implemented
- Get users (all and by ID) implemented
- Get users by role implemented

### Required Updates:
- Add support for profile picture updates
- Add language preference to user profile
- Implement KYC status tracking
- Add wardVillageId for location jurisdiction

## 4. Officer-specific Functionality

### Current Status:
- Basic officer dashboard implemented with mock data

### Required Updates:
- Implement real data analytics for officer dashboard
- Add endpoint for assigned reports: `GET /api/officers/reports`
- Implement work order generation and tracking
- Add performance metrics endpoints

## 5. Volunteer-specific Functionality

### Current Status:
- Basic volunteer routes defined but not implemented

### Required Updates:
- Implement volunteer dashboard data endpoint
- Add verification functionality for reports
- Implement endpoints for verification queue
- Add endpoints for volunteer-assisted report creation

## 6. Administrative Functionality

### Current Status:
- Admin role defined but features not implemented

### Required Updates:
- Implement admin dashboard with system-wide metrics
- Add user management endpoints (approve/reject officers, etc.)
- Implement jurisdiction management
- Add system configuration endpoints

## 7. Security Enhancements

### Current Status:
- Basic JWT authentication implemented
- Role-based authorization implemented

### Required Updates:
- Implement rate limiting for OTP requests
- Add request validation using express-validator
- Implement helmet for security headers
- Add CORS configuration with proper origins
- Improve error handling and logging

## 8. Infrastructure Improvements

### Current Status:
- Basic MongoDB connection established
- Express server configured

### Required Updates:
- Add proper error handling middleware
- Implement request logging
- Add pagination for list endpoints
- Improve file upload configuration
- Add environment-specific configurations

## Implementation Priority:

1. Fix authentication to match frontend expectations
2. Implement report assignment functionality
3. Add volunteer-specific endpoints
4. Enhance officer dashboard with real data
5. Implement geospatial functionality for map features
6. Add security enhancements
7. Complete administrative features

## Timeline:

- Phase 1: Core functionality (Authentication, Reports, User profiles) - 1 week
- Phase 2: Role-specific features (Officer, Volunteer) - 1 week
- Phase 3: Advanced features (Maps, Analytics) - 1 week
- Phase 4: Security and infrastructure improvements - 1 week
