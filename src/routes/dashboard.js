/**
 * Express API routes for smart dashboard
 */
const express = require('express');
const smartDashboard = require('../smartDashboard');
const { ValidationError, NotFoundError } = require('../errors');

const router = express.Router();

/**
 * Get dashboard overview
 * GET /api/dashboard/overview
 */
router.get('/overview', async (req, res) => {
  try {
    const overview = await smartDashboard.getDashboardOverview();
    res.json({
      success: true,
      data: overview
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get device dashboard
 * GET /api/dashboard/device/:deviceId
 */
router.get('/device/:deviceId', async (req, res) => {
  try {
    const dashboard = await smartDashboard.getDeviceDashboard(req.params.deviceId);
    res.json({
      success: true,
      data: dashboard
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get health alerts for a device
 * GET /api/dashboard/device/:deviceId/alerts
 */
router.get('/device/:deviceId/alerts', async (req, res) => {
  try {
    const alerts = await smartDashboard.getHealthAlerts(req.params.deviceId);
    res.json({
      success: true,
      count: alerts.length,
      data: alerts
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get trend analysis for a device
 * GET /api/dashboard/device/:deviceId/trends
 */
router.get('/device/:deviceId/trends', async (req, res) => {
  try {
    const timeframe = req.query.timeframe || '7d';
    const trends = await smartDashboard.getTrendAnalysis(req.params.deviceId, timeframe);
    res.json({
      success: true,
      data: trends
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    if (error instanceof NotFoundError) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Export readings for a device
 * GET /api/dashboard/device/:deviceId/export
 */
router.get('/device/:deviceId/export', async (req, res) => {
  try {
    const format = req.query.format || 'json';
    const data = await smartDashboard.exportReadings(req.params.deviceId, format);

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="readings.csv"');
      res.send(data);
    } else {
      res.json({
        success: true,
        data
      });
    }
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    if (error instanceof NotFoundError) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
