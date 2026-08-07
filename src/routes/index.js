const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const deviceRoutes = require('./device.routes');
const sensorRoutes = require('./sensor.routes');
const telemetryRoutes = require('./telemetry.routes');
const analyticsRoutes = require('./analytics.routes');
const alertRoutes = require('./alert.routes');
const healthRoutes = require('./health.routes');
const mlRoutes = require('./ml.routes');
const aiRoutes = require('./ai.routes');
const dashboardRoutes = require('./dashboard.routes');

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/devices', deviceRoutes);
router.use('/sensors', sensorRoutes);
router.use('/telemetry', telemetryRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/alerts', alertRoutes);
router.use('/health', healthRoutes);
router.use('/ml', mlRoutes);
router.use('/ai', aiRoutes);
router.use('/dashboard', dashboardRoutes);

module.exports = router;
