/**
 * Integration tests for health indicator manager - tests the real implementation
 */
const { test } = require('node:test');
const assert = require('node:assert');
const database = require('./database');
const deviceManager = require('./deviceManager');
const healthIndicatorManager = require('./healthIndicatorManager');

// Initialize database before tests
test('HealthIndicatorManager - setup database', async () => {
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
    serial_number: 'SN_HIM_' + Date.now() + '_' + Math.random()
  });
}

test('HealthIndicatorManager - records indicator', async () => {
  const device = await createTestDevice('HIM Test Device 1');
  
  const indicator = await healthIndicatorManager.recordIndicator(device.id, {
    indicator_type: 'oxygen_level',
    value: 98.5,
    unit: '%'
  });

  assert.ok(indicator.id);
  assert.ok(indicator.id.startsWith('indicator_'));
  assert.strictEqual(indicator.indicator_type, 'oxygen_level');
  assert.strictEqual(indicator.value, 98.5);
  assert.strictEqual(indicator.unit, '%');
  assert.strictEqual(indicator.device_id, device.id);
});

test('HealthIndicatorManager - requires device ID', async () => {
  await assert.rejects(
    () => healthIndicatorManager.recordIndicator(null, { indicator_type: 'test', value: 100 }),
    /Device ID is required/
  );
});

test('HealthIndicatorManager - requires valid device', async () => {
  await assert.rejects(
    () => healthIndicatorManager.recordIndicator('nonexistent_device', { indicator_type: 'test', value: 100 }),
    /Device not found/
  );
});

test('HealthIndicatorManager - requires indicator type', async () => {
  const device = await createTestDevice('HIM Test Device 2');
  
  await assert.rejects(
    () => healthIndicatorManager.recordIndicator(device.id, { value: 100 }),
    /Indicator type is required/
  );
});

test('HealthIndicatorManager - requires value', async () => {
  const device = await createTestDevice('HIM Test Device 3');
  
  await assert.rejects(
    () => healthIndicatorManager.recordIndicator(device.id, { indicator_type: 'test' }),
    /Indicator value is required/
  );
});

test('HealthIndicatorManager - requires numeric value', async () => {
  const device = await createTestDevice('HIM Test Device 4');
  
  await assert.rejects(
    () => healthIndicatorManager.recordIndicator(device.id, { indicator_type: 'test', value: 'invalid' }),
    /must be a number/
  );
});

test('HealthIndicatorManager - gets indicator by ID', async () => {
  const device = await createTestDevice('HIM Test Device 5');
  
  const recorded = await healthIndicatorManager.recordIndicator(device.id, {
    indicator_type: 'oxygen_level',
    value: 97.5,
    unit: '%'
  });

  const indicator = await healthIndicatorManager.getIndicator(recorded.id);
  assert.ok(indicator);
  assert.strictEqual(indicator.id, recorded.id);
  assert.strictEqual(indicator.value, 97.5);
});

test('HealthIndicatorManager - throws error for non-existent indicator', async () => {
  await assert.rejects(
    () => healthIndicatorManager.getIndicator('nonexistent_indicator'),
    /Indicator not found/
  );
});

test('HealthIndicatorManager - gets device indicators', async () => {
  const device = await createTestDevice('HIM Test Device 6');
  
  await healthIndicatorManager.recordIndicator(device.id, { indicator_type: 'o2', value: 98 });
  await healthIndicatorManager.recordIndicator(device.id, { indicator_type: 'temp', value: 37 });
  
  const indicators = await healthIndicatorManager.getDeviceIndicators(device.id);
  assert.ok(Array.isArray(indicators));
  assert.ok(indicators.length >= 2);
  assert.ok(indicators.every(i => i.device_id === device.id));
});

test('HealthIndicatorManager - filters indicators by type', async () => {
  const device = await createTestDevice('HIM Test Device 7');
  
  await healthIndicatorManager.recordIndicator(device.id, { indicator_type: 'o2', value: 98 });
  await healthIndicatorManager.recordIndicator(device.id, { indicator_type: 'temp', value: 37 });
  
  const o2Indicators = await healthIndicatorManager.getDeviceIndicators(device.id, { 
    indicator_type: 'o2' 
  });
  
  assert.ok(o2Indicators.every(i => i.indicator_type === 'o2'));
});

test('HealthIndicatorManager - limits results', async () => {
  const device = await createTestDevice('HIM Test Device 8');
  
  for (let i = 0; i < 5; i++) {
    await healthIndicatorManager.recordIndicator(device.id, { indicator_type: 'o2', value: 98 + i });
  }
  
  const indicators = await healthIndicatorManager.getDeviceIndicators(device.id, { limit: 2 });
  assert.ok(indicators.length <= 2);
});

test('HealthIndicatorManager - deletes indicator', async () => {
  const device = await createTestDevice('HIM Test Device 9');
  
  const indicator = await healthIndicatorManager.recordIndicator(device.id, {
    indicator_type: 'test',
    value: 100
  });

  const result = await healthIndicatorManager.deleteIndicator(indicator.id);
  assert.ok(result.deleted);
  assert.strictEqual(result.indicatorId, indicator.id);

  // Verify indicator is deleted
  await assert.rejects(
    () => healthIndicatorManager.getIndicator(indicator.id),
    /Indicator not found/
  );
});

test('HealthIndicatorManager - throws error deleting non-existent indicator', async () => {
  await assert.rejects(
    () => healthIndicatorManager.deleteIndicator('nonexistent'),
    /Indicator not found/
  );
});
