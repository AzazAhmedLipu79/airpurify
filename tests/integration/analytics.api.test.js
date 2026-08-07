const request = require('supertest');
const app = require('../../src/app');

describe('Analytics API Integration Tests', () => {
  it('GET /api/v1/analytics/overview - should return 200 and analytics metrics', async () => {
    const res = await request(app).get('/api/v1/analytics/overview');
    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('health_score');
    expect(res.body.data).toHaveProperty('ashrae_comfort');
    expect(res.body.data).toHaveProperty('mold_risk');
    expect(res.body.data).toHaveProperty('prescriptive_actions');
  });

  it('GET /api/v1/analytics/patterns - should return 200 and pattern clusters', async () => {
    const res = await request(app).get('/api/v1/analytics/patterns');
    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('patterns');
  });

  it('GET /api/v1/analytics/export-pdf - should return 200 HTML report file', async () => {
    const res = await request(app).get('/api/v1/analytics/export-pdf');
    expect(res.statusCode).toEqual(200);
    expect(res.headers['content-type']).toContain('text/html');
  });
});
