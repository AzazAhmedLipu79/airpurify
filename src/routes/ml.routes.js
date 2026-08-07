const express = require('express');
const router = express.Router();
const mlController = require('../controllers/ml.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const ROLES = require('../constants/roles');

router.use(authenticate);

/**
 * @openapi
 * /ml/features:
 *   post:
 *     summary: Ingest preprocessed ML feature matrix rows
 *     tags: [Machine Learning]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: ML features stored
 */
router.post('/features', authorize([ROLES.ADMIN, ROLES.OPERATOR]), mlController.storeFeatures);

/**
 * @openapi
 * /ml/features/devices/{deviceId}:
 *   get:
 *     summary: Query ML features for Python model training
 *     tags: [Machine Learning]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: ML feature vectors
 */
router.get('/features/devices/:deviceId', mlController.getFeatures);

/**
 * @openapi
 * /ml/models:
 *   get:
 *     summary: List registered ML models
 *     tags: [Machine Learning]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: ML models list
 *   post:
 *     summary: Register a newly trained ML model
 *     tags: [Machine Learning]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Model registered
 */
router.get('/models', mlController.getModels);
router.post('/models', authorize([ROLES.ADMIN, ROLES.OPERATOR]), mlController.registerModel);

/**
 * @openapi
 * /ml/predictions:
 *   post:
 *     summary: Ingest model prediction output (from Python FastAPI service)
 *     tags: [Machine Learning]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Prediction recorded
 */
router.post('/predictions', authorize([ROLES.ADMIN, ROLES.OPERATOR]), mlController.savePrediction);

/**
 * @openapi
 * /ml/predictions/devices/{deviceId}:
 *   get:
 *     summary: Get recent predictions for device
 *     tags: [Machine Learning]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Recent predictions
 */
router.get('/predictions/devices/:deviceId', mlController.getPredictions);

module.exports = router;
