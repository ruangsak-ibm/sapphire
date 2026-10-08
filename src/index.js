/**
 * Main Express application
 */
const express = require('express');
const database = require('./database');
const { requireAuth, optionalAuth } = require('./middleware/auth');

const deviceRoutes = require('./routes/devices');
const readingRoutes = require('./routes/readings');
const indicatorRoutes = require('./routes/indicators');
const dashboardRoutes = require('./routes/dashboard');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Health check endpoint (no auth required)
app.get('/health', optionalAuth, (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API documentation endpoint (no auth required)
app.get('/api', optionalAuth, (req, res) => {
  res.json({
    success: true,
    message: 'Sapphire - Health Indicator Ingestion & Smart Dashboard API',
    version: '0.1.0',
    documentation: 'See README.md for API documentation',
    endpoints: {
      health: 'GET /health',
      devices: 'GET /api/devices',
      readings: 'GET /api/readings/:id',
      indicators: 'GET /api/indicators/:id',
      dashboard: 'GET /api/dashboard/overview'
    },
    authentication: 'All endpoints require Authorization: Bearer <api-key> header'
  });
});

// Require authentication for all API routes
app.use('/api', requireAuth);

// API routes
app.use('/api/devices', deviceRoutes);
app.use('/api/readings', readingRoutes);
app.use('/api/indicators', indicatorRoutes);
app.use('/api/dashboard', dashboardRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error'
  });
});

/**
 * Start the server
 */
async function start() {
  try {
    await database.initialize();
    console.log('Database initialized');

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`API Documentation: http://localhost:${PORT}/api`);
      console.log(`Dashboard (requires auth): http://localhost:${PORT}/api/dashboard/overview`);
      console.log('');
      console.log('Authentication: Include "Authorization: Bearer YOUR_API_KEY" header with all requests to /api/* endpoints');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

/**
 * Graceful shutdown
 */
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  await database.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down gracefully...');
  await database.close();
  process.exit(0);
});

// Start the application
if (require.main === module) {
  start();
}

module.exports = app;
