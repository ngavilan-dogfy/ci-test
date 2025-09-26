const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

// Load environment-specific configuration
let config;
try {
  config = require(`../config/environments/${NODE_ENV}.json`);
} catch (error) {
  console.warn(`No config found for environment: ${NODE_ENV}, using defaults`);
  config = {
    app: { name: 'ci-test', port: PORT },
    features: {},
    logging: { level: 'info' }
  };
}

// Security middleware
app.use(helmet());
app.use(cors(config.security?.cors || {}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
    config: {
      logLevel: LOG_LEVEL,
      port: PORT
    }
  });
});

// Feature flag demonstration
app.get('/features', (req, res) => {
  res.json({
    environment: NODE_ENV,
    features: config.features || {},
    message: 'Feature flags configuration'
  });
});

// Main application route
app.get('/', (req, res) => {
  const welcomeMessage = {
    message: 'Welcome to Trunk-Based Development CI/CD Pipeline!',
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
    logLevel: LOG_LEVEL,
    features: {
      newUI: config.features?.newUI || false,
      advancedAnalytics: config.features?.advancedAnalytics || false,
      betaFeatures: config.features?.betaFeatures || false
    }
  };

  res.json(welcomeMessage);
});

// API routes
app.get('/api/status', (req, res) => {
  res.json({
    status: 'operational',
    environment: NODE_ENV,
    config: config.app || {},
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📦 Environment: ${NODE_ENV}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  
  if (config.features) {
    console.log('🎛️  Feature flags:', JSON.stringify(config.features, null, 2));
  }
});

module.exports = app;
