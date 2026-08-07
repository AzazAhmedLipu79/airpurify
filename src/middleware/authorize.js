const { ForbiddenError, UnauthorizedError } = require('../utils/errors');

function authorize(allowedRoles = []) {
  const roles = typeof allowedRoles === 'string' ? [allowedRoles] : allowedRoles;

  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('User unauthenticated'));
    }

    if (roles.length > 0 && !roles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `User role '${req.user.role}' is not authorized to access this resource`
        )
      );
    }

    next();
  };
}

module.exports = authorize;
