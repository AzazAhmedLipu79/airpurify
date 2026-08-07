const deviceRepository = require('../repositories/device.repository');
const telemetryRepository = require('../repositories/telemetry.repository');
const alertRepository = require('../repositories/alert.repository');
const mlRepository = require('../repositories/ml.repository');
const aggregationRepository = require('../repositories/aggregation.repository');

class DashboardService {
  async getDashboardOverview() {
    const deviceCounts = await deviceRepository.getDeviceCounts();
    const latestReadings = await telemetryRepository.findLatestAcrossAllDevices();
    const topAlerts = await alertRepository.findTopActiveAlerts(5);
    const recentAggregates = await aggregationRepository.get1MinData({ limit: 30 });

    // Derive overall Air Quality Status from recent MQ135 / gas readings
    let overallAQIStatus = 'Good';
    let avgMq135 = 0;
    if (latestReadings.length > 0) {
      const mqReadings = latestReadings.filter((r) => r.metric.includes('mq135') || r.metric.includes('gas'));
      if (mqReadings.length > 0) {
        const sum = mqReadings.reduce((acc, r) => acc + (parseFloat(r.value) || 0), 0);
        avgMq135 = sum / mqReadings.length;
        if (avgMq135 > 400) overallAQIStatus = 'Hazardous';
        else if (avgMq135 > 250) overallAQIStatus = 'Unhealthy';
        else if (avgMq135 > 150) overallAQIStatus = 'Moderate';
      }
    }

    return {
      timestamp: new Date(),
      air_quality_status: overallAQIStatus,
      device_summary: {
        total: deviceCounts.total || 0,
        online: deviceCounts.active_count || 0,
        offline: (deviceCounts.inactive_count || 0) + (deviceCounts.maintenance_count || 0),
      },
      latest_readings: latestReadings,
      top_active_alerts: topAlerts,
      recent_chart_data: recentAggregates,
    };
  }
}

module.exports = new DashboardService();
