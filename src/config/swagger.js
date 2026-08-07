const swaggerJSDoc = require('swagger-jsdoc');
const config = require('./env');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'IoT Air Quality Monitoring Platform API',
      version: '1.0.0',
      description: 'Production-ready RESTful backend API for real-time IoT air quality telemetry ingestion, device & sensor management, background aggregation, alert rules engine, health analytics, and machine learning pipeline integration.',
      contact: {
        name: 'IoT Architecture Team',
        email: 'support@airquality.io',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.port}${config.apiPrefix}`,
        description: 'Local Development Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT access token in the format: Bearer <token>',
        },
      },
      schemas: {
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Operation completed successfully' },
            data: { type: 'object' },
            pagination: {
              type: 'object',
              properties: {
                total: { type: 'integer', example: 100 },
                page: { type: 'integer', example: 1 },
                limit: { type: 'integer', example: 20 },
                totalPages: { type: 'integer', example: 5 },
              },
            },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Invalid request payload' },
            errors: {
              type: 'array',
              items: { type: 'object' },
              example: [{ field: 'device_uid', message: 'device_uid is required' }],
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js'],
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;
