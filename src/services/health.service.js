const deviceRepository = require('../repositories/device.repository');
const sensorRepository = require('../repositories/sensor.repository');
const healthRepository = require('../repositories/health.repository');
const { NotFoundError } = require('../utils/errors');

class HealthService {
  async getDeviceHealth(deviceId, timeWindowHours = 24) {
    const device = await deviceRepository.findById(deviceId);
    if (!device) {
      throw new NotFoundError(`Device with ID ${deviceId} not found`);
    }

    const sensors = await sensorRepository.findByDeviceId(deviceId);
    const stats = await healthRepository.getDeviceTelemetryStats(deviceId, timeWindowHours);
    const sequenceAnalysis = await healthRepository.getSequenceAnalysis(deviceId, timeWindowHours);

    const totalPackets = parseInt(stats.total_packets || 0, 10);
    const goodPackets = parseInt(stats.good_packets || 0, 10);
    const invalidPackets = parseInt(stats.invalid_packets || 0, 10);
    const missingSequenceGaps = sequenceAnalysis.missingGaps;
    const duplicatePackets = sequenceAnalysis.duplicates;

    // Expected packet count calculation (assuming 5-second sampling interval per sensor)
    const activeSensorsCount = sensors.filter((s) => s.status === 'active').length || 1;
    const expectedPackets = Math.max(1, Math.round((timeWindowHours * 3600 / 5) * activeSensorsCount));
    const packetLossPercentage = Math.max(0, Math.min(100, parseFloat((((expectedPackets - totalPackets) / expectedPackets) * 100).toFixed(2))));

    // Quality Score Calculation (0 - 100 scale)
    let qualityScore = 100;
    if (device.status !== 'active') qualityScore -= 40;
    if (packetLossPercentage > 10) qualityScore -= Math.min(30, packetLossPercentage);
    if (invalidPackets > 0 && totalPackets > 0) qualityScore -= Math.min(20, (invalidPackets / totalPackets) * 50);

    const isOnline = device.status === 'active' && device.last_seen_at && (new Date() - new Date(device.last_seen_at) < 5 * 60 * 1000);
    const offlineDurationMinutes = isOnline ? 0 : (device.last_seen_at ? Math.round((new Date() - new Date(device.last_seen_at)) / (60 * 1000)) : 1440);

    return {
      device_id: device.id,
      device_uid: device.device_uid,
      status: device.status,
      is_online: isOnline,
      last_seen_at: device.last_seen_at,
      offline_duration_minutes: offlineDurationMinutes,
      uptime_percentage: isOnline ? 99.8 : Math.max(0, 100 - parseFloat((offlineDurationMinutes / (timeWindowHours * 60) * 100).toFixed(2))),
      quality_score: Math.max(0, Math.round(qualityScore)),
      metrics: {
        total_packets_received: totalPackets,
        good_packets: goodPackets,
        invalid_readings: invalidPackets,
        missing_sequence_gaps: missingSequenceGaps,
        duplicate_sequence_numbers: duplicatePackets,
        estimated_packet_loss_pct: packetLossPercentage,
      },
      sensor_health: sensors.map((s) => ({
        sensor_id: s.id,
        sensor_type: s.sensor_type,
        status: s.status,
        sampling_interval_ms: s.sampling_interval_ms,
        health_status: s.status === 'active' ? 'healthy' : 'degraded',
      })),
    };
  }

  async getSystemHealthStatus() {
    const deviceCounts = await deviceRepository.getDeviceCounts();
    return {
      system_status: 'operational',
      timestamp: new Date(),
      devices: {
        total: deviceCounts.total || 0,
        active: deviceCounts.active_count || 0,
        inactive: deviceCounts.inactive_count || 0,
        maintenance: deviceCounts.maintenance_count || 0,
        retired: deviceCounts.retired_count || 0,
      },
    };
  }
}

module.exports = new HealthService();
