export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'RallyPoint Backend API',
    version: '1.0.0',
    description: 'REST API for RallyPoint Badminton tournament scoring, offline event sync, and live scoreboard',
  },
  servers: [{ url: '/api', description: 'Default API Base' }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  paths: {
    '/auth/register': {
      post: {
        summary: 'Register new user',
        tags: ['Auth'],
        responses: { '201': { description: 'User created' } },
      },
    },
    '/auth/login': {
      post: {
        summary: 'Login user and receive JWT tokens',
        tags: ['Auth'],
        responses: { '200': { description: 'Authenticated' } },
      },
    },
    '/matches': {
      post: {
        summary: 'Create new badminton match',
        security: [{ bearerAuth: [] }],
        tags: ['Matches'],
        responses: { '201': { description: 'Match initialized' } },
      },
    },
    '/matches/{id}': {
      get: {
        summary: 'Get match state and events',
        tags: ['Matches'],
        responses: { '200': { description: 'Match state' } },
      },
    },
    '/matches/{id}/live': {
      get: {
        summary: 'Public TV Scoreboard endpoint',
        tags: ['Matches'],
        responses: { '200': { description: 'Live scoreboard data' } },
      },
    },
    '/matches/{id}/events/sync': {
      post: {
        summary: 'Idempotent offline event synchronization',
        security: [{ bearerAuth: [] }],
        tags: ['Matches'],
        responses: { '200': { description: 'Batch synced' } },
      },
    },
    '/players': {
      get: {
        summary: 'Search players',
        tags: ['Players'],
        responses: { '200': { description: 'Player search results' } },
      },
    },
  },
};
