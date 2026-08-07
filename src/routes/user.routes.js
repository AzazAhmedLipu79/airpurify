const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const ROLES = require('../constants/roles');

router.use(authenticate);

/**
 * @openapi
 * /users/me:
 *   get:
 *     summary: Get currently logged in user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user profile object
 */
router.get('/me', userController.getProfile);

/**
 * @openapi
 * /users:
 *   get:
 *     summary: List all users (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated list of users
 */
router.get('/', authorize([ROLES.ADMIN]), userController.getUsers);

/**
 * @openapi
 * /users/{id}:
 *   get:
 *     summary: Get user by ID (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: User object
 */
router.get('/:id', authorize([ROLES.ADMIN]), userController.getUserById);

module.exports = router;
