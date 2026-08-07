const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');
const asyncWrapper = require('../utils/asyncWrapper');
const authenticate = require('../middleware/authenticate');

router.use(authenticate);

router.post('/predict', asyncWrapper((req, res) => aiController.predict(req, res)));
router.get('/anomalies', asyncWrapper((req, res) => aiController.detectAnomalies(req, res)));
router.get('/overview', asyncWrapper((req, res) => aiController.getOverview(req, res)));
router.get('/leaderboard', asyncWrapper((req, res) => aiController.getLeaderboard(req, res)));
router.get('/model-status', asyncWrapper((req, res) => aiController.getModelStatus(req, res)));
router.get('/model-history', asyncWrapper((req, res) => aiController.getModelHistory(req, res)));
router.post('/train', asyncWrapper((req, res) => aiController.triggerTraining(req, res)));
router.post('/promote', asyncWrapper((req, res) => aiController.promoteModel(req, res)));

module.exports = router;
