const request = require('supertest');
const app = require('../../src/index');

describe('Application Routes', () => {
  afterAll((done) => {
    // Close the server after tests
    if (app && app.close) {
      app.close(done);
    } else {
      done();
    }
  });

  describe('GET /', () => {
    it('should return welcome message with environment info', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('environment');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('features');
      expect(response.body.message).toContain('Trunk-Based Development');
    });

    it('should include feature flags in response', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.body.features).toHaveProperty('newUI');
      expect(response.body.features).toHaveProperty('advancedAnalytics');
      expect(response.body.features).toHaveProperty('betaFeatures');
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('environment');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('uptime');
    });

    it('should return valid timestamp format', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      const timestamp = new Date(response.body.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).not.toBeNaN();
    });
  });

  describe('GET /features', () => {
    it('should return feature configuration', async () => {
      const response = await request(app)
        .get('/features')
        .expect(200);

      expect(response.body).toHaveProperty('environment');
      expect(response.body).toHaveProperty('features');
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Feature flags');
    });
  });

  describe('GET /api/status', () => {
    it('should return API status', async () => {
      const response = await request(app)
        .get('/api/status')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'operational');
      expect(response.body).toHaveProperty('environment');
      expect(response.body).toHaveProperty('config');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/non-existent-route')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Not Found');
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('/non-existent-route');
    });
  });

  describe('Security Headers', () => {
    it('should include security headers', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      // Helmet should add security headers
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
    });
  });

  describe('CORS', () => {
    it('should handle CORS preflight requests', async () => {
      await request(app)
        .options('/')
        .expect(204);
    });
  });
});
