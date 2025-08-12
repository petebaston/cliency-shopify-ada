const request = require('supertest');
const express = require('express');
const billingRoutes = require('../../routes/billing');
const { query } = require('../../database/init');

jest.mock('../../database/init');
jest.mock('@shopify/shopify-api', () => ({
  shopifyApi: {
    clients: {
      Rest: jest.fn().mockImplementation(() => ({
        post: jest.fn(),
        get: jest.fn(),
        delete: jest.fn(),
      })),
    },
  },
}));

describe('Billing Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Mock shopify session
    app.use((req, res, next) => {
      res.locals = {
        shopify: {
          session: {
            shop: 'test-shop.myshopify.com',
            accessToken: 'test-token',
          },
        },
      };
      next();
    });
    
    app.use('/billing', billingRoutes);
    jest.clearAllMocks();
  });

  describe('POST /billing/create-charge', () => {
    it('should create a charge for valid plan', async () => {
      const mockCharge = {
        body: {
          recurring_application_charge: {
            id: 12345,
            confirmation_url: 'https://test-shop.myshopify.com/admin/charges/confirm',
          },
        },
      };

      const mockClient = {
        post: jest.fn().mockResolvedValue(mockCharge),
      };

      require('@shopify/shopify-api').shopifyApi.clients.Rest.mockImplementation(() => mockClient);
      query.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .post('/billing/create-charge')
        .send({ plan: 'growth' })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        confirmationUrl: mockCharge.body.recurring_application_charge.confirmation_url,
      });

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO billing_charges'),
        expect.arrayContaining(['test-shop.myshopify.com', 12345, 'growth'])
      );
    });

    it('should reject invalid plan', async () => {
      const response = await request(app)
        .post('/billing/create-charge')
        .send({ plan: 'invalid-plan' })
        .expect(400);

      expect(response.body).toEqual({
        error: 'Invalid billing plan',
      });
    });
  });

  describe('GET /billing/status', () => {
    it('should return active subscription status', async () => {
      query.mockResolvedValue({
        rows: [{
          plan: 'growth',
          price: 79.00,
          trial_ends_at: '2024-12-31',
          activated_at: '2024-01-01',
        }],
      });

      const response = await request(app)
        .get('/billing/status')
        .expect(200);

      expect(response.body).toEqual({
        hasActiveSubscription: true,
        subscription: expect.objectContaining({
          plan: 'growth',
          planName: 'Growth Plan',
          price: 79.00,
          features: expect.objectContaining({
            maxDiscounts: null,
            aiRecommendations: true,
            advancedAnalytics: true,
          }),
        }),
      });
    });

    it('should return no subscription when none exists', async () => {
      query.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .get('/billing/status')
        .expect(200);

      expect(response.body).toEqual({
        hasActiveSubscription: false,
        requiresBilling: true,
      });
    });
  });

  describe('GET /billing/activate', () => {
    it('should activate accepted charge', async () => {
      query.mockResolvedValueOnce({ 
        rows: [{ shop: 'test-shop.myshopify.com' }] 
      });
      
      query.mockResolvedValueOnce({ 
        rows: [{ plan: 'growth' }] 
      });

      const mockClient = {
        get: jest.fn().mockResolvedValue({
          body: {
            recurring_application_charge: {
              status: 'accepted',
              price: 79.00,
              trial_ends_on: '2024-12-31',
            },
          },
        }),
        post: jest.fn().mockResolvedValue({}),
      };

      require('@shopify/shopify-api').shopifyApi.clients.Rest.mockImplementation(() => mockClient);

      const response = await request(app)
        .get('/billing/activate')
        .query({ charge_id: '12345', shop: 'test-shop.myshopify.com' })
        .expect(302);

      expect(response.headers.location).toBe('/?shop=test-shop.myshopify.com&billing=success');
    });

    it('should handle declined charge', async () => {
      query.mockResolvedValueOnce({ 
        rows: [{ shop: 'test-shop.myshopify.com' }] 
      });

      const mockClient = {
        get: jest.fn().mockResolvedValue({
          body: {
            recurring_application_charge: {
              status: 'declined',
            },
          },
        }),
      };

      require('@shopify/shopify-api').shopifyApi.clients.Rest.mockImplementation(() => mockClient);

      const response = await request(app)
        .get('/billing/activate')
        .query({ charge_id: '12345', shop: 'test-shop.myshopify.com' })
        .expect(302);

      expect(response.headers.location).toBe('/?shop=test-shop.myshopify.com&billing=declined');
    });
  });

  describe('POST /billing/cancel', () => {
    it('should cancel active subscription', async () => {
      query.mockResolvedValueOnce({
        rows: [{
          charge_id: 12345,
        }],
      });

      const mockClient = {
        delete: jest.fn().mockResolvedValue({}),
      };

      require('@shopify/shopify-api').shopifyApi.clients.Rest.mockImplementation(() => mockClient);

      const response = await request(app)
        .post('/billing/cancel')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Subscription cancelled successfully',
      });

      expect(mockClient.delete).toHaveBeenCalledWith({
        path: 'recurring_application_charges/12345',
      });
    });

    it('should handle no active subscription', async () => {
      query.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .post('/billing/cancel')
        .expect(404);

      expect(response.body).toEqual({
        error: 'No active subscription found',
      });
    });
  });
});