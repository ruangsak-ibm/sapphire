/**
 * Express API routes for health indicators
 */
const express = require('express');
const healthIndicatorManager = require('../healthIndicatorManager');
const { ValidationError, NotFoundError } = require('../errors');

const router = express.Router();

/**
 * Record a new health indicator
 * POST /api/indicators
 */
router.post('/', async (req, res) => {
  try {
    const { device_id, ...indicatorData } = req.body;

    if (!device_id) {
      return res.status(400).json({
        success: false,
        error: 'device_id is required'
      });
    }

    const indicator = await healthIndicatorManager.recordIndicator(device_id, indicatorData);
    res.status(201).json({
      success: true,
      data: indicator
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }
    if (error instanceof ValidationError) {
      return res.status(400).json({
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
 * Get a specific indicator
 * GET /api/indicators/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const indicator = await healthIndicatorManager.getIndicator(req.params.id);
    res.json({
      success: true,
      data: indicator
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
 * Delete an indicator
 * DELETE /api/indicators/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const result = await healthIndicatorManager.deleteIndicator(req.params.id);
    res.json({
      success: true,
      data: result
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

module.exports = router;
