/**
 * Health indicator tracking and analysis
 */
const database = require('./database');
const deviceManager = require('./deviceManager');
const { generateId } = require('./utils');
const { ValidationError, NotFoundError } = require('./errors');

class HealthIndicatorManager {
  /**
   * Record a health indicator measurement
   */
  async recordIndicator(deviceId, indicatorData) {
    if (!deviceId) {
      throw new ValidationError('Device ID is required');
    }

    if (!indicatorData || typeof indicatorData !== 'object') {
      throw new ValidationError('Invalid indicator data');
    }

    // Verify device exists
    await deviceManager.getDevice(deviceId);

    const { indicator_type, value, unit } = indicatorData;

    if (!indicator_type) {
      throw new ValidationError('Indicator type is required');
    }

    if (value === undefined || value === null) {
      throw new ValidationError('Indicator value is required');
    }

    if (typeof value !== 'number') {
      throw new ValidationError('Indicator value must be a number');
    }

    const indicatorId = generateId('indicator');

    await database.run(
      `INSERT INTO health_indicators (id, device_id, indicator_type, value, unit)
       VALUES (?, ?, ?, ?, ?)`,
      [indicatorId, deviceId, indicator_type, value, unit || null]
    );

    return this.getIndicator(indicatorId);
  }

  /**
   * Get indicator by ID
   */
  async getIndicator(indicatorId) {
    if (!indicatorId) {
      throw new ValidationError('Indicator ID is required');
    }

    const indicator = await database.get(
      'SELECT * FROM health_indicators WHERE id = ?',
      [indicatorId]
    );

    if (!indicator) {
      throw new NotFoundError(`Indicator not found: ${indicatorId}`);
    }

    return indicator;
  }

  /**
   * Get all indicators for a device
   */
  async getDeviceIndicators(deviceId, filter = {}) {
    if (!deviceId) {
      throw new ValidationError('Device ID is required');
    }

    // Verify device exists
    await deviceManager.getDevice(deviceId);

    let sql = 'SELECT * FROM health_indicators WHERE device_id = ?';
    const params = [deviceId];

    if (filter.indicator_type) {
      sql += ' AND indicator_type = ?';
      params.push(filter.indicator_type);
    }

    if (filter.limit) {
      const limit = Math.min(Math.abs(parseInt(filter.limit)) || 100, 1000);
      sql += ' ORDER BY recorded_at DESC LIMIT ?';
      params.push(limit);
    } else {
      sql += ' ORDER BY recorded_at DESC';
    }

    return database.all(sql, params);
  }

  /**
   * Delete an indicator
   */
  async deleteIndicator(indicatorId) {
    if (!indicatorId) {
      throw new ValidationError('Indicator ID is required');
    }

    await this.getIndicator(indicatorId);

    await database.run(
      'DELETE FROM health_indicators WHERE id = ?',
      [indicatorId]
    );

    return { deleted: true, indicatorId };
  }
}

module.exports = new HealthIndicatorManager();
