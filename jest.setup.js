// Jest setup file for global test configuration

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.SHOPIFY_API_KEY = 'test-api-key';
process.env.SHOPIFY_API_SECRET = 'test-api-secret';
process.env.SHOPIFY_WEBHOOK_SECRET = 'test-webhook-secret';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.HOST = 'https://test-app.ngrok.io';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.SESSION_SECRET = 'test-session-secret';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
  // Keep log for debugging if needed
  log: console.log,
};

// Add custom matchers
expect.extend({
  toBeDecimal(received, expected, precision = 4) {
    const receivedNum = parseFloat(received);
    const expectedNum = parseFloat(expected);
    const pass = receivedNum.toFixed(precision) === expectedNum.toFixed(precision);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be decimal ${expected} with precision ${precision}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be decimal ${expected} with precision ${precision}`,
        pass: false,
      };
    }
  },
});