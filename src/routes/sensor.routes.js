const express = require('express');
const router = express.Router();
const sensorController = require('../controllers/sensor.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const ROLES = require('../constants/roles');
const { registerSensorSchema, updateSensorSchema } = require('../validators/sensor.validator');

router.use(authenticate);

/**
 * @openapi
 * /sensors:
 *   get:
 *     summary: List sensors
 *     tags: [Sensors]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sensor list
 *   post:
 *     summary: Register a new sensor and assign to device
 *     tags: [Sensors]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [device_id, sensor_type]
 *             properties:
 *               device_id: { type: integer, example: 1 }
 *               sensor_type: { type: string, example: "mq135" }
 *               model: { type: string, example: "MQ-135 Air Quality" }
 *     responses:
 *       201:
 *         description: Sensor registered successfully
 */
router.get('/', sensorController.getSensors);
router.post('/', authorize([ROLES.ADMIN, ROLES.OPERATOR]), validate({ body: registerSensorSchema }), sensorController.createSensor);

/**
 * @openapi
 * /sensors/{id}:
 *   get:
 *     summary: Get sensor details
 *     tags: [Sensors]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sensor details
 *   put:
 *     summary: Update sensor configuration / calibration
 *     tags: [Sensors]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sensor updated
 *   delete:
 *     summary: Delete sensor
 *     tags: [Sensors]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sensor deleted
 */
router.get('/:id', sensorController.getSensorById);
router.put('/:id', authorize([ROLES.ADMIN, ROLES.OPERATOR]), validate({ body: updateSensorSchema }), sensorController.updateSensor);
router.delete('/:id', authorize([ROLES.ADMIN]), sensorController.deleteSensor);

module.exports = router;
