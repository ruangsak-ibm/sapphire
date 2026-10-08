/**
 * Blood pressure reading ingestion and logging
 */
const database = require('./database');
const deviceManager = require('./deviceManager');
const { generateId, validateBloodPressure } = require('./utils');
const { ValidationError, NotFoundError, ConflictError } = require('./errors');

class BloodPressureLogger {
  /**
   * Record a blood pressure reading from a device
   */
  async recordReading(deviceId, readingData) {
    if (!deviceId) {
      throw new ValidationError('Device ID is required');
    }

    if (!readingData || typeof readingData !== 'object') {
      throw new ValidationError('Invalid reading data');
    }

    // Verify device exists
    await deviceManager.getDevice(deviceId);

    const { systolic, diastolic, pulse, measurement_time, notes } = readingData;

    // Validate blood pressure values
    if (systolic === undefined || diastolic === undefined) {
      throw new ValidationError('Systolic and diastolic readings are required');
    }

    validateBloodPressure(systolic, diastolic);

    if (pulse !== undefined && (pulse < 0 || pulse > 300)) {
      throw new ValidationError('Pulse must be between 0 and 300 bpm');
    }

    const recordedTime = measurement_time || new Date().toISOString();
    const readingId = generateId('reading');

    // Use atomic transaction to check for duplicates and insert
    // This prevents race conditions where two identical readings could be recorded
    const result = await database.transaction(async () => {
      // Check for duplicate reading with exact same values within the last 5 minutes
      // to prevent re-sent readings from being stored twice
      const fiveMinutesAgo = new Date(new Date(recordedTime).getTime() - 5 * 60 * 1000).toISOString();
      const duplicate = await database.get(
        `SELECT id FROM blood_pressure_readings 
         WHERE device_id = ? AND systolic = ? AND diastolic = ? 
         AND measurement_time >= ? AND measurement_time <= ?`,
        [deviceId, systolic, diastolic, fiveMinutesAgo, recordedTime]
      );

      if (duplicate) {
        throw new ConflictError('Duplicate reading detected - this reading was already recorded');
      }

      // Insert the reading
      await database.run(
        `INSERT INTO blood_pressure_readings 
         (id, device_id, systolic, diastolic, pulse, measurement_time, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [readingId, deviceId, systolic, diastolic, pulse || null, recordedTime, notes || null]
      );

      // Update device last sync
      await deviceManager.updateLastSync(deviceId, recordedTime);

      return readingId;
    });

    return this.getReading(result);
  }

  /**
   * Get a single reading by ID
   */
  async getReading(readingId) {
    if (!readingId) {
      throw new ValidationError('Reading ID is required');
    }

    const reading = await database.get(
      'SELECT * FROM blood_pressure_readings WHERE id = ?',
      [readingId]
    );

    if (!reading) {
      throw new NotFoundError(`Reading not found: ${readingId}`);
    }

    return reading;
  }

  /**
   * Get readings for a device with optional filtering
   */
  async getDeviceReadings(deviceId, filter = {}) {
    if (!deviceId) {
      throw new ValidationError('Device ID is required');
    }

    // Verify device exists
    await deviceManager.getDevice(deviceId);

    let sql = 'SELECT * FROM blood_pressure_readings WHERE device_id = ?';
    const params = [deviceId];

    // Date range filtering
    if (filter.from_date) {
      sql += ' AND measurement_time >= ?';
      params.push(filter.from_date);
    }

    if (filter.to_date) {
      sql += ' AND measurement_time <= ?';
      params.push(filter.to_date);
    }

    // Limit results
    const limit = filter.limit ? Math.min(Math.abs(parseInt(filter.limit)) || 100, 1000) : 100;
    sql += ' ORDER BY measurement_time DESC LIMIT ?';
    params.push(limit);

    return database.all(sql, params);
  }

  /**
   * Get latest reading for a device
   */
  async getLatestReading(deviceId) {
    if (!deviceId) {
      throw new ValidationError('Device ID is required');
    }

    // Verify device exists
    await deviceManager.getDevice(deviceId);

    const reading = await database.get(
      `SELECT * FROM blood_pressure_readings 
       WHERE device_id = ? 
       ORDER BY measurement_time DESC 
       LIMIT 1`,
      [deviceId]
    );

    return reading || null;
  }

  /**
   * Calculate statistics for device readings
   */
  async getReadingStatistics(deviceId, timeframe = '7d') {
    if (!deviceId) {
      throw new ValidationError('Device ID is required');
    }

    // Verify device exists
    await deviceManager.getDevice(deviceId);

    // Parse timeframe
    const days = this._parseTimeframe(timeframe);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const readings = await database.all(
      `SELECT systolic, diastolic, pulse FROM blood_pressure_readings 
       WHERE device_id = ? AND measurement_time >= ?
       ORDER BY measurement_time ASC`,
      [deviceId, cutoffDate.toISOString()]
    );

    if (readings.length === 0) {
      return {
        count: 0,
        systolic: null,
        diastolic: null,
        pulse: null,
        timeframe,
        period_start: cutoffDate.toISOString()
      };
    }

    const systolicValues = readings.map(r => r.systolic);
    const diastolicValues = readings.map(r => r.diastolic);
    const pulseValues = readings.filter(r => r.pulse).map(r => r.pulse);

    return {
      count: readings.length,
      systolic: {
        min: Math.min(...systolicValues),
        max: Math.max(...systolicValues),
        avg: Math.round(systolicValues.reduce((a, b) => a + b) / systolicValues.length)
      },
      diastolic: {
        min: Math.min(...diastolicValues),
        max: Math.max(...diastolicValues),
        avg: Math.round(diastolicValues.reduce((a, b) => a + b) / diastolicValues.length)
      },
      pulse: pulseValues.length > 0 ? {
        min: Math.min(...pulseValues),
        max: Math.max(...pulseValues),
        avg: Math.round(pulseValues.reduce((a, b) => a + b) / pulseValues.length)
      } : null,
      timeframe,
      period_start: cutoffDate.toISOString(),
      period_end: new Date().toISOString()
    };
  }

  /**
   * Delete a reading (for data correction)
   */
  async deleteReading(readingId) {
    if (!readingId) {
      throw new ValidationError('Reading ID is required');
    }

    const reading = await this.getReading(readingId);

    await database.run(
      'DELETE FROM blood_pressure_readings WHERE id = ?',
      [readingId]
    );

    return { deleted: true, readingId };
  }

  _parseTimeframe(timeframe) {
    const match = timeframe.match(/^(\d+)([dhm])$/);
    if (!match) {
      throw new ValidationError('Invalid timeframe format. Use format like "7d", "30d", "24h"');
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 'd':
        return value;
      case 'h':
        return value / 24;
      case 'm':
        return value / (24 * 60);
      default:
        throw new ValidationError('Invalid timeframe unit');
    }
  }
}

module.exports = new BloodPressureLogger();
