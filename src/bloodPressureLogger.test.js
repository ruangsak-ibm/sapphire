/**
 * Integration tests for blood pressure logger
 */
const { test } = require('node:test');
const assert = require('node:assert');

// Test helper
class TestBloodPressureLogger {
  constructor() {
    this.readings = [];
  }

  async recordReading(deviceId, readingData) {
    if (!deviceId) throw new Error('Device ID is required');
    if (!readingData) throw new Error('Invalid reading data');

    const { systolic, diastolic, pulse } = readingData;

    if (systolic === undefined || diastolic === undefined) {
      throw new Error('Systolic and diastolic readings are required');
    }

    if (systolic < 0 || systolic > 300) {
      throw new Error('Systolic must be between 0 and 300 mmHg');
    }

    if (diastolic < 0 || diastolic > 200) {
      throw new Error('Diastolic must be between 0 and 200 mmHg');
    }

    if (systolic < diastolic) {
      throw new Error('Systolic must be greater than or equal to diastolic');
    }

    if (pulse !== undefined && (pulse < 0 || pulse > 300)) {
      throw new Error('Pulse must be between 0 and 300 bpm');
    }

    const reading = {
      id: `reading_${Date.now()}`,
      device_id: deviceId,
      systolic,
      diastolic,
      pulse: pulse || null,
      measurement_time: readingData.measurement_time || new Date().toISOString()
    };

    this.readings.push(reading);
    return reading;
  }

  async getLatestReading(deviceId) {
    const deviceReadings = this.readings.filter(r => r.device_id === deviceId);
    if (deviceReadings.length === 0) return null;
    return deviceReadings[deviceReadings.length - 1];
  }

  async getDeviceReadings(deviceId) {
    return this.readings.filter(r => r.device_id === deviceId);
  }

  _parseTimeframe(timeframe) {
    const match = timeframe.match(/^(\d+)([dhm])$/);
    if (!match) throw new Error('Invalid timeframe format');
    const value = parseInt(match[1]);
    const unit = match[2];
    switch (unit) {
      case 'd': return value;
      case 'h': return value / 24;
      case 'm': return value / (24 * 60);
      default: throw new Error('Invalid timeframe unit');
    }
  }

  async getReadingStatistics(deviceId, timeframe = '7d') {
    const readings = this.readings.filter(r => r.device_id === deviceId);
    if (readings.length === 0) {
      return {
        count: 0,
        systolic: null,
        diastolic: null,
        pulse: null
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
      }
    };
  }
}

test('BloodPressureLogger - records valid reading', async () => {
  const logger = new TestBloodPressureLogger();
  const reading = await logger.recordReading('device_1', {
    systolic: 120,
    diastolic: 80,
    pulse: 70
  });

  assert.ok(reading.id);
  assert.strictEqual(reading.systolic, 120);
  assert.strictEqual(reading.diastolic, 80);
  assert.strictEqual(reading.pulse, 70);
});

test('BloodPressureLogger - rejects missing systolic/diastolic', async () => {
  const logger = new TestBloodPressureLogger();
  await assert.rejects(
    () => logger.recordReading('device_1', { systolic: 120 }),
    /Systolic and diastolic readings are required/
  );
});

test('BloodPressureLogger - rejects out-of-range systolic', async () => {
  const logger = new TestBloodPressureLogger();
  await assert.rejects(
    () => logger.recordReading('device_1', { systolic: 400, diastolic: 80 }),
    /Systolic must be between/
  );
});

test('BloodPressureLogger - rejects out-of-range diastolic', async () => {
  const logger = new TestBloodPressureLogger();
  await assert.rejects(
    () => logger.recordReading('device_1', { systolic: 120, diastolic: 250 }),
    /Diastolic must be between/
  );
});

test('BloodPressureLogger - rejects invalid pulse', async () => {
  const logger = new TestBloodPressureLogger();
  await assert.rejects(
    () => logger.recordReading('device_1', { systolic: 120, diastolic: 80, pulse: 400 }),
    /Pulse must be between/
  );
});

test('BloodPressureLogger - gets latest reading', async () => {
  const logger = new TestBloodPressureLogger();
  await logger.recordReading('device_1', { systolic: 120, diastolic: 80 });
  await logger.recordReading('device_1', { systolic: 130, diastolic: 85 });

  const latest = await logger.getLatestReading('device_1');
  assert.strictEqual(latest.systolic, 130);
});

test('BloodPressureLogger - calculates statistics', async () => {
  const logger = new TestBloodPressureLogger();
  await logger.recordReading('device_1', { systolic: 120, diastolic: 80 });
  await logger.recordReading('device_1', { systolic: 130, diastolic: 85 });
  await logger.recordReading('device_1', { systolic: 110, diastolic: 75 });

  const stats = await logger.getReadingStatistics('device_1');
  assert.strictEqual(stats.count, 3);
  assert.strictEqual(stats.systolic.min, 110);
  assert.strictEqual(stats.systolic.max, 130);
  assert.strictEqual(stats.systolic.avg, 120);
});

test('BloodPressureLogger - returns empty stats for device with no readings', async () => {
  const logger = new TestBloodPressureLogger();
  const stats = await logger.getReadingStatistics('device_2');
  assert.strictEqual(stats.count, 0);
  assert.strictEqual(stats.systolic, null);
});
