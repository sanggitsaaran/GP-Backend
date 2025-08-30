const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fs = require('fs');

// Load environment variables
dotenv.config();

// MongoDB Connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

// Connect to MongoDB
connectDB();

// Initialize app
const app = express();

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use('/api/', limiter);

// Body parser middleware
app.use(express.json());

// Enable CORS with specific configuration
app.use(cors({
  origin: '*', // Allow all origins for development
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Simple health check for connectivity diagnostics
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'OK',
    timestamp: new Date().toISOString(),
  });
});

// File upload directory setup
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Static folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Add this BEFORE your routes
app.use((req, res, next) => {
  console.log(`🌐 ${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log('📤 Request body:', req.body);
  next();
});

// Routes
app.get('/', (req, res) => {
  res.send('GramPulse API is running...');
});

// Authentication Routes
app.use('/api/auth', require('./src/routes/authRoutes'));

// Officer Authentication Routes
app.use('/api/officer-auth', require('./src/routes/officerAuth'));

// Profile Management Routes
app.use('/api/profile', require('./src/routes/profile'));

// Incident Management Routes  
app.use('/api/incidents', require('./src/routes/incidents'));

// Officer Dashboard Routes
app.use('/api/officer', require('./src/routes/officer'));

// Escalation Management Routes
// TODO: Fix Officer model dependency
// app.use('/api/officer/escalation', require('./src/routes/escalation'));

// Government Structure Routes
// TODO: Fix Officer model dependency
// app.use('/api/officer/government', require('./src/routes/government'));

// Department Routes
app.use('/api/departments', require('./src/routes/departments'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
