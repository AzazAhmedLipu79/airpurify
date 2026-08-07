const telemetryService = require('../../src/services/telemetry.service');

describe('TelemetryService Quality Evaluation Tests', () => {
  test('evaluateReadingQuality should return good for valid temperature', () => {
    const quality = telemetryService.evaluateReadingQuality('temperature_ds18b20', 25.4);
    expect(quality).toBe('good');
  });

  test('evaluateReadingQuality should return out_of_range for extreme temperature', () => {
    const quality = telemetryService.evaluateReadingQuality('temperature_ds18b20', 150.0);
    expect(quality).toBe('out_of_range');
  });

  test('evaluateReadingQuality should return missing for null value', () => {
    const quality = telemetryService.evaluateReadingQuality('temperature_ds18b20', null);
    expect(quality).toBe('missing');
  });

  test('getDefaultUnit should return correct unit string', () => {
    expect(telemetryService.getDefaultUnit('temperature_dht11')).toBe('C');
    expect(telemetryService.getDefaultUnit('humidity_dht11')).toBe('%');
    expect(telemetryService.getDefaultUnit('mq135')).toBe('ppm');
  });
});
