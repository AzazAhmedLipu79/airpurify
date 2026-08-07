const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const authenticate = require('../middleware/authenticate');

router.use(authenticate);

/**
 * @openapi
 * /dashboard/overview:
 *   get:
 *     summary: Retrieve real-time dashboard overview (live metrics, alerts, AQI, device counts)
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard overview payload
 */
router.get('/overview', dashboardController.getDashboardOverview);

module.exports = router;
