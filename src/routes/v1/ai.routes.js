const express = require('express');
const router = express.Router();
const aiController = require('../../controllers/ai.controller');
const asyncWrapper = require('../../utils/asyncWrapper');
const authenticate = require('../../middleware/authenticate');

router.use(authenticate);

router.post('/predict', asyncWrapper((req, res) => aiController.predict(req, res)));
router.get('/anomalies', asyncWrapper((req, res) => aiController.detectAnomalies(req, res)));
router.get('/model-status', asyncWrapper((req, res) => aiController.getModelStatus(req, res)));
router.post('/train', asyncWrapper((req, res) => aiController.triggerTraining(req, res)));

module.exports = router;
