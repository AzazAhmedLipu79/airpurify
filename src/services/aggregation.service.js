const aggregationRepository = require('../repositories/aggregation.repository');
const telemetryRepository = require('../repositories/telemetry.repository');
const logger = require('../config/logger');
const { get1MinBucket } = require('../utils/timeHelpers');

class AggregationService {
  async aggregate1MinWindow(startTime, endTime) {
    const end = endTime ? new Date(endTime) : new Date();
    const start = startTime ? new Date(startTime) : new Date(end.getTime() - 2 * 60 * 1000);

    const rawTelemetry = await telemetryRepository.findRawTelemetryForPeriod(start, end);

    if (!rawTelemetry || rawTelemetry.length === 0) {
      return { processedBuckets: 0, sampleCount: 0 };
    }

    // Group readings by device_id and 1min measured_at time_bucket
    const bucketMap = new Map();

    for (const item of rawTelemetry) {
      const bucketTime = get1MinBucket(item.measured_at);
      const key = `${item.device_id}_${bucketTime}`;

      if (!bucketMap.has(key)) {
        bucketMap.set(key, {
          device_id: item.device_id,
          time_bucket: bucketTime,
          temp_ds18b20: [],
          temp_dht11: [],
          temp_tmp36: [],
          humidity_dht11: [],
          mq135: [],
          qualities: [],
        });
      }

      const group = bucketMap.get(key);
      group.qualities.push(item.quality);

      const val = parseFloat(item.value);
      if (!isNaN(val) && item.quality === 'good') {
        const metric = item.metric.toLowerCase();
        const sensorType = (item.sensor_type || '').toLowerCase();

        if (metric.includes('temp') || sensorType.includes('temp')) {
          if (sensorType.includes('ds18b20') || metric.includes('ds18b20')) {
            group.temp_ds18b20.push(val);
          } else if (sensorType.includes('dht11') || metric.includes('dht11')) {
            group.temp_dht11.push(val);
          } else if (sensorType.includes('tmp36') || metric.includes('tmp36')) {
            group.temp_tmp36.push(val);
          } else {
            group.temp_ds18b20.push(val);
          }
        } else if (metric.includes('humidity') || sensorType.includes('humidity')) {
          group.humidity_dht11.push(val);
        } else if (metric.includes('mq135') || sensorType.includes('mq135')) {
          group.mq135.push(val);
        }
      }
    }

    let processedBuckets = 0;

    for (const group of bucketMap.values()) {
      const calcStats = (arr) => {
        if (!arr.length) return { avg: null, min: null, max: null };
        const sum = arr.reduce((a, b) => a + b, 0);
        return {
          avg: parseFloat((sum / arr.length).toFixed(2)),
          min: Math.min(...arr),
          max: Math.max(...arr),
        };
      };

      const dsStats = calcStats(group.temp_ds18b20);
      const dhtTempStats = calcStats(group.temp_dht11);
      const tmpStats = calcStats(group.temp_tmp36);
      const humStats = calcStats(group.humidity_dht11);
      const mqStats = calcStats(group.mq135);

      const totalSamples = group.qualities.length;
      const goodCount = group.qualities.filter((q) => q === 'good').length;

      let dataQuality = 'good';
      if (goodCount / totalSamples < 0.5) dataQuality = 'poor';
      else if (goodCount / totalSamples < 0.9) dataQuality = 'partial';

      const aggregateRecord = {
        device_id: group.device_id,
        time_bucket: group.time_bucket,
        temperature_ds18b20_avg: dsStats.avg,
        temperature_dht11_avg: dhtTempStats.avg,
        temperature_tmp36_avg: tmpStats.avg,
        humidity_dht11_avg: humStats.avg,
        mq135_avg: mqStats.avg,
        temperature_ds18b20_min: dsStats.min,
        temperature_ds18b20_max: dsStats.max,
        humidity_dht11_min: humStats.min,
        humidity_dht11_max: humStats.max,
        mq135_min: mqStats.min,
        mq135_max: mqStats.max,
        sample_count: totalSamples,
        data_quality: dataQuality,
      };

      await aggregationRepository.upsert1MinAggregate(aggregateRecord);
      processedBuckets++;
    }

    logger.debug(`Telemetry aggregation completed. Buckets updated: ${processedBuckets}`);
    return { processedBuckets, sampleCount: rawTelemetry.length };
  }
}

module.exports = new AggregationService();
