/**
 * Integration tests for smart dashboard - tests the real implementation
 */
const { test } = require('node:test');
const assert = require('node:assert');
const database = require('./database');
const deviceManager = require('./deviceManager');
const bloodPressureLogger = require('./bloodPressureLogger');
const smartDashboard = require('./smartDashboard');

// Initialize database before tests
test('SmartDashboard - setup database', async () => {
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
    serial_number: 'SN_SD_' + Date.now() + '_' + Math.random()
  });
}

test('SmartDashboard - provides overview', async () => {
  const overview = await smartDashboard.getDashboardOverview();
  
  assert.ok(overview.timestamp);
  assert.ok(overview.devices);
  assert.strictEqual(typeof overview.devices.total, 'number');
  assert.strictEqual(typeof overview.devices.active, 'number');
  assert.ok(overview.readings);
});

test('SmartDashboard - provides device dashboard', async () => {
  const device = await createTestDevice('SD Test Device 1');
  await bloodPressureLogger.recordReading(device.id, { systolic: 120, diastolic: 80 });
  
  const dashboard = await smartDashboard.getDeviceDashboard(device.id);
  
  assert.ok(dashboard.device);
  assert.strictEqual(dashboard.device.id, device.id);
  assert.ok(dashboard.statistics);
});

test('SmartDashboard - handles device without readings', async () => {
  const device = await createTestDevice('SD Test Device 2');
  
  const dashboard = await smartDashboard.getDeviceDashboard(device.id);
  assert.ok(dashboard.device);
  assert.strictEqual(dashboard.latestReading, null);
});

test('SmartDashboard - throws error for non-existent device', async () => {
  await assert.rejects(
    () => smartDashboard.getDeviceDashboard('nonexistent_device'),
    /Device not found/
  );
});

test('SmartDashboard - detects hypertensive crisis alert', async () => {
  const device = await createTestDevice('SD Test Device 3');
  await bloodPressureLogger.recordReading(device.id, { systolic: 190, diastolic: 125 });
  
  const alerts = await smartDashboard.getHealthAlerts(device.id);
  
  assert.ok(Array.isArray(alerts));
  assert.ok(alerts.length > 0);
  const crisisAlert = alerts.find(a => a.type === 'hypertensive_crisis');
  assert.ok(crisisAlert, 'should have hypertensive crisis alert');
  assert.strictEqual(crisisAlert.severity, 'critical');
});

test('SmartDashboard - detects high blood pressure alert', async () => {
  const device = await createTestDevice('SD Test Device 4');
  await bloodPressureLogger.recordReading(device.id, { systolic: 150, diastolic: 95 });
  
  const alerts = await smartDashboard.getHealthAlerts(device.id);
  
  const highAlert = alerts.find(a => a.type === 'high_blood_pressure');
  assert.ok(highAlert, 'should have high blood pressure alert');
  assert.strictEqual(highAlert.severity, 'high');
});

test('SmartDashboard - detects elevated blood pressure alert', async () => {
  const device = await createTestDevice('SD Test Device 5');
  await bloodPressureLogger.recordReading(device.id, { systolic: 125, diastolic: 79 });
  
  const alerts = await smartDashboard.getHealthAlerts(device.id);
  
  const elevatedAlert = alerts.find(a => a.type === 'elevated_blood_pressure');
  assert.ok(elevatedAlert, 'should have elevated blood pressure alert');
  assert.strictEqual(elevatedAlert.severity, 'medium');
});

test('SmartDashboard - detects low blood pressure alert', async () => {
  const device = await createTestDevice('SD Test Device 6');
  await bloodPressureLogger.recordReading(device.id, { systolic: 85, diastolic: 55 });
  
  const alerts = await smartDashboard.getHealthAlerts(device.id);
  
  const lowAlert = alerts.find(a => a.type === 'low_blood_pressure');
  assert.ok(lowAlert, 'should have low blood pressure alert');
  assert.strictEqual(lowAlert.severity, 'high');
});

test('SmartDashboard - detects high pulse alert', async () => {
  const device = await createTestDevice('SD Test Device 7');
  await bloodPressureLogger.recordReading(device.id, { 
    systolic: 120, 
    diastolic: 80,
    pulse: 110
  });
  
  const alerts = await smartDashboard.getHealthAlerts(device.id);
  
  const pulseAlert = alerts.find(a => a.type === 'high_pulse');
  assert.ok(pulseAlert, 'should have high pulse alert');
});

test('SmartDashboard - detects low pulse alert', async () => {
  const device = await createTestDevice('SD Test Device 8');
  await bloodPressureLogger.recordReading(device.id, {
    systolic: 120,
    diastolic: 80,
    pulse: 50
  });
  
  const alerts = await smartDashboard.getHealthAlerts(device.id);
  
  const pulseAlert = alerts.find(a => a.type === 'low_pulse');
  assert.ok(pulseAlert, 'should have low pulse alert');
});

test('SmartDashboard - returns no alerts for normal BP', async () => {
  const device = await createTestDevice('SD Test Device 9');
  await bloodPressureLogger.recordReading(device.id, { systolic: 115, diastolic: 75 });
  
  const alerts = await smartDashboard.getHealthAlerts(device.id);
  
  assert.strictEqual(alerts.length, 0, 'normal BP should have no alerts');
});

test('SmartDashboard - returns no alerts for device with no readings', async () => {
  const device = await createTestDevice('SD Test Device 10');
  
  const alerts = await smartDashboard.getHealthAlerts(device.id);
  
  assert.strictEqual(alerts.length, 0);
});

test('SmartDashboard - provides trend analysis', async () => {
  const device = await createTestDevice('SD Test Device 11');
  
  await bloodPressureLogger.recordReading(device.id, { systolic: 120, diastolic: 80 });
  await bloodPressureLogger.recordReading(device.id, { systolic: 125, diastolic: 82 });
  await bloodPressureLogger.recordReading(device.id, { systolic: 130, diastolic: 85 });
  
  const trends = await smartDashboard.getTrendAnalysis(device.id, '7d');
  
  assert.ok(trends.device);
  assert.strictEqual(trends.device.id, device.id);
  assert.ok(trends.statistics);
  assert.ok(trends.trend);
  assert.ok(trends.analysis);
});

test('SmartDashboard - exports readings as JSON', async () => {
  const device = await createTestDevice('SD Test Device 12');
  
  await bloodPressureLogger.recordReading(device.id, { systolic: 120, diastolic: 80 });
  await bloodPressureLogger.recordReading(device.id, { systolic: 130, diastolic: 85 });
  
  const data = await smartDashboard.exportReadings(device.id, 'json');
  
  assert.ok(data.device);
  assert.strictEqual(data.device.id, device.id);
  assert.ok(Array.isArray(data.readings));
  assert.ok(data.readings.length >= 2);
});

test('SmartDashboard - exports readings as CSV', async () => {
  const device = await createTestDevice('SD Test Device 13');
  
  await bloodPressureLogger.recordReading(device.id, { systolic: 120, diastolic: 80 });
  
  const csv = await smartDashboard.exportReadings(device.id, 'csv');
  
  assert.ok(typeof csv === 'string');
  assert.ok(csv.includes('Systolic'));
  assert.ok(csv.includes('120'));
});

test('SmartDashboard - rejects invalid export format', async () => {
  const device = await createTestDevice('SD Test Device 14');
  
  await assert.rejects(
    () => smartDashboard.exportReadings(device.id, 'invalid'),
    /Format must be json or csv/
  );
});
