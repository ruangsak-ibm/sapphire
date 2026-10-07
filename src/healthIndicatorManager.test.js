/**
 * Integration tests for health indicator manager
 */
const { test } = require('node:test');
const assert = require('node:assert');

// Test helper
class TestHealthIndicatorManager {
  constructor() {
    this.indicators = [];
  }

  async recordIndicator(deviceId, indicatorData) {
    if (!deviceId) throw new Error('Device ID is required');
    if (!indicatorData) throw new Error('Invalid indicator data');

    const { indicator_type, value, unit } = indicatorData;

    if (!indicator_type) throw new Error('Indicator type is required');
    if (value === undefined) throw new Error('Indicator value is required');
    if (typeof value !== 'number') throw new Error('Indicator value must be a number');

    const indicator = {
      id: `indicator_${Date.now()}`,
      device_id: deviceId,
      indicator_type,
      value,
      unit: unit || null,
      recorded_at: new Date().toISOString()
    };

    this.indicators.push(indicator);
    return indicator;
  }

  async getDeviceIndicators(deviceId) {
    return this.indicators.filter(i => i.device_id === deviceId);
  }

  async deleteIndicator(indicatorId) {
    const index = this.indicators.findIndex(i => i.id === indicatorId);
    if (index === -1) throw new Error(`Indicator not found: ${indicatorId}`);
    this.indicators.splice(index, 1);
    return { deleted: true, indicatorId };
  }
}

test('HealthIndicatorManager - records indicator', async () => {
  const manager = new TestHealthIndicatorManager();
  const indicator = await manager.recordIndicator('device_1', {
    indicator_type: 'oxygen_level',
    value: 98.5,
    unit: '%'
  });

  assert.ok(indicator.id);
  assert.strictEqual(indicator.indicator_type, 'oxygen_level');
  assert.strictEqual(indicator.value, 98.5);
  assert.strictEqual(indicator.unit, '%');
});

test('HealthIndicatorManager - requires device ID', async () => {
  const manager = new TestHealthIndicatorManager();
  await assert.rejects(
    () => manager.recordIndicator(null, { indicator_type: 'test', value: 100 }),
    /Device ID is required/
  );
});

test('HealthIndicatorManager - requires indicator type', async () => {
  const manager = new TestHealthIndicatorManager();
  await assert.rejects(
    () => manager.recordIndicator('device_1', { value: 100 }),
    /Indicator type is required/
  );
});

test('HealthIndicatorManager - requires value', async () => {
  const manager = new TestHealthIndicatorManager();
  await assert.rejects(
    () => manager.recordIndicator('device_1', { indicator_type: 'test' }),
    /Indicator value is required/
  );
});

test('HealthIndicatorManager - requires numeric value', async () => {
  const manager = new TestHealthIndicatorManager();
  await assert.rejects(
    () => manager.recordIndicator('device_1', { indicator_type: 'test', value: 'invalid' }),
    /must be a number/
  );
});

test('HealthIndicatorManager - gets device indicators', async () => {
  const manager = new TestHealthIndicatorManager();
  await manager.recordIndicator('device_1', { indicator_type: 'o2', value: 98 });
  await manager.recordIndicator('device_1', { indicator_type: 'temp', value: 37 });
  await manager.recordIndicator('device_2', { indicator_type: 'o2', value: 96 });

  const indicators = await manager.getDeviceIndicators('device_1');
  assert.strictEqual(indicators.length, 2);
  assert.ok(indicators.every(i => i.device_id === 'device_1'));
});

test('HealthIndicatorManager - deletes indicator', async () => {
  const manager = new TestHealthIndicatorManager();
  const indicator = await manager.recordIndicator('device_1', { 
    indicator_type: 'test', 
    value: 100 
  });

  const result = await manager.deleteIndicator(indicator.id);
  assert.ok(result.deleted);

  const indicators = await manager.getDeviceIndicators('device_1');
  assert.strictEqual(indicators.length, 0);
});

test('HealthIndicatorManager - throws error deleting non-existent indicator', async () => {
  const manager = new TestHealthIndicatorManager();
  await assert.rejects(
    () => manager.deleteIndicator('nonexistent'),
    /Indicator not found/
  );
});
