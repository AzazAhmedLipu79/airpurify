class ApiResponse {
  static success(res, message, data = null, statusCode = 200, pagination = null) {
    const payload = {
      success: true,
      message,
    };
    if (data !== null) payload.data = data;
    if (pagination !== null) payload.pagination = pagination;

    return res.status(statusCode).json(payload);
  }

  static created(res, message, data = null) {
    return ApiResponse.success(res, message, data, 201);
  }

  static error(res, message = 'An unexpected error occurred', statusCode = 500, errors = []) {
    return res.status(statusCode).json({
      success: false,
      message,
      errors: Array.isArray(errors) ? errors : [errors],
    });
  }
}

module.exports = ApiResponse;
