/**
 * Express API routes for device management
 */
const express = require('express');
const deviceManager = require('../deviceManager');
const bloodPressureLogger = require('../bloodPressureLogger');
const healthIndicatorManager = require('../healthIndicatorManager');

const router = express.Router();

/**
 * Register a new device
 * POST /api/devices
 */
router.post('/', async (req, res) => {
  try {
    const deviceInfo = req.body;
    const device = await deviceManager.registerDevice(deviceInfo);
    res.status(201).json({
      success: true,
      data: device
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get all devices
 * GET /api/devices
 */
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) {
      filter.status = req.query.status;
    }
    const devices = await deviceManager.listDevices(filter);
    res.json({
      success: true,
      count: devices.length,
      data: devices
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get a specific device
 * GET /api/devices/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const device = await deviceManager.getDevice(req.params.id);
    res.json({
      success: true,
      data: device
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Update device status
 * PATCH /api/devices/:id/status
 */
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required'
      });
    }
    const device = await deviceManager.updateDeviceStatus(req.params.id, status);
    res.json({
      success: true,
      data: device
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Delete a device
 * DELETE /api/devices/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const result = await deviceManager.removeDevice(req.params.id);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get readings for a device
 * GET /api/devices/:deviceId/readings
 */
router.get('/:deviceId/readings', async (req, res) => {
  try {
    const filter = {};
    if (req.query.from_date) filter.from_date = req.query.from_date;
    if (req.query.to_date) filter.to_date = req.query.to_date;
    if (req.query.limit) filter.limit = req.query.limit;

    const readings = await bloodPressureLogger.getDeviceReadings(req.params.deviceId, filter);
    res.json({
      success: true,
      count: readings.length,
      data: readings
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get latest reading for a device
 * GET /api/devices/:deviceId/readings/latest
 */
router.get('/:deviceId/readings/latest', async (req, res) => {
  try {
    const reading = await bloodPressureLogger.getLatestReading(req.params.deviceId);
    res.json({
      success: true,
      data: reading
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get statistics for device readings
 * GET /api/devices/:deviceId/readings/stats
 */
router.get('/:deviceId/readings/stats', async (req, res) => {
  try {
    const timeframe = req.query.timeframe || '7d';
    const stats = await bloodPressureLogger.getReadingStatistics(req.params.deviceId, timeframe);
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get indicators for a device
 * GET /api/devices/:deviceId/indicators
 */
router.get('/:deviceId/indicators', async (req, res) => {
  try {
    const filter = {};
    if (req.query.indicator_type) filter.indicator_type = req.query.indicator_type;
    if (req.query.limit) filter.limit = req.query.limit;

    const indicators = await healthIndicatorManager.getDeviceIndicators(req.params.deviceId, filter);
    res.json({
      success: true,
      count: indicators.length,
      data: indicators
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
