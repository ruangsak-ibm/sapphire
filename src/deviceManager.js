/**
 * Device management and synchronization
 */
const database = require('./database');
const { generateId } = require('./utils');
const { ValidationError, NotFoundError, ConflictError } = require('./errors');

class DeviceManager {
  /**
   * Register a new blood pressure device
   */
  async registerDevice(deviceInfo) {
    if (!deviceInfo || typeof deviceInfo !== 'object') {
      throw new ValidationError('Invalid device information');
    }

    const { name, type, manufacturer, model, serial_number } = deviceInfo;

    if (!name || !type) {
      throw new ValidationError('Device name and type are required');
    }

    if (!serial_number) {
      throw new ValidationError('Device serial number is required');
    }

    const deviceId = generateId('device');

    // Use atomic transaction to check for duplicates and insert
    // This prevents race conditions where two devices with the same serial number could be created
    await database.transaction(async () => {
      // Check for duplicate serial number
      const existing = await database.get(
        'SELECT id FROM devices WHERE serial_number = ?',
        [serial_number]
      );

      if (existing) {
        throw new ConflictError('Device with this serial number already exists');
      }

      // Insert the device
      await database.run(
        `INSERT INTO devices (id, name, type, manufacturer, model, serial_number, status)
         VALUES (?, ?, ?, ?, ?, ?, 'active')`,
        [deviceId, name, type, manufacturer || null, model || null, serial_number]
      );
    });

    return this.getDevice(deviceId);
  }

  /**
   * Get device by ID
   */
  async getDevice(deviceId) {
    if (!deviceId) {
      throw new ValidationError('Device ID is required');
    }

    const device = await database.get(
      'SELECT * FROM devices WHERE id = ?',
      [deviceId]
    );

    if (!device) {
      throw new NotFoundError(`Device not found: ${deviceId}`);
    }

    return device;
  }

  /**
   * List all registered devices
   */
  async listDevices(filter = {}) {
    let sql = 'SELECT * FROM devices WHERE 1=1';
    const params = [];

    if (filter.status) {
      sql += ' AND status = ?';
      params.push(filter.status);
    }

    sql += ' ORDER BY created_at DESC';

    return database.all(sql, params);
  }

  /**
   * Update device last sync time
   */
  async updateLastSync(deviceId, timestamp = null) {
    if (!deviceId) {
      throw new ValidationError('Device ID is required');
    }

    const syncTime = timestamp || new Date().toISOString();

    await database.run(
      'UPDATE devices SET last_sync = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [syncTime, deviceId]
    );

    return this.getDevice(deviceId);
  }

  /**
   * Update device status
   */
  async updateDeviceStatus(deviceId, status) {
    if (!deviceId) {
      throw new ValidationError('Device ID is required');
    }

    if (!['active', 'inactive', 'error'].includes(status)) {
      throw new ValidationError('Invalid status. Must be one of: active, inactive, error');
    }

    await database.run(
      'UPDATE devices SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, deviceId]
    );

    return this.getDevice(deviceId);
  }

  /**
   * Remove a device
   */
  async removeDevice(deviceId) {
    if (!deviceId) {
      throw new ValidationError('Device ID is required');
    }

    const device = await this.getDevice(deviceId);

    // Delete associated readings
    await database.run(
      'DELETE FROM blood_pressure_readings WHERE device_id = ?',
      [deviceId]
    );

    // Delete associated health indicators
    await database.run(
      'DELETE FROM health_indicators WHERE device_id = ?',
      [deviceId]
    );

    // Delete device
    await database.run(
      'DELETE FROM devices WHERE id = ?',
      [deviceId]
    );

    return { deleted: true, deviceId };
  }
}

module.exports = new DeviceManager();
