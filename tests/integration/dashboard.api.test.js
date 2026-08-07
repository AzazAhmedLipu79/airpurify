const request = require('supertest');
const app = require('../../src/app');

jest.setTimeout(15000);

describe('Dashboard & Analytics Presets Integration Tests', () => {
  let authToken;

  beforeAll(async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        usernameOrEmail: 'admin@airquality.io',
        password: 'Password123!',
      });
    authToken = loginRes.body?.data?.accessToken;
  });

  test('GET / should return index.html for dashboard SPA', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toEqual(200);
    expect(res.text).toContain('Air Quality IoT Platform');
  });

  test('GET /api/v1/analytics/historical?interval=7d&limit=100 should return 200 OK with analytics data', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/historical?interval=7d&limit=100')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('summary');
    expect(res.body.data).toHaveProperty('correlation');
  });

  test('GET /api/v1/alerts?severity=warning should return 200 OK with filtered alerts', async () => {
    const res = await request(app)
      .get('/api/v1/alerts?severity=warning')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
  });
});
