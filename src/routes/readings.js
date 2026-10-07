/**
 * Express API routes for blood pressure readings
 */
const express = require('express');
const bloodPressureLogger = require('../bloodPressureLogger');

const router = express.Router();

/**
 * Record a new blood pressure reading
 * POST /api/readings
 */
router.post('/', async (req, res) => {
  try {
    const { device_id, ...readingData } = req.body;

    if (!device_id) {
      return res.status(400).json({
        success: false,
        error: 'device_id is required'
      });
    }

    const reading = await bloodPressureLogger.recordReading(device_id, readingData);
    res.status(201).json({
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
 * Get a specific reading
 * GET /api/readings/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const reading = await bloodPressureLogger.getReading(req.params.id);
    res.json({
      success: true,
      data: reading
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
router.get('/device/:deviceId', async (req, res) => {
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
router.get('/device/:deviceId/latest', async (req, res) => {
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
router.get('/device/:deviceId/stats', async (req, res) => {
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
 * Delete a reading
 * DELETE /api/readings/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const result = await bloodPressureLogger.deleteReading(req.params.id);
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

module.exports = router;
