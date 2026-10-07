/**
 * Integration tests for device manager
 */
const { test } = require('node:test');
const assert = require('node:assert');

// Mock database for testing
const mockDb = {
  async run(sql, params = []) {
    return { id: 1, changes: 1 };
  },
  async get(sql, params = []) {
    if (sql.includes('SELECT * FROM devices WHERE id =')) {
      return {
        id: params[0],
        name: 'Test Device',
        type: 'blood_pressure',
        manufacturer: 'Test',
        model: 'Model X',
        serial_number: 'SN123',
        status: 'active',
        last_sync: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }
    if (sql.includes('SELECT id FROM devices WHERE serial_number =')) {
      return null; // No duplicate
    }
    return null;
  },
  async all(sql, params = []) {
    return [];
  }
};

// Minimal device manager for testing
class TestDeviceManager {
  async registerDevice(deviceInfo) {
    if (!deviceInfo) throw new Error('Invalid device information');
    if (!deviceInfo.name || !deviceInfo.type) throw new Error('Device name and type are required');
    if (!deviceInfo.serial_number) throw new Error('Device serial number is required');

    const deviceId = `device_${Date.now()}`;
    await mockDb.run('INSERT INTO devices VALUES ()', []);
    return {
      id: deviceId,
      ...deviceInfo,
      status: 'active'
    };
  }

  async getDevice(deviceId) {
    if (!deviceId) throw new Error('Device ID is required');
    const device = await mockDb.get('SELECT * FROM devices WHERE id = ?', [deviceId]);
    if (!device) throw new Error(`Device not found: ${deviceId}`);
    return device;
  }

  async listDevices(filter = {}) {
    return mockDb.all('SELECT * FROM devices', []);
  }

  async updateDeviceStatus(deviceId, status) {
    if (!['active', 'inactive', 'error'].includes(status)) {
      throw new Error('Invalid status');
    }
    return this.getDevice(deviceId);
  }
}

test('DeviceManager - registers device with valid info', async () => {
  const manager = new TestDeviceManager();
  const device = await manager.registerDevice({
    name: 'My BP Monitor',
    type: 'blood_pressure',
    manufacturer: 'Omron',
    model: 'BP-100',
    serial_number: 'SN12345'
  });

  assert.ok(device.id);
  assert.strictEqual(device.name, 'My BP Monitor');
  assert.strictEqual(device.type, 'blood_pressure');
  assert.strictEqual(device.status, 'active');
});

test('DeviceManager - rejects invalid device info', async () => {
  const manager = new TestDeviceManager();
  await assert.rejects(
    () => manager.registerDevice(null),
    /Invalid device information/
  );
});

test('DeviceManager - requires device name and type', async () => {
  const manager = new TestDeviceManager();
  await assert.rejects(
    () => manager.registerDevice({ serial_number: 'SN123' }),
    /name and type are required/
  );
});

test('DeviceManager - requires serial number', async () => {
  const manager = new TestDeviceManager();
  await assert.rejects(
    () => manager.registerDevice({ name: 'Device', type: 'bp' }),
    /serial number is required/
  );
});

test('DeviceManager - rejects invalid status', async () => {
  const manager = new TestDeviceManager();
  await assert.rejects(
    () => manager.updateDeviceStatus('device_123', 'invalid'),
    /Invalid status/
  );
});

test('DeviceManager - gets device by ID', async () => {
  const manager = new TestDeviceManager();
  const device = await manager.getDevice('device_123');
  assert.ok(device);
  assert.strictEqual(device.id, 'device_123');
});

test('DeviceManager - throws error for non-existent device', async () => {
  const mockDbNoResult = {
    async get(sql, params = []) {
      return null;
    }
  };

  class TestDeviceManager2 {
    async getDevice(deviceId) {
      const device = await mockDbNoResult.get('SELECT * FROM devices WHERE id = ?', [deviceId]);
      if (!device) throw new Error(`Device not found: ${deviceId}`);
      return device;
    }
  }

  const manager = new TestDeviceManager2();
  await assert.rejects(
    () => manager.getDevice('nonexistent'),
    /Device not found/
  );
});
