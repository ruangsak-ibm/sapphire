/**
 * Integration tests for device manager - tests the real implementation
 */
const { test } = require('node:test');
const assert = require('node:assert');
const database = require('./database');
const deviceManager = require('./deviceManager');

// Initialize database before tests
test('DeviceManager - setup database', async () => {
  await database.initialize();
  assert.ok(true, 'database initialized');
});

test('DeviceManager - registers device with valid info', async () => {
  const device = await deviceManager.registerDevice({
    name: 'My BP Monitor',
    type: 'blood_pressure',
    manufacturer: 'Omron',
    model: 'BP-100',
    serial_number: 'SN_UNIQUE_REG_' + Date.now() + '_' + Math.random()
  });

  assert.ok(device.id);
  assert.ok(device.id.startsWith('device_'));
  assert.strictEqual(device.name, 'My BP Monitor');
  assert.strictEqual(device.type, 'blood_pressure');
  assert.strictEqual(device.status, 'active');
});

test('DeviceManager - rejects invalid device info', async () => {
  await assert.rejects(
    () => deviceManager.registerDevice(null),
    /Invalid device information/
  );
});

test('DeviceManager - requires device name and type', async () => {
  await assert.rejects(
    () => deviceManager.registerDevice({ serial_number: 'SN123' }),
    /name and type are required/
  );
});

test('DeviceManager - requires serial number', async () => {
  await assert.rejects(
    () => deviceManager.registerDevice({ name: 'Device', type: 'bp' }),
    /serial number is required/
  );
});

test('DeviceManager - prevents duplicate serial numbers', async () => {
  const serialNum = 'SN_UNIQUE_DUP_' + Date.now();
  
  // Register first device
  await deviceManager.registerDevice({
    name: 'Device 1',
    type: 'blood_pressure',
    serial_number: serialNum
  });

  // Try to register second device with same serial number
  await assert.rejects(
    () => deviceManager.registerDevice({
      name: 'Device 2',
      type: 'blood_pressure',
      serial_number: serialNum
    }),
    /already exists/
  );
});

test('DeviceManager - gets device by ID', async () => {
  const registered = await deviceManager.registerDevice({
    name: 'Retrievable Device',
    type: 'blood_pressure',
    serial_number: 'SN_RETRIEVE_' + Date.now()
  });

  const device = await deviceManager.getDevice(registered.id);
  assert.ok(device);
  assert.strictEqual(device.id, registered.id);
  assert.strictEqual(device.name, 'Retrievable Device');
});

test('DeviceManager - throws error for non-existent device', async () => {
  await assert.rejects(
    () => deviceManager.getDevice('nonexistent_device_id'),
    /Device not found/
  );
});

test('DeviceManager - lists devices', async () => {
  const devices = await deviceManager.listDevices();
  assert.ok(Array.isArray(devices));
  assert.ok(devices.length > 0, 'should have at least one device');
});

test('DeviceManager - filters devices by status', async () => {
  const activeDevices = await deviceManager.listDevices({ status: 'active' });
  assert.ok(Array.isArray(activeDevices));
  assert.ok(activeDevices.every(d => d.status === 'active'));
});

test('DeviceManager - updates device status', async () => {
  const device = await deviceManager.registerDevice({
    name: 'Status Test Device',
    type: 'blood_pressure',
    serial_number: 'SN_STATUS_' + Date.now()
  });

  const updated = await deviceManager.updateDeviceStatus(device.id, 'inactive');
  assert.strictEqual(updated.status, 'inactive');
});

test('DeviceManager - rejects invalid status', async () => {
  const device = await deviceManager.registerDevice({
    name: 'Invalid Status Device',
    type: 'blood_pressure',
    serial_number: 'SN_INVALID_STATUS_' + Date.now()
  });

  await assert.rejects(
    () => deviceManager.updateDeviceStatus(device.id, 'invalid_status'),
    /Invalid status/
  );
});

test('DeviceManager - updates last sync time', async () => {
  const device = await deviceManager.registerDevice({
    name: 'Sync Test Device',
    type: 'blood_pressure',
    serial_number: 'SN_SYNC_' + Date.now()
  });

  const syncTime = new Date().toISOString();
  const updated = await deviceManager.updateLastSync(device.id, syncTime);
  assert.strictEqual(updated.last_sync, syncTime);
});

test('DeviceManager - removes device', async () => {
  const device = await deviceManager.registerDevice({
    name: 'Device to Delete',
    type: 'blood_pressure',
    serial_number: 'SN_DELETE_' + Date.now()
  });

  const result = await deviceManager.removeDevice(device.id);
  assert.ok(result.deleted);
  assert.strictEqual(result.deviceId, device.id);

  // Verify device is deleted
  await assert.rejects(
    () => deviceManager.getDevice(device.id),
    /Device not found/
  );
});
