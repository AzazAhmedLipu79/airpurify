const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const validate = require('../middleware/validate');
const { authRateLimiter } = require('../middleware/rateLimiter');
const { registerSchema, loginSchema, refreshTokenSchema } = require('../validators/auth.validator');

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, email, password]
 *             properties:
 *               username: { type: string, example: "john_doe" }
 *               email: { type: string, example: "john@example.com" }
 *               password: { type: string, example: "Password123!" }
 *               role: { type: string, enum: [admin, operator, viewer], example: "operator" }
 *     responses:
 *       201:
 *         description: User registered successfully
 */
router.post('/register', authRateLimiter, validate({ body: registerSchema }), authController.register);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Login user with credentials
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [usernameOrEmail, password]
 *             properties:
 *               usernameOrEmail: { type: string, example: "admin@airquality.io" }
 *               password: { type: string, example: "Password123!" }
 *     responses:
 *       200:
 *         description: Login successful returning JWT access & refresh tokens
 */
router.post('/login', authRateLimiter, validate({ body: loginSchema }), authController.login);

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     summary: Refresh JWT access token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200:
 *         description: New JWT token pair issued
 */
router.post('/refresh', validate({ body: refreshTokenSchema }), authController.refreshToken);

module.exports = router;
