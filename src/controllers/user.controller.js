const userService = require('../services/user.service');
const ApiResponse = require('../utils/apiResponse');
const asyncWrapper = require('../utils/asyncWrapper');

const getUsers = asyncWrapper(async (req, res) => {
  const { users, pagination } = await userService.getAllUsers(req.query);
  return ApiResponse.success(res, 'Users retrieved successfully', users, 200, pagination);
});

const getUserById = asyncWrapper(async (req, res) => {
  const user = await userService.getUserById(req.params.id);
  return ApiResponse.success(res, 'User retrieved successfully', user);
});

const getProfile = asyncWrapper(async (req, res) => {
  const user = await userService.getUserById(req.user.id);
  return ApiResponse.success(res, 'User profile retrieved successfully', user);
});

module.exports = {
  getUsers,
  getUserById,
  getProfile,
};
