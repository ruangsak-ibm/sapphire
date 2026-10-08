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
    // Handle duplicate reading error specifically
    if (error.message && error.message.includes('Duplicate reading')) {
      return res.status(409).json({
        success: false,
        error: error.message
      });
    }
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
