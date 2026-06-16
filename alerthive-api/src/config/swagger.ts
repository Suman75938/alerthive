import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'AlertHive API',
      version: '1.0.0',
      description:
        'REST API for AlertHive — alert management, incident tracking, ticketing, SLA policies, analytics and webhooks.',
      contact: {
        name: 'AlertHive',
      },
    },
    servers: [
      {
        url: 'http://localhost:4000/api/v1',
        description: 'Local development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Paste the access token returned by POST /auth/login',
        },
      },
      schemas: {
        // ── Auth ───────────────────────────────────────────────────────────────
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'admin@alerthive.io' },
            password: { type: 'string', example: 'changeme' },
          },
        },
        SignupRequest: {
          type: 'object',
          required: ['email', 'password', 'name'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 },
            name: { type: 'string' },
          },
        },
        AuthTokens: {
          type: 'object',
          properties: {
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' },
          },
        },
        // ── Alert ──────────────────────────────────────────────────────────────
        Alert: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            description: { type: 'string' },
            severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
            status: { type: 'string', enum: ['open', 'acknowledged', 'resolved', 'closed'] },
            source: { type: 'string' },
            organizationId: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        CreateAlertRequest: {
          type: 'object',
          required: ['title', 'severity'],
          properties: {
            title: { type: 'string', maxLength: 255 },
            description: { type: 'string' },
            severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
            source: { type: 'string' },
          },
        },
        UpdateStatusRequest: {
          type: 'object',
          required: ['status'],
          properties: {
            status: { type: 'string', enum: ['open', 'acknowledged', 'resolved', 'closed'] },
          },
        },
        // ── Incident ───────────────────────────────────────────────────────────
        Incident: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            description: { type: 'string' },
            severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
            status: { type: 'string', enum: ['open', 'investigating', 'identified', 'monitoring', 'resolved'] },
            organizationId: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        CreateIncidentRequest: {
          type: 'object',
          required: ['title', 'severity'],
          properties: {
            title: { type: 'string', maxLength: 255 },
            description: { type: 'string' },
            severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
          },
        },
        TimelineNoteRequest: {
          type: 'object',
          required: ['note'],
          properties: {
            note: { type: 'string' },
          },
        },
        // ── Ticket ─────────────────────────────────────────────────────────────
        Ticket: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            description: { type: 'string' },
            priority: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
            status: { type: 'string', enum: ['open', 'in_progress', 'resolved', 'closed'] },
            organizationId: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        CreateTicketRequest: {
          type: 'object',
          required: ['title', 'priority'],
          properties: {
            title: { type: 'string', maxLength: 255 },
            description: { type: 'string' },
            priority: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
          },
        },
        CommentRequest: {
          type: 'object',
          required: ['content'],
          properties: {
            content: { type: 'string' },
          },
        },
        // ── User ───────────────────────────────────────────────────────────────
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            role: { type: 'string', enum: ['admin', 'member', 'viewer'] },
            organizationId: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        // ── SLA ────────────────────────────────────────────────────────────────
        SlaPolicy: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
            responseMinutes: { type: 'integer' },
            resolutionMinutes: { type: 'integer' },
            organizationId: { type: 'string' },
          },
        },
        UpdateSlaPolicyRequest: {
          type: 'object',
          required: ['responseMinutes', 'resolutionMinutes'],
          properties: {
            responseMinutes: { type: 'integer', minimum: 1 },
            resolutionMinutes: { type: 'integer', minimum: 1 },
          },
        },
        // ── Webhook ────────────────────────────────────────────────────────────
        DynatraceWebhookPayload: {
          type: 'object',
          required: ['title'],
          properties: {
            title: { type: 'string', maxLength: 200 },
            description: { type: 'string' },
            severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
            entityName: { type: 'string' },
            problemId: { type: 'string' },
            impactedUrl: { type: 'string', format: 'uri' },
            tags: { type: 'string' },
          },
        },
        // ── Common ─────────────────────────────────────────────────────────────
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string' },
          },
        },
        HealthResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'ok' },
            ts: { type: 'string', format: 'date-time' },
            version: { type: 'string', example: '1.0.0' },
            uptime: { type: 'integer' },
            dependencies: {
              type: 'object',
              properties: {
                redis: { type: 'string' },
                kafka: { type: 'string' },
                database: { type: 'string' },
              },
            },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Health', description: 'Service health check' },
      { name: 'Auth', description: 'Authentication — login, signup, token refresh' },
      { name: 'Alerts', description: 'Alert management' },
      { name: 'Incidents', description: 'Incident tracking & timeline' },
      { name: 'Tickets', description: 'Ticket management & comments' },
      { name: 'Users', description: 'User management (admin)' },
      { name: 'Analytics', description: 'Dashboard analytics & reports' },
      { name: 'SLA', description: 'SLA policy configuration' },
      { name: 'Webhooks', description: 'Inbound webhooks (Dynatrace, etc.)' },
    ],
    paths: {
      // ── Health ──────────────────────────────────────────────────────────────
      '/health': {
        get: {
          tags: ['Health'],
          summary: 'Health check',
          security: [],
          responses: {
            200: {
              description: 'Service is healthy',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/HealthResponse' } } },
            },
          },
        },
      },
      // ── Auth ────────────────────────────────────────────────────────────────
      '/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Log in and receive JWT tokens',
          security: [],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } },
          },
          responses: {
            200: {
              description: 'Tokens issued',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthTokens' } } },
            },
            401: { description: 'Invalid credentials', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
      '/auth/signup': {
        post: {
          tags: ['Auth'],
          summary: 'Register a new user',
          security: [],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/SignupRequest' } } },
          },
          responses: {
            201: { description: 'User created' },
            400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
      '/auth/refresh': {
        post: {
          tags: ['Auth'],
          summary: 'Refresh access token',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['refreshToken'],
                  properties: { refreshToken: { type: 'string' } },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'New access token',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthTokens' } } },
            },
          },
        },
      },
      '/auth/logout': {
        post: {
          tags: ['Auth'],
          summary: 'Revoke refresh token',
          responses: { 204: { description: 'Logged out' } },
        },
      },
      '/auth/me': {
        get: {
          tags: ['Auth'],
          summary: 'Get current user profile',
          responses: {
            200: { description: 'Current user', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
            401: { description: 'Unauthorized' },
          },
        },
      },
      // ── Alerts ──────────────────────────────────────────────────────────────
      '/alerts': {
        get: {
          tags: ['Alerts'],
          summary: 'List alerts',
          parameters: [
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['open', 'acknowledged', 'resolved', 'closed'] } },
            { name: 'severity', in: 'query', schema: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] } },
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          ],
          responses: {
            200: {
              description: 'Paginated alert list',
              content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Alert' } } } },
            },
          },
        },
        post: {
          tags: ['Alerts'],
          summary: 'Create a new alert',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateAlertRequest' } } },
          },
          responses: {
            201: { description: 'Alert created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Alert' } } } },
            400: { description: 'Validation error' },
          },
        },
      },
      '/alerts/{id}': {
        get: {
          tags: ['Alerts'],
          summary: 'Get alert by ID',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: {
            200: { description: 'Alert detail', content: { 'application/json': { schema: { $ref: '#/components/schemas/Alert' } } } },
            404: { description: 'Not found' },
          },
        },
        delete: {
          tags: ['Alerts'],
          summary: 'Delete alert (admin only)',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: {
            204: { description: 'Deleted' },
            403: { description: 'Forbidden — admin role required' },
          },
        },
      },
      '/alerts/{id}/status': {
        patch: {
          tags: ['Alerts'],
          summary: 'Update alert status',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateStatusRequest' } } },
          },
          responses: {
            200: { description: 'Updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/Alert' } } } },
          },
        },
      },
      // ── Incidents ────────────────────────────────────────────────────────────
      '/incidents': {
        get: {
          tags: ['Incidents'],
          summary: 'List incidents',
          parameters: [
            { name: 'status', in: 'query', schema: { type: 'string' } },
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          ],
          responses: {
            200: { description: 'Incident list', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Incident' } } } } },
          },
        },
        post: {
          tags: ['Incidents'],
          summary: 'Create a new incident',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateIncidentRequest' } } },
          },
          responses: {
            201: { description: 'Incident created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Incident' } } } },
          },
        },
      },
      '/incidents/{id}': {
        get: {
          tags: ['Incidents'],
          summary: 'Get incident by ID',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: {
            200: { description: 'Incident detail', content: { 'application/json': { schema: { $ref: '#/components/schemas/Incident' } } } },
            404: { description: 'Not found' },
          },
        },
      },
      '/incidents/{id}/status': {
        patch: {
          tags: ['Incidents'],
          summary: 'Update incident status',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateStatusRequest' } } },
          },
          responses: { 200: { description: 'Updated' } },
        },
      },
      '/incidents/{id}/timeline': {
        post: {
          tags: ['Incidents'],
          summary: 'Add a timeline note',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/TimelineNoteRequest' } } },
          },
          responses: { 201: { description: 'Note added' } },
        },
      },
      // ── Tickets ──────────────────────────────────────────────────────────────
      '/tickets': {
        get: {
          tags: ['Tickets'],
          summary: 'List tickets',
          parameters: [
            { name: 'status', in: 'query', schema: { type: 'string' } },
            { name: 'priority', in: 'query', schema: { type: 'string' } },
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          ],
          responses: {
            200: { description: 'Ticket list', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Ticket' } } } } },
          },
        },
        post: {
          tags: ['Tickets'],
          summary: 'Create a new ticket',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateTicketRequest' } } },
          },
          responses: {
            201: { description: 'Ticket created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Ticket' } } } },
          },
        },
      },
      '/tickets/{id}': {
        get: {
          tags: ['Tickets'],
          summary: 'Get ticket by ID',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: {
            200: { description: 'Ticket detail', content: { 'application/json': { schema: { $ref: '#/components/schemas/Ticket' } } } },
            404: { description: 'Not found' },
          },
        },
        patch: {
          tags: ['Tickets'],
          summary: 'Update a ticket',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateTicketRequest' } } },
          },
          responses: { 200: { description: 'Updated' } },
        },
        delete: {
          tags: ['Tickets'],
          summary: 'Delete ticket (admin only)',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: {
            204: { description: 'Deleted' },
            403: { description: 'Forbidden — admin role required' },
          },
        },
      },
      '/tickets/{id}/comments': {
        post: {
          tags: ['Tickets'],
          summary: 'Add comment to ticket',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/CommentRequest' } } },
          },
          responses: { 201: { description: 'Comment added' } },
        },
      },
      // ── Users ────────────────────────────────────────────────────────────────
      '/users': {
        get: {
          tags: ['Users'],
          summary: 'List users in the organization',
          responses: {
            200: { description: 'User list', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/User' } } } } },
          },
        },
        post: {
          tags: ['Users'],
          summary: 'Create user (admin only)',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/SignupRequest' } } },
          },
          responses: { 201: { description: 'User created' } },
        },
      },
      '/users/{id}': {
        get: {
          tags: ['Users'],
          summary: 'Get user by ID',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: {
            200: { description: 'User detail', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
          },
        },
        patch: {
          tags: ['Users'],
          summary: 'Update user (admin only)',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          requestBody: {
            required: false,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    role: { type: 'string', enum: ['admin', 'member', 'viewer'] },
                    password: { type: 'string', minLength: 8 },
                  },
                },
              },
            },
          },
          responses: { 200: { description: 'Updated' } },
        },
        delete: {
          tags: ['Users'],
          summary: 'Delete user (admin only)',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: { 204: { description: 'Deleted' } },
        },
      },
      // ── Analytics ────────────────────────────────────────────────────────────
      '/analytics/tickets': {
        get: {
          tags: ['Analytics'],
          summary: 'Ticket analytics',
          parameters: [
            { name: 'days', in: 'query', schema: { type: 'integer', default: 30 } },
          ],
          responses: { 200: { description: 'Ticket metrics' } },
        },
      },
      '/analytics/alerts': {
        get: {
          tags: ['Analytics'],
          summary: 'Alert analytics',
          parameters: [
            { name: 'days', in: 'query', schema: { type: 'integer', default: 30 } },
          ],
          responses: { 200: { description: 'Alert metrics' } },
        },
      },
      '/analytics/top-resolvers': {
        get: {
          tags: ['Analytics'],
          summary: 'Top ticket resolvers',
          responses: { 200: { description: 'Resolver leaderboard' } },
        },
      },
      '/analytics/email-report': {
        post: {
          tags: ['Analytics'],
          summary: 'Send analytics email report',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email'],
                  properties: { email: { type: 'string', format: 'email' } },
                },
              },
            },
          },
          responses: { 200: { description: 'Report sent' } },
        },
      },
      // ── SLA ──────────────────────────────────────────────────────────────────
      '/sla': {
        get: {
          tags: ['SLA'],
          summary: 'List SLA policies',
          responses: {
            200: {
              description: 'SLA policies by severity',
              content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/SlaPolicy' } } } },
            },
          },
        },
      },
      '/sla/{severity}': {
        put: {
          tags: ['SLA'],
          summary: 'Update SLA policy for a severity (admin only)',
          parameters: [
            {
              name: 'severity',
              in: 'path',
              required: true,
              schema: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
            },
          ],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateSlaPolicyRequest' } } },
          },
          responses: { 200: { description: 'Policy updated' } },
        },
      },
      // ── Webhooks ─────────────────────────────────────────────────────────────
      '/webhooks/dynatrace': {
        post: {
          tags: ['Webhooks'],
          summary: 'Inbound Dynatrace problem webhook',
          security: [],
          parameters: [
            {
              name: 'X-AlertHive-Secret',
              in: 'header',
              required: false,
              schema: { type: 'string' },
              description: 'Shared secret configured in Dynatrace Workflow HTTP action headers',
            },
          ],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/DynatraceWebhookPayload' } } },
          },
          responses: {
            200: { description: 'Alert ingested' },
            401: { description: 'Invalid secret' },
          },
        },
      },
      '/webhooks/stats': {
        get: {
          tags: ['Webhooks'],
          summary: 'Webhook ingestion stats (requires JWT)',
          responses: { 200: { description: 'Stats object' } },
        },
      },
      '/webhooks/test': {
        post: {
          tags: ['Webhooks'],
          summary: 'Send a test webhook event (requires JWT)',
          responses: { 200: { description: 'Test event sent' } },
        },
      },
    },
  },
  apis: [], // All docs defined inline above
};

export const swaggerSpec = swaggerJsdoc(options);
