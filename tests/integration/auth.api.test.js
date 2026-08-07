const request = require('supertest');
const app = require('../../src/app');

describe('Auth API Integration Tests', () => {
  test('POST /api/v1/auth/login with valid credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        usernameOrEmail: 'admin@airquality.io',
        password: 'Password123!',
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('user');
  });

  test('POST /api/v1/auth/login with invalid credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        usernameOrEmail: 'admin@airquality.io',
        password: 'WrongPassword',
      });

    expect(res.statusCode).toEqual(401);
    expect(res.body.success).toBe(false);
  });
});
