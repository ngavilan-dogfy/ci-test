const request = require('supertest');

// Smoke tests - Basic functionality validation
// These tests run against deployed environments to verify basic operations

describe('Smoke Tests - Basic Functionality', () => {
  const baseURL = process.env.TEST_BASE_URL || 'http://localhost:3000';
  const environment = process.env.NODE_ENV || 'test';
  
  let app;
  
  beforeAll(() => {
    if (baseURL === 'http://localhost:3000') {
      // For local testing, use the app directly
      app = require('../../src/index');
    } else {
      // For deployed environments, use the base URL
      app = baseURL;
    }
  });

  afterAll((done) => {
    if (app && app.close && baseURL === 'http://localhost:3000') {
      app.close(done);
    } else {
      done();
    }
  });

  describe('Critical Path Validation', () => {
    it('should have a healthy application', async () => {
      const response = await request(app)
        .get('/health')
        .timeout(5000)
        .expect(200);

      expect(response.body.status).toBe('healthy');
      console.log(`✅ Health check passed for environment: ${response.body.environment}`);
    });

    it('should serve the main application route', async () => {
      const response = await request(app)
        .get('/')
        .timeout(5000)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Trunk-Based Development');
      console.log(`✅ Main route accessible in environment: ${response.body.environment}`);
    });

    it('should provide API status', async () => {
      const response = await request(app)
        .get('/api/status')
        .timeout(5000)
        .expect(200);

      expect(response.body.status).toBe('operational');
      console.log(`✅ API operational in environment: ${response.body.environment}`);
    });
  });

  describe('Feature Flags Validation', () => {
    it('should return feature configuration', async () => {
      const response = await request(app)
        .get('/features')
        .timeout(5000)
        .expect(200);

      expect(response.body).toHaveProperty('features');
      expect(response.body.environment).toBeDefined();
      
      console.log(`✅ Feature flags loaded for environment: ${response.body.environment}`);
      console.log(`   Features: ${JSON.stringify(response.body.features)}`);
    });

    it('should have environment-appropriate feature flags', async () => {
      const response = await request(app)
        .get('/features')
        .expect(200);

      const { features, environment: env } = response.body;

      // Validate feature flags based on environment
      switch (env) {
        case 'production':
          // Production should have conservative feature flags
          expect(features.betaFeatures).toBe(false);
          console.log('✅ Production feature flags are conservative');
          break;
        case 'staging':
          // Staging can have more experimental features
          expect(features).toHaveProperty('advancedAnalytics');
          console.log('✅ Staging feature flags include testing features');
          break;
        case 'development':
        case 'local':
          // Development can have all features enabled
          console.log('✅ Development environment with full feature access');
          break;
        default:
          console.log(`ℹ️  Unknown environment: ${env}`);
      }
    });
  });

  describe('Security Headers Validation', () => {
    it('should include security headers', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      // Check for essential security headers
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
      
      console.log('✅ Security headers present');
    });
  });

  describe('Error Handling Validation', () => {
    it('should handle 404 errors gracefully', async () => {
      const response = await request(app)
        .get('/non-existent-endpoint')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Not Found');
      expect(response.body).toHaveProperty('message');
      
      console.log('✅ 404 handling works correctly');
    });

    it('should handle method not allowed', async () => {
      const response = await request(app)
        .delete('/health')
        .expect(404); // Express returns 404 for unhandled methods by default

      console.log('✅ Invalid method handling works correctly');
    });
  });

  describe('Performance Validation', () => {
    it('should respond within acceptable time limits', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/health')
        .timeout(2000)
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      
      // Should respond within 1 second for smoke tests
      expect(responseTime).toBeLessThan(1000);
      
      console.log(`✅ Response time: ${responseTime}ms (acceptable)`);
    });
  });

  describe('Environment Validation', () => {
    it('should report correct environment', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      const reportedEnv = response.body.environment;
      
      // Log environment information
      console.log(`📍 Running in environment: ${reportedEnv}`);
      console.log(`📍 Test configured for: ${environment}`);
      
      // Environment should be defined
      expect(reportedEnv).toBeDefined();
      expect(typeof reportedEnv).toBe('string');
    });
  });

  describe('Uptime Validation', () => {
    it('should report positive uptime', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.uptime).toBeGreaterThan(0);
      
      const uptimeMinutes = Math.floor(response.body.uptime / 60);
      console.log(`✅ Application uptime: ${uptimeMinutes} minutes`);
    });
  });
});
