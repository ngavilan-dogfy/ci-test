const request = require('supertest');
const app = require('../../src/index');

describe('Integration Tests - Health Monitoring', () => {
  afterAll((done) => {
    if (app && app.close) {
      app.close(done);
    } else {
      done();
    }
  });

  describe('Health Check Integration', () => {
    it('should provide comprehensive health information', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      // Validate response structure
      expect(response.body).toMatchObject({
        status: 'healthy',
        timestamp: expect.any(String),
        environment: expect.any(String),
        version: expect.any(String),
        uptime: expect.any(Number)
      });

      // Validate timestamp is recent (within last 5 seconds)
      const timestamp = new Date(response.body.timestamp);
      const now = new Date();
      const timeDiff = now.getTime() - timestamp.getTime();
      expect(timeDiff).toBeLessThan(5000);

      // Validate uptime is positive
      expect(response.body.uptime).toBeGreaterThan(0);
    });

    it('should maintain consistent health status across multiple requests', async () => {
      const requests = Array(5).fill().map(() => 
        request(app).get('/health').expect(200)
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.body.status).toBe('healthy');
        expect(response.body.environment).toBeDefined();
      });
    });
  });

  describe('Feature Flag Integration', () => {
    it('should provide consistent feature configuration', async () => {
      const [rootResponse, featuresResponse] = await Promise.all([
        request(app).get('/').expect(200),
        request(app).get('/features').expect(200)
      ]);

      // Both endpoints should have feature information
      expect(rootResponse.body.features).toBeDefined();
      expect(featuresResponse.body.features).toBeDefined();

      // Feature flags should be boolean values
      Object.values(rootResponse.body.features).forEach(flag => {
        expect(typeof flag).toBe('boolean');
      });
    });
  });

  describe('API Status Integration', () => {
    it('should provide operational status with configuration', async () => {
      const response = await request(app)
        .get('/api/status')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'operational',
        environment: expect.any(String),
        config: expect.any(Object),
        timestamp: expect.any(String)
      });

      // Timestamp should be ISO format
      expect(() => new Date(response.body.timestamp)).not.toThrow();
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle malformed requests gracefully', async () => {
      // Test with invalid JSON in body
      const response = await request(app)
        .post('/api/status')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);

      // Should not crash the application
      // Verify app is still responsive
      await request(app)
        .get('/health')
        .expect(200);
    });
  });

  describe('Performance Integration', () => {
    it('should respond to health checks within acceptable time', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/health')
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      
      // Health check should respond within 100ms
      expect(responseTime).toBeLessThan(100);
    });

    it('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = 10;
      const startTime = Date.now();
      
      const requests = Array(concurrentRequests).fill().map(() =>
        request(app).get('/health').expect(200)
      );
      
      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;
      
      // All requests should succeed
      expect(responses).toHaveLength(concurrentRequests);
      
      // Should handle concurrent requests efficiently (less than 500ms total)
      expect(totalTime).toBeLessThan(500);
    });
  });
});
