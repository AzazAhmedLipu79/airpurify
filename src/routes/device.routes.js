const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/device.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const ROLES = require('../constants/roles');
const { registerDeviceSchema, updateDeviceSchema, queryDeviceSchema } = require('../validators/device.validator');

router.use(authenticate);

/**
 * @openapi
 * /devices:
 *   get:
 *     summary: List all devices with filtering & pagination
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [active, inactive, maintenance, retired] }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated device list
 *   post:
 *     summary: Register a new device (Admin or Operator)
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [device_uid]
 *             properties:
 *               device_uid: { type: string, example: "DEV-NODE-004" }
 *               name: { type: string, example: "North Station D" }
 *               location_name: { type: string, example: "Sector 7" }
 *               latitude: { type: number, example: 40.7128 }
 *               longitude: { type: number, example: -74.0060 }
 *     responses:
 *       201:
 *         description: Device registered successfully
 */
router.get('/', validate({ query: queryDeviceSchema }), deviceController.getDevices);
router.post('/', authorize([ROLES.ADMIN, ROLES.OPERATOR]), validate({ body: registerDeviceSchema }), deviceController.createDevice);

/**
 * @openapi
 * /devices/{id}:
 *   get:
 *     summary: Get device details by ID
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Device details object
 *   put:
 *     summary: Update device details (Admin or Operator)
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Device updated successfully
 *   delete:
 *     summary: Delete device (Admin only)
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Device deleted successfully
 */
router.get('/:id', deviceController.getDeviceById);
router.put('/:id', authorize([ROLES.ADMIN, ROLES.OPERATOR]), validate({ body: updateDeviceSchema }), deviceController.updateDevice);
router.delete('/:id', authorize([ROLES.ADMIN]), deviceController.deleteDevice);

/**
 * @openapi
 * /devices/{id}/heartbeat:
 *   post:
 *     summary: Update device heartbeat last_seen timestamp
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Heartbeat recorded
 */
router.post('/:id/heartbeat', deviceController.heartbeat);

module.exports = router;
