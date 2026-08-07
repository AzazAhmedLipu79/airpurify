const authService = require('../services/auth.service');
const ApiResponse = require('../utils/apiResponse');
const asyncWrapper = require('../utils/asyncWrapper');

const register = asyncWrapper(async (req, res) => {
  const result = await authService.register(req.body);
  return ApiResponse.created(res, 'User registered successfully', result);
});

const login = asyncWrapper(async (req, res) => {
  const result = await authService.login(req.body);
  return ApiResponse.success(res, 'Login successful', result);
});

const refreshToken = asyncWrapper(async (req, res) => {
  const result = await authService.refreshToken(req.body.refreshToken);
  return ApiResponse.success(res, 'Token refreshed successfully', result);
});

module.exports = {
  register,
  login,
  refreshToken,
};
