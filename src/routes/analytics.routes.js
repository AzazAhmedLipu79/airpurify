const express = require('express');
const analyticsController = require('../controllers/analytics.controller');

const router = express.Router();

router.get('/overview', analyticsController.getOverview);
router.get('/patterns', analyticsController.getPatterns);
router.get('/historical', analyticsController.getHistorical);
router.get('/export-pdf', analyticsController.exportPdfReport);

module.exports = router;
