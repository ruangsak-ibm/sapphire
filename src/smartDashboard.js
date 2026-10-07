/**
 * Smart dashboard data aggregation and insights
 */
const database = require('./database');
const deviceManager = require('./deviceManager');
const bloodPressureLogger = require('./bloodPressureLogger');
const healthIndicatorManager = require('./healthIndicatorManager');

class SmartDashboard {
  /**
   * Get comprehensive dashboard overview
   */
  async getDashboardOverview() {
    const devices = await deviceManager.listDevices();
    
    const dashboardData = {
      timestamp: new Date().toISOString(),
      devices: {
        total: devices.length,
        active: devices.filter(d => d.status === 'active').length,
        inactive: devices.filter(d => d.status === 'inactive').length,
        error: devices.filter(d => d.status === 'error').length
      },
      readings: await this._getReadingsSummary(),
      lastSync: this._getLastSyncTime(devices)
    };

    return dashboardData;
  }

  /**
   * Get device dashboard with all its data
   */
  async getDeviceDashboard(deviceId) {
    const device = await deviceManager.getDevice(deviceId);
    
    const [latestReading, statistics, indicators] = await Promise.all([
      bloodPressureLogger.getLatestReading(deviceId),
      bloodPressureLogger.getReadingStatistics(deviceId, '7d'),
      healthIndicatorManager.getDeviceIndicators(deviceId, { limit: 10 })
    ]);

    return {
      device,
      latestReading,
      statistics,
      recentIndicators: indicators,
      dashboardGeneratedAt: new Date().toISOString()
    };
  }

  /**
   * Get health alerts based on readings
   */
  async getHealthAlerts(deviceId) {
    const device = await deviceManager.getDevice(deviceId);
    const latestReading = await bloodPressureLogger.getLatestReading(deviceId);
    const alerts = [];

    if (!latestReading) {
      return alerts;
    }

    // High blood pressure alert
    if (latestReading.systolic >= 140 || latestReading.diastolic >= 90) {
      alerts.push({
        type: 'high_blood_pressure',
        severity: 'high',
        message: `High blood pressure detected: ${latestReading.systolic}/${latestReading.diastolic}`,
        reading_id: latestReading.id,
        recorded_at: latestReading.measurement_time
      });
    }

    // Elevated blood pressure alert
    if ((latestReading.systolic >= 120 && latestReading.systolic < 140) ||
        (latestReading.diastolic >= 80 && latestReading.diastolic < 90)) {
      alerts.push({
        type: 'elevated_blood_pressure',
        severity: 'medium',
        message: `Elevated blood pressure: ${latestReading.systolic}/${latestReading.diastolic}`,
        reading_id: latestReading.id,
        recorded_at: latestReading.measurement_time
      });
    }

    // Low blood pressure alert
    if (latestReading.systolic < 90 || latestReading.diastolic < 60) {
      alerts.push({
        type: 'low_blood_pressure',
        severity: 'high',
        message: `Low blood pressure detected: ${latestReading.systolic}/${latestReading.diastolic}`,
        reading_id: latestReading.id,
        recorded_at: latestReading.measurement_time
      });
    }

    // High pulse alert
    if (latestReading.pulse && latestReading.pulse > 100) {
      alerts.push({
        type: 'high_pulse',
        severity: 'medium',
        message: `High pulse rate: ${latestReading.pulse} bpm`,
        reading_id: latestReading.id,
        recorded_at: latestReading.measurement_time
      });
    }

    // Low pulse alert
    if (latestReading.pulse && latestReading.pulse < 60) {
      alerts.push({
        type: 'low_pulse',
        severity: 'medium',
        message: `Low pulse rate: ${latestReading.pulse} bpm`,
        reading_id: latestReading.id,
        recorded_at: latestReading.measurement_time
      });
    }

    return alerts;
  }

  /**
   * Get trend analysis for a device
   */
  async getTrendAnalysis(deviceId, timeframe = '7d') {
    const device = await deviceManager.getDevice(deviceId);
    const statistics = await bloodPressureLogger.getReadingStatistics(deviceId, timeframe);
    const readings = await bloodPressureLogger.getDeviceReadings(deviceId, { 
      limit: 1000 
    });

    // Calculate trends
    const midpoint = Math.floor(readings.length / 2);
    const firstHalf = readings.slice(midpoint);
    const secondHalf = readings.slice(0, midpoint);

    const avgFirstSystolic = firstHalf.length > 0 
      ? firstHalf.reduce((sum, r) => sum + r.systolic, 0) / firstHalf.length 
      : 0;
    const avgSecondSystolic = secondHalf.length > 0
      ? secondHalf.reduce((sum, r) => sum + r.systolic, 0) / secondHalf.length
      : 0;

    const systolicTrend = avgFirstSystolic > avgSecondSystolic ? 'increasing' : 'decreasing';

    return {
      device,
      timeframe,
      statistics,
      trend: {
        systolic: systolicTrend,
        readingsCount: readings.length
      },
      analysis: this._generateTrendAnalysis(systolicTrend, statistics)
    };
  }

  /**
   * Export readings for a device
   */
  async exportReadings(deviceId, format = 'json') {
    if (!['json', 'csv'].includes(format)) {
      throw new Error('Format must be json or csv');
    }

    const device = await deviceManager.getDevice(deviceId);
    const readings = await bloodPressureLogger.getDeviceReadings(deviceId, { limit: 10000 });

    if (format === 'json') {
      return {
        device,
        readings,
        exportedAt: new Date().toISOString()
      };
    }

    // CSV format
    const headers = ['ID', 'Systolic', 'Diastolic', 'Pulse', 'Measurement Time', 'Notes'];
    const rows = readings.map(r => [
      r.id,
      r.systolic,
      r.diastolic,
      r.pulse || '',
      r.measurement_time,
      (r.notes || '').replace(/"/g, '""')
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(v => `"${v}"`).join(','))
    ].join('\n');

    return csvContent;
  }

  async _getReadingsSummary() {
    const result = await database.get(
      `SELECT COUNT(*) as total FROM blood_pressure_readings`
    );
    return { total: result?.total || 0 };
  }

  _getLastSyncTime(devices) {
    if (devices.length === 0) return null;
    const syncTimes = devices
      .filter(d => d.last_sync)
      .map(d => new Date(d.last_sync))
      .sort((a, b) => b - a);
    return syncTimes.length > 0 ? syncTimes[0].toISOString() : null;
  }

  _generateTrendAnalysis(trend, statistics) {
    if (!statistics.systolic) {
      return 'Insufficient data for trend analysis';
    }

    const message = trend === 'increasing' 
      ? 'Blood pressure trend is increasing - monitor closely'
      : 'Blood pressure trend is decreasing - good sign';

    return message;
  }
}

module.exports = new SmartDashboard();
