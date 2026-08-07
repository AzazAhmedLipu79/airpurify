const express = require('express');
const router = express.Router();
const healthController = require('../controllers/health.controller');
const authenticate = require('../middleware/authenticate');

/**
 * @openapi
 * /health/check:
 *   get:
 *     summary: Public API service liveness check
 *     tags: [System Health]
 *     responses:
 *       200:
 *         description: API status
 */
router.get('/check', healthController.healthCheck);

/**
 * @openapi
 * /health/system:
 *   get:
 *     summary: Detailed system operational status
 *     tags: [System Health]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System operational breakdown
 */
router.get('/system', authenticate, healthController.getSystemStatus);

/**
 * @openapi
 * /health/devices/{deviceId}:
 *   get:
 *     summary: Detailed device quality & packet health analysis
 *     tags: [System Health]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Device health quality score & packet metrics
 */
router.get('/devices/:deviceId', authenticate, healthController.getDeviceHealth);

module.exports = router;
