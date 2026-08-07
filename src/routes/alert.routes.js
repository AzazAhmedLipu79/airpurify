const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alert.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const ROLES = require('../constants/roles');
const { queryAlertSchema, updateAlertStatusSchema } = require('../validators/alert.validator');

router.use(authenticate);

/**
 * @openapi
 * /alerts:
 *   get:
 *     summary: List system & telemetry alerts
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Paginated alerts list
 */
router.get('/', validate({ query: queryAlertSchema }), alertController.getAlerts);

/**
 * @openapi
 * /alerts/top:
 *   get:
 *     summary: Get top active critical & warning alerts
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Top active alerts
 */
router.get('/top', alertController.getTopAlerts);

/**
 * @openapi
 * /alerts/{id}/status:
 *   patch:
 *     summary: Update alert status (acknowledge or resolve)
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [active, acknowledged, resolved] }
 *     responses:
 *       200:
 *         description: Alert status updated
 */
router.patch('/:id/status', authorize([ROLES.ADMIN, ROLES.OPERATOR]), validate({ body: updateAlertStatusSchema }), alertController.updateAlertStatus);

module.exports = router;
