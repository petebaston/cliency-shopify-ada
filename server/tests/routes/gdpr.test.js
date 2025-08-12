const request = require('supertest');
const express = require('express');
const gdprRoutes = require('../../routes/gdpr');
const { query } = require('../../database/init');
const crypto = require('crypto');

jest.mock('../../database/init');

describe('GDPR Webhooks', () => {
  let app;
  const webhookSecret = 'test-webhook-secret';

  beforeEach(() => {
    app = express();
    app.use(express.raw({ type: 'application/json' }));
    
    // Set webhook secret
    process.env.SHOPIFY_WEBHOOK_SECRET = webhookSecret;
    
    app.use('/gdpr', gdprRoutes);
    jest.clearAllMocks();
  });

  const createWebhookSignature = (body) => {
    return crypto
      .createHmac('sha256', webhookSecret)
      .update(body, 'utf8')
      .digest('base64');
  };

  describe('POST /gdpr/customers/data_request', () => {
    it('should handle customer data request with valid signature', async () => {
      const webhookBody = JSON.stringify({
        shop_domain: 'test-shop.myshopify.com',
        customer: {
          id: 'customer-123',
          email: 'customer@example.com',
        },
      });

      const signature = createWebhookSignature(webhookBody);
      
      query.mockResolvedValueOnce({ rows: [] });
      query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/gdpr/customers/data_request')
        .set('X-Shopify-Hmac-Sha256', signature)
        .set('Content-Type', 'application/json')
        .send(webhookBody)
        .expect(200);

      expect(response.body).toEqual({
        message: 'Customer data request received and will be processed within 30 days',
        request_id: expect.stringContaining('test-shop.myshopify.com_customer-123'),
      });

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO gdpr_requests'),
        expect.arrayContaining(['test-shop.myshopify.com', 'customer-123', 'data_request'])
      );
    });

    it('should reject request with invalid signature', async () => {
      const webhookBody = JSON.stringify({
        shop_domain: 'test-shop.myshopify.com',
        customer: { id: 'customer-123' },
      });

      await request(app)
        .post('/gdpr/customers/data_request')
        .set('X-Shopify-Hmac-Sha256', 'invalid-signature')
        .set('Content-Type', 'application/json')
        .send(webhookBody)
        .expect(401, 'Unauthorized');
    });
  });

  describe('POST /gdpr/customers/redact', () => {
    it('should redact customer data with valid signature', async () => {
      const webhookBody = JSON.stringify({
        shop_domain: 'test-shop.myshopify.com',
        customer: {
          id: 'customer-123',
          email: 'customer@example.com',
        },
      });

      const signature = createWebhookSignature(webhookBody);
      
      query.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .post('/gdpr/customers/redact')
        .set('X-Shopify-Hmac-Sha256', signature)
        .set('Content-Type', 'application/json')
        .send(webhookBody)
        .expect(200);

      expect(response.body).toEqual({
        message: 'Customer data has been redacted successfully',
        redacted_at: expect.any(String),
      });

      // Check that anonymization queries were called
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE discount_usage'),
        expect.arrayContaining(['customer-123'])
      );

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE subscription_discounts'),
        expect.arrayContaining(['customer-123'])
      );
    });
  });

  describe('POST /gdpr/shop/redact', () => {
    it('should delete all shop data with valid signature', async () => {
      const webhookBody = JSON.stringify({
        shop_domain: 'test-shop.myshopify.com',
      });

      const signature = createWebhookSignature(webhookBody);
      
      query.mockResolvedValueOnce({ 
        rows: [{ id: 'store-123' }] 
      });
      
      // Mock all deletion queries
      query.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .post('/gdpr/shop/redact')
        .set('X-Shopify-Hmac-Sha256', signature)
        .set('Content-Type', 'application/json')
        .send(webhookBody)
        .expect(200);

      expect(response.body).toEqual({
        message: 'Shop data has been completely removed',
        redacted_at: expect.any(String),
      });

      // Verify deletion queries were called in correct order
      const deleteCalls = query.mock.calls.filter(call => 
        call[0].includes('DELETE FROM')
      );
      
      expect(deleteCalls.length).toBeGreaterThan(0);
      expect(deleteCalls[0][0]).toContain('DELETE FROM audit_logs');
    });

    it('should handle shop not found', async () => {
      const webhookBody = JSON.stringify({
        shop_domain: 'non-existent-shop.myshopify.com',
      });

      const signature = createWebhookSignature(webhookBody);
      
      query.mockResolvedValueOnce({ rows: [] });
      query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/gdpr/shop/redact')
        .set('X-Shopify-Hmac-Sha256', signature)
        .set('Content-Type', 'application/json')
        .send(webhookBody)
        .expect(200);

      expect(response.body).toEqual({
        message: 'Shop data has been completely removed',
        redacted_at: expect.any(String),
      });
    });
  });

  describe('GET /gdpr/privacy-policy', () => {
    it('should return privacy policy HTML', async () => {
      const response = await request(app)
        .get('/gdpr/privacy-policy')
        .expect(200);

      expect(response.text).toContain('Privacy Policy');
      expect(response.text).toContain('GDPR Compliance');
      expect(response.text).toContain('Data Retention');
    });
  });

  describe('GET /gdpr/terms-of-service', () => {
    it('should return terms of service HTML', async () => {
      const response = await request(app)
        .get('/gdpr/terms-of-service')
        .expect(200);

      expect(response.text).toContain('Terms of Service');
      expect(response.text).toContain('Billing');
      expect(response.text).toContain('Acceptable Use');
    });
  });
});