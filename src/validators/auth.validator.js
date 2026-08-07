const { z } = require('zod');
const ROLES = require('../constants/roles');

const registerSchema = z.object({
  username: z.string().min(3).max(50).trim(),
  email: z.string().email().trim(),
  password: z.string().min(8).max(100),
  role: z.enum([ROLES.ADMIN, ROLES.OPERATOR, ROLES.VIEWER]).optional().default(ROLES.VIEWER),
});

const loginSchema = z.object({
  usernameOrEmail: z.string().min(1).trim(),
  password: z.string().min(1),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

module.exports = {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
};
