const { ValidationError } = require('../utils/errors');

function validate(schemas = {}) {
  return (req, res, next) => {
    const targets = ['body', 'query', 'params'];

    for (const target of targets) {
      if (schemas[target]) {
        // Sanitize query params: strip empty string values to undefined
        if (target === 'query' && req.query && typeof req.query === 'object') {
          for (const key of Object.keys(req.query)) {
            if (req.query[key] === '') {
              delete req.query[key];
            }
          }
        }

        const result = schemas[target].safeParse(req[target]);

        if (!result.success) {
          const errors = result.error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code,
          }));

          return next(new ValidationError('Input validation failed', errors));
        }

        // Replace request data with parsed/sanitized payload
        req[target] = result.data;
      }
    }

    next();
  };
}

module.exports = validate;
