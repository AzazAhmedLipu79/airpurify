const express = require('express');
const router = express.Router();
const telemetryController = require('../controllers/telemetry.controller');
const validate = require('../middleware/validate');
const { telemetryIngestionLimiter } = require('../middleware/rateLimiter');
const { telemetryIngestionSchema } = require('../validators/telemetry.validator');

/**
 * @openapi
 * /telemetry:
 *   post:
 *     summary: Ingest single or batch telemetry readings from IoT devices
 *     tags: [Telemetry Ingestion]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               device_uid: { type: string, example: "DEV-NODE-001" }
 *               readings:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     metric: { type: string, example: "temperature_ds18b20" }
 *                     value: { type: number, example: 24.5 }
 *                     unit: { type: string, example: "C" }
 *                     sequence_number: { type: integer, example: 1042 }
 *     responses:
 *       202:
 *         description: Telemetry readings accepted for processing
 */
router.post(
  '/',
  telemetryIngestionLimiter,
  validate({ body: telemetryIngestionSchema }),
  telemetryController.ingestTelemetry
);

module.exports = router;
