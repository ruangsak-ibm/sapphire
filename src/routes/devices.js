/**
 * Express API routes for device management
 */
const express = require('express');
const deviceManager = require('../deviceManager');

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

module.exports = router;
