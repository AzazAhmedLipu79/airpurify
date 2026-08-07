const request = require('supertest');
const app = require('../../src/app');

jest.setTimeout(15000);

describe('Telemetry Ingestion API Integration Tests', () => {
  test('POST /api/v1/telemetry should ingest readings quickly', async () => {
    const payload = {
      device_uid: 'DEV-NODE-001',
      readings: [
        {
          metric: 'temperature_ds18b20',
          value: 24.5,
          unit: 'C',
          sequence_number: 500,
        },
        {
          metric: 'humidity_dht11',
          value: 60.2,
          unit: '%',
          sequence_number: 500,
        },
      ],
    };

    const res = await request(app)
      .post('/api/v1/telemetry')
      .send(payload);

    expect(res.statusCode).toEqual(202);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accepted).toBe(2);
    expect(res.body.data.device_uid).toBe('DEV-NODE-001');
  });
});
