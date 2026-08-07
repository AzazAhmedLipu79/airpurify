const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { UnauthorizedError } = require('../utils/errors');

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Authentication token missing or invalid format'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new UnauthorizedError('Authentication token has expired'));
    }
    return next(new UnauthorizedError('Invalid authentication token'));
  }
}

module.exports = authenticate;
