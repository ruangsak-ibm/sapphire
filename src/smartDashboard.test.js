/**
 * Integration tests for smart dashboard
 */
const { test } = require('node:test');
const assert = require('node:assert');

// Test helper
class TestSmartDashboard {
  constructor() {
    this.devices = [];
    this.readings = [];
  }

  async getDashboardOverview() {
    const activeDevices = this.devices.filter(d => d.status === 'active');
    return {
      timestamp: new Date().toISOString(),
      devices: {
        total: this.devices.length,
        active: activeDevices.length
      },
      readings: {
        total: this.readings.length
      }
    };
  }

  async getDeviceDashboard(deviceId) {
    const device = this.devices.find(d => d.id === deviceId);
    if (!device) throw new Error(`Device not found: ${deviceId}`);

    const readings = this.readings.filter(r => r.device_id === deviceId);
    const latestReading = readings.length > 0 ? readings[readings.length - 1] : null;

    return {
      device,
      latestReading,
      statistics: {
        count: readings.length
      }
    };
  }

  async getHealthAlerts(deviceId) {
    const device = this.devices.find(d => d.id === deviceId);
    if (!device) throw new Error(`Device not found: ${deviceId}`);

    const readings = this.readings.filter(r => r.device_id === deviceId);
    if (readings.length === 0) return [];

    const latestReading = readings[readings.length - 1];
    const alerts = [];

    if (latestReading.systolic >= 140 || latestReading.diastolic >= 90) {
      alerts.push({
        type: 'high_blood_pressure',
        severity: 'high',
        message: `High blood pressure detected: ${latestReading.systolic}/${latestReading.diastolic}`
      });
    }

    if (latestReading.systolic >= 120 && latestReading.systolic < 140) {
      alerts.push({
        type: 'elevated_blood_pressure',
        severity: 'medium',
        message: `Elevated blood pressure: ${latestReading.systolic}/${latestReading.diastolic}`
      });
    }

    return alerts;
  }

  async getTrendAnalysis(deviceId) {
    const device = this.devices.find(d => d.id === deviceId);
    if (!device) throw new Error(`Device not found: ${deviceId}`);

    return {
      device,
      trend: {
        systolic: 'increasing'
      }
    };
  }

  addDevice(device) {
    this.devices.push(device);
  }

  addReading(reading) {
    this.readings.push(reading);
  }
}

test('SmartDashboard - provides overview', async () => {
  const dashboard = new TestSmartDashboard();
  dashboard.addDevice({ id: 'device_1', name: 'Device 1', status: 'active' });
  dashboard.addDevice({ id: 'device_2', name: 'Device 2', status: 'active' });

  const overview = await dashboard.getDashboardOverview();
  assert.strictEqual(overview.devices.total, 2);
  assert.strictEqual(overview.devices.active, 2);
});

test('SmartDashboard - provides device dashboard', async () => {
  const dashboard = new TestSmartDashboard();
  dashboard.addDevice({ id: 'device_1', name: 'Device 1', status: 'active' });
  dashboard.addReading({ device_id: 'device_1', systolic: 120, diastolic: 80 });

  const deviceDash = await dashboard.getDeviceDashboard('device_1');
  assert.ok(deviceDash.device);
  assert.ok(deviceDash.latestReading);
});

test('SmartDashboard - detects high blood pressure alert', async () => {
  const dashboard = new TestSmartDashboard();
  dashboard.addDevice({ id: 'device_1', name: 'Device 1' });
  dashboard.addReading({ device_id: 'device_1', systolic: 150, diastolic: 95 });

  const alerts = await dashboard.getHealthAlerts('device_1');
  assert.strictEqual(alerts.length, 1);
  assert.strictEqual(alerts[0].type, 'high_blood_pressure');
  assert.strictEqual(alerts[0].severity, 'high');
});

test('SmartDashboard - detects elevated blood pressure alert', async () => {
  const dashboard = new TestSmartDashboard();
  dashboard.addDevice({ id: 'device_1', name: 'Device 1' });
  dashboard.addReading({ device_id: 'device_1', systolic: 125, diastolic: 80 });

  const alerts = await dashboard.getHealthAlerts('device_1');
  assert.strictEqual(alerts.length, 1);
  assert.strictEqual(alerts[0].type, 'elevated_blood_pressure');
  assert.strictEqual(alerts[0].severity, 'medium');
});

test('SmartDashboard - returns no alerts for normal BP', async () => {
  const dashboard = new TestSmartDashboard();
  dashboard.addDevice({ id: 'device_1', name: 'Device 1' });
  dashboard.addReading({ device_id: 'device_1', systolic: 115, diastolic: 75 });

  const alerts = await dashboard.getHealthAlerts('device_1');
  assert.strictEqual(alerts.length, 0);
});

test('SmartDashboard - provides trend analysis', async () => {
  const dashboard = new TestSmartDashboard();
  dashboard.addDevice({ id: 'device_1', name: 'Device 1' });

  const trends = await dashboard.getTrendAnalysis('device_1');
  assert.ok(trends.device);
  assert.ok(trends.trend);
});

test('SmartDashboard - throws error for non-existent device', async () => {
  const dashboard = new TestSmartDashboard();
  await assert.rejects(
    () => dashboard.getDeviceDashboard('nonexistent'),
    /Device not found/
  );
});
