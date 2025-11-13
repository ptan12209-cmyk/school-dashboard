/**
 * Swagger/OpenAPI Configuration
 * ==============================
 * API documentation configuration for the AI School Dashboard API
 *
 * Access documentation at: http://localhost:5001/api-docs
 */

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AI School Dashboard API',
      version: '1.0.0',
      description: `
Educational management system with AI integration for grades, attendance,
courses, and student performance analytics.

## Features
- 🔐 JWT Authentication with httpOnly cookies
- 👥 Role-based access control (Admin, Teacher, Student)
- 📊 Grade and attendance management
- 🤖 AI-powered recommendations and predictions
- 📈 Performance analytics and reporting
- 🔔 Real-time notifications

## Authentication
Most endpoints require authentication. Include the JWT token in the httpOnly cookie
or use the /api/auth/login endpoint to obtain a token.

## Rate Limiting
API requests are rate-limited to prevent abuse:
- 100 requests per 15 minutes per IP address
- Authentication endpoints: 5 requests per 15 minutes

## Error Handling
All errors follow a consistent format:
\`\`\`json
{
  "success": false,
  "error": {
    "name": "ErrorType",
    "message": "Error description",
    "code": "ERROR_CODE",
    "statusCode": 400,
    "details": {}
  }
}
\`\`\`
      `,
      contact: {
        name: 'API Support',
        email: 'support@schooldashboard.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:5001',
        description: 'Development server',
      },
      {
        url: 'https://api.schooldashboard.com',
        description: 'Production server',
      },
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization endpoints',
      },
      {
        name: 'Users',
        description: 'User management endpoints (Admin only)',
      },
      {
        name: 'Students',
        description: 'Student profile and data management',
      },
      {
        name: 'Teachers',
        description: 'Teacher profile and class management',
      },
      {
        name: 'Classes',
        description: 'Class management endpoints',
      },
      {
        name: 'Courses',
        description: 'Course management and enrollment',
      },
      {
        name: 'Grades',
        description: 'Grade management and queries',
      },
      {
        name: 'Attendance',
        description: 'Attendance tracking and reporting',
      },
      {
        name: 'Assignments',
        description: 'Assignment creation and submission',
      },
      {
        name: 'Dashboard',
        description: 'Dashboard statistics and analytics',
      },
      {
        name: 'AI Services',
        description: 'AI-powered recommendations and predictions',
      },
      {
        name: 'Notifications',
        description: 'Notification management',
      },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'accessToken',
          description: 'JWT token stored in httpOnly cookie',
        },
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token in Authorization header (fallback)',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'object',
              properties: {
                name: { type: 'string', example: 'ValidationError' },
                message: { type: 'string', example: 'Validation failed' },
                code: { type: 'string', example: 'VALIDATION_ERROR' },
                statusCode: { type: 'number', example: 400 },
                details: { type: 'object' },
              },
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            email: { type: 'string', format: 'email', example: 'user@example.com' },
            role: { type: 'string', enum: ['admin', 'teacher', 'student'], example: 'student' },
            is_active: { type: 'boolean', example: true },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Student: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            user_id: { type: 'integer', example: 1 },
            first_name: { type: 'string', example: 'John' },
            last_name: { type: 'string', example: 'Doe' },
            date_of_birth: { type: 'string', format: 'date', example: '2005-01-15' },
            gender: { type: 'string', enum: ['M', 'F', 'Other'], example: 'M' },
            phone: { type: 'string', example: '+1234567890' },
            parent_name: { type: 'string', example: 'Jane Doe' },
            parent_phone: { type: 'string', example: '+1234567890' },
            parent_email: { type: 'string', format: 'email', example: 'parent@example.com' },
          },
        },
        Teacher: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            user_id: { type: 'integer', example: 2 },
            first_name: { type: 'string', example: 'Jane' },
            last_name: { type: 'string', example: 'Smith' },
            department: { type: 'string', example: 'Mathematics' },
            phone: { type: 'string', example: '+1234567890' },
            hire_date: { type: 'string', format: 'date', example: '2020-08-15' },
          },
        },
        Grade: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            student_id: { type: 'integer', example: 1 },
            course_id: { type: 'integer', example: 1 },
            score: { type: 'number', format: 'float', minimum: 0, maximum: 10, example: 8.5 },
            grade_type: { type: 'string', example: 'Test' },
            semester: { type: 'string', example: '1' },
            graded_date: { type: 'string', format: 'date', example: '2024-01-15' },
            is_published: { type: 'boolean', example: true },
          },
        },
        Course: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            name: { type: 'string', example: 'Advanced Mathematics' },
            code: { type: 'string', example: 'MATH301' },
            subject: { type: 'string', example: 'Mathematics' },
            teacher_id: { type: 'integer', example: 1 },
            class_id: { type: 'integer', example: 1 },
            semester: { type: 'string', example: 'Fall 2024' },
            school_year: { type: 'string', example: '2024-2025' },
          },
        },
        Class: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            name: { type: 'string', example: 'Class 10A' },
            grade_level: { type: 'integer', example: 10 },
            teacher_id: { type: 'integer', example: 1 },
            capacity: { type: 'integer', example: 40 },
            school_year: { type: 'string', example: '2024-2025' },
          },
        },
      },
      responses: {
        UnauthorizedError: {
          description: 'Authentication required or token invalid',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                success: false,
                error: {
                  name: 'UnauthorizedError',
                  message: 'Authentication required',
                  code: 'UNAUTHORIZED',
                  statusCode: 401,
                },
              },
            },
          },
        },
        ForbiddenError: {
          description: 'Insufficient permissions',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                success: false,
                error: {
                  name: 'ForbiddenError',
                  message: 'Access forbidden',
                  code: 'FORBIDDEN',
                  statusCode: 403,
                },
              },
            },
          },
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                success: false,
                error: {
                  name: 'NotFoundError',
                  message: 'Resource not found',
                  code: 'NOT_FOUND',
                  statusCode: 404,
                },
              },
            },
          },
        },
        ValidationError: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                success: false,
                error: {
                  name: 'ValidationError',
                  message: 'Validation failed',
                  code: 'VALIDATION_ERROR',
                  statusCode: 400,
                  details: {
                    email: 'Invalid email format',
                  },
                },
              },
            },
          },
        },
        InternalServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                success: false,
                error: {
                  name: 'InternalServerError',
                  message: 'An unexpected error occurred',
                  code: 'INTERNAL_ERROR',
                  statusCode: 500,
                },
              },
            },
          },
        },
      },
    },
    security: [
      {
        cookieAuth: [],
      },
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [
    './routes/*.js',
    './controllers/*.js',
    './models/*.js',
  ],
};

const specs = swaggerJsdoc(options);

module.exports = specs;
