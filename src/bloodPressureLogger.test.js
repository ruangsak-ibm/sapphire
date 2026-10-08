/**
 * Integration tests for blood pressure logger - tests the real implementation
 */
const { test } = require('node:test');
const assert = require('node:assert');
const database = require('./database');
const deviceManager = require('./deviceManager');
const bloodPressureLogger = require('./bloodPressureLogger');

// Initialize database before tests
test('BloodPressureLogger - setup database', async () => {
  await database.initialize();
  assert.ok(true, 'database initialized');
});

// Helper to create a test device
async function createTestDevice(name) {
  return deviceManager.registerDevice({
    name,
    type: 'blood_pressure',
    manufacturer: 'Test',
    model: 'Test Model',
    serial_number: 'SN_' + Date.now() + '_' + Math.random()
  });
}

test('BloodPressureLogger - records valid reading', async () => {
  const device = await createTestDevice('BP Logger Test Device 1');
  
  const reading = await bloodPressureLogger.recordReading(device.id, {
    systolic: 120,
    diastolic: 80,
    pulse: 70
  });

  assert.ok(reading.id);
  assert.ok(reading.id.startsWith('reading_'));
  assert.strictEqual(reading.systolic, 120);
  assert.strictEqual(reading.diastolic, 80);
  assert.strictEqual(reading.pulse, 70);
  assert.strictEqual(reading.device_id, device.id);
});

test('BloodPressureLogger - requires device ID', async () => {
  await assert.rejects(
    () => bloodPressureLogger.recordReading(null, { systolic: 120, diastolic: 80 }),
    /Device ID is required/
  );
});

test('BloodPressureLogger - requires valid device', async () => {
  await assert.rejects(
    () => bloodPressureLogger.recordReading('nonexistent_device', { systolic: 120, diastolic: 80 }),
    /Device not found/
  );
});

test('BloodPressureLogger - rejects missing systolic/diastolic', async () => {
  const device = await createTestDevice('BP Logger Test Device 2');
  
  await assert.rejects(
    () => bloodPressureLogger.recordReading(device.id, { systolic: 120 }),
    /Systolic and diastolic readings are required/
  );
});

test('BloodPressureLogger - rejects out-of-range systolic', async () => {
  const device = await createTestDevice('BP Logger Test Device 3');
  
  await assert.rejects(
    () => bloodPressureLogger.recordReading(device.id, { systolic: 400, diastolic: 80 }),
    /Systolic must be between/
  );
});

test('BloodPressureLogger - rejects out-of-range diastolic', async () => {
  const device = await createTestDevice('BP Logger Test Device 4');
  
  await assert.rejects(
    () => bloodPressureLogger.recordReading(device.id, { systolic: 120, diastolic: 250 }),
    /Diastolic must be between/
  );
});

test('BloodPressureLogger - rejects invalid pulse', async () => {
  const device = await createTestDevice('BP Logger Test Device 5');
  
  await assert.rejects(
    () => bloodPressureLogger.recordReading(device.id, { systolic: 120, diastolic: 80, pulse: 400 }),
    /Pulse must be between/
  );
});

test('BloodPressureLogger - rejects duplicate readings', async () => {
  const device = await createTestDevice('BP Logger Test Device 6');
  const timestamp = new Date().toISOString();
  
  // Record first reading
  await bloodPressureLogger.recordReading(device.id, {
    systolic: 120,
    diastolic: 80,
    pulse: 70,
    measurement_time: timestamp
  });

  // Try to record duplicate
  await assert.rejects(
    () => bloodPressureLogger.recordReading(device.id, {
      systolic: 120,
      diastolic: 80,
      pulse: 70,
      measurement_time: timestamp
    }),
    /Duplicate reading detected/
  );
});

test('BloodPressureLogger - gets reading by ID', async () => {
  const device = await createTestDevice('BP Logger Test Device 7');
  
  const recorded = await bloodPressureLogger.recordReading(device.id, {
    systolic: 130,
    diastolic: 85,
    pulse: 75
  });

  const reading = await bloodPressureLogger.getReading(recorded.id);
  assert.ok(reading);
  assert.strictEqual(reading.id, recorded.id);
  assert.strictEqual(reading.systolic, 130);
});

test('BloodPressureLogger - throws error for non-existent reading', async () => {
  await assert.rejects(
    () => bloodPressureLogger.getReading('nonexistent_reading'),
    /Reading not found/
  );
});

test('BloodPressureLogger - gets device readings', async () => {
  const device = await createTestDevice('BP Logger Test Device 8');
  
  await bloodPressureLogger.recordReading(device.id, { systolic: 120, diastolic: 80 });
  await bloodPressureLogger.recordReading(device.id, { systolic: 130, diastolic: 85 });
  
  const readings = await bloodPressureLogger.getDeviceReadings(device.id);
  assert.ok(Array.isArray(readings));
  assert.ok(readings.length >= 2);
  assert.ok(readings.every(r => r.device_id === device.id));
});

test('BloodPressureLogger - gets latest reading', async () => {
  const device = await createTestDevice('BP Logger Test Device 9');
  
  await bloodPressureLogger.recordReading(device.id, { systolic: 120, diastolic: 80 });
  await bloodPressureLogger.recordReading(device.id, { systolic: 130, diastolic: 85 });
  
  const latest = await bloodPressureLogger.getLatestReading(device.id);
  assert.ok(latest);
  assert.strictEqual(latest.systolic, 130);
  assert.strictEqual(latest.diastolic, 85);
});

test('BloodPressureLogger - returns null for no readings', async () => {
  const device = await createTestDevice('BP Logger Test Device 10');
  
  const latest = await bloodPressureLogger.getLatestReading(device.id);
  assert.strictEqual(latest, null);
});

test('BloodPressureLogger - calculates statistics', async () => {
  const device = await createTestDevice('BP Logger Test Device 11');
  
  await bloodPressureLogger.recordReading(device.id, { systolic: 120, diastolic: 80 });
  await bloodPressureLogger.recordReading(device.id, { systolic: 130, diastolic: 85 });
  await bloodPressureLogger.recordReading(device.id, { systolic: 110, diastolic: 75 });
  
  const stats = await bloodPressureLogger.getReadingStatistics(device.id, '7d');
  assert.strictEqual(stats.count, 3);
  assert.strictEqual(stats.systolic.min, 110);
  assert.strictEqual(stats.systolic.max, 130);
  assert.strictEqual(stats.systolic.avg, 120);
});

test('BloodPressureLogger - returns empty stats for device with no readings', async () => {
  const device = await createTestDevice('BP Logger Test Device 12');
  
  const stats = await bloodPressureLogger.getReadingStatistics(device.id, '7d');
  assert.strictEqual(stats.count, 0);
  assert.strictEqual(stats.systolic, null);
});

test('BloodPressureLogger - deletes reading', async () => {
  const device = await createTestDevice('BP Logger Test Device 13');
  
  const reading = await bloodPressureLogger.recordReading(device.id, {
    systolic: 120,
    diastolic: 80
  });

  const result = await bloodPressureLogger.deleteReading(reading.id);
  assert.ok(result.deleted);
  assert.strictEqual(result.readingId, reading.id);

  // Verify reading is deleted
  await assert.rejects(
    () => bloodPressureLogger.getReading(reading.id),
    /Reading not found/
  );
});
