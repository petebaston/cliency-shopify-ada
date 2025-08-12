/**
 * End-to-End Integration Tests
 * These tests verify the complete flow of the application
 */

const request = require('supertest');
const { Pool } = require('pg');
const crypto = require('crypto');

describe('End-to-End Integration Tests', () => {
  let app;
  let pool;
  const testShop = 'test-shop.myshopify.com';
  const testToken = 'test-access-token';

  beforeAll(async () => {
    // Initialize test database connection
    pool = new Pool({
      connectionString: process.env.TEST_DATABASE_URL || 'postgresql://localhost:5432/test_shopify_discount',
    });

    // Setup test data
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
    await pool.end();
  });

  async function setupTestDatabase() {
    // Create test store
    await pool.query(
      `INSERT INTO stores (shop_domain, access_token, is_active) 
       VALUES ($1, $2, true) 
       ON CONFLICT (shop_domain) DO UPDATE SET is_active = true`,
      [testShop, testToken]
    );
  }

  async function cleanupTestDatabase() {
    await pool.query('DELETE FROM stores WHERE shop_domain = $1', [testShop]);
  }

  describe('Complete Discount Creation Flow', () => {
    test('should create, retrieve, update, and delete a discount', async () => {
      const storeResult = await pool.query(
        'SELECT id FROM stores WHERE shop_domain = $1',
        [testShop]
      );
      const storeId = storeResult.rows[0].id;

      // 1. Create discount with decimal precision
      const discountData = {
        name: 'Test E2E Discount',
        description: 'Testing decimal precision',
        discount_type: 'percentage',
        discount_value: '15.7525', // 4 decimal places
        applies_to: 'all_products',
        is_active: true,
      };

      const createResult = await pool.query(
        `INSERT INTO discount_rules 
         (store_id, name, description, discount_type, discount_value, applies_to, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          storeId,
          discountData.name,
          discountData.description,
          discountData.discount_type,
          discountData.discount_value,
          discountData.applies_to,
          discountData.is_active,
        ]
      );

      const createdDiscount = createResult.rows[0];
      expect(createdDiscount).toBeDefined();
      expect(createdDiscount.discount_value).toBe('15.7525');

      // 2. Retrieve discount
      const getResult = await pool.query(
        'SELECT * FROM discount_rules WHERE id = $1',
        [createdDiscount.id]
      );
      
      expect(getResult.rows[0].name).toBe('Test E2E Discount');

      // 3. Update discount with new decimal value
      const updateResult = await pool.query(
        'UPDATE discount_rules SET discount_value = $1 WHERE id = $2 RETURNING *',
        ['18.3333', createdDiscount.id]
      );

      expect(updateResult.rows[0].discount_value).toBe('18.3333');

      // 4. Apply discount to order
      await pool.query(
        `INSERT INTO discount_usage 
         (store_id, discount_rule_id, order_id, customer_id, discount_amount, original_amount, final_amount)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          storeId,
          createdDiscount.id,
          'order-123',
          'customer-123',
          18.33,
          100.00,
          81.67,
        ]
      );

      // 5. Verify usage tracking
      const usageResult = await pool.query(
        'SELECT COUNT(*) FROM discount_usage WHERE discount_rule_id = $1',
        [createdDiscount.id]
      );

      expect(parseInt(usageResult.rows[0].count)).toBe(1);

      // 6. Delete discount
      await pool.query(
        'DELETE FROM discount_usage WHERE discount_rule_id = $1',
        [createdDiscount.id]
      );
      
      await pool.query(
        'DELETE FROM discount_rules WHERE id = $1',
        [createdDiscount.id]
      );

      const deletedResult = await pool.query(
        'SELECT * FROM discount_rules WHERE id = $1',
        [createdDiscount.id]
      );

      expect(deletedResult.rows.length).toBe(0);
    });
  });

  describe('Subscription Discount Flow', () => {
    test('should manage subscription discounts with decimal precision', async () => {
      const storeResult = await pool.query(
        'SELECT id FROM stores WHERE shop_domain = $1',
        [testShop]
      );
      const storeId = storeResult.rows[0].id;

      // 1. Create subscription discount
      const subscriptionData = {
        subscription_contract_id: 'contract-123',
        customer_id: 'customer-456',
        discount_percentage: '12.7500',
        status: 'active',
      };

      const createResult = await pool.query(
        `INSERT INTO subscription_discounts 
         (store_id, subscription_contract_id, customer_id, discount_percentage, status)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          storeId,
          subscriptionData.subscription_contract_id,
          subscriptionData.customer_id,
          subscriptionData.discount_percentage,
          subscriptionData.status,
        ]
      );

      const subscription = createResult.rows[0];
      expect(subscription.discount_percentage).toBe('12.7500');

      // 2. Update percentage with decimal precision
      const newPercentage = '15.3333';
      const updateResult = await pool.query(
        `UPDATE subscription_discounts 
         SET discount_percentage = $1 
         WHERE id = $2 
         RETURNING *`,
        [newPercentage, subscription.id]
      );

      expect(updateResult.rows[0].discount_percentage).toBe('15.3333');

      // 3. Test status changes
      const statusTests = ['paused', 'active', 'cancelled'];
      
      for (const status of statusTests) {
        await pool.query(
          'UPDATE subscription_discounts SET status = $1 WHERE id = $2',
          [status, subscription.id]
        );

        const statusResult = await pool.query(
          'SELECT status FROM subscription_discounts WHERE id = $1',
          [subscription.id]
        );

        expect(statusResult.rows[0].status).toBe(status);
      }

      // 4. Cleanup
      await pool.query(
        'DELETE FROM subscription_discounts WHERE id = $1',
        [subscription.id]
      );
    });
  });

  describe('GDPR Compliance Flow', () => {
    test('should handle customer data requests correctly', async () => {
      const storeResult = await pool.query(
        'SELECT id FROM stores WHERE shop_domain = $1',
        [testShop]
      );
      const storeId = storeResult.rows[0].id;

      // 1. Create test customer data
      await pool.query(
        `INSERT INTO discount_usage 
         (store_id, order_id, customer_id, discount_amount, original_amount, final_amount)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [storeId, 'order-gdpr-1', 'customer-gdpr', 10.00, 100.00, 90.00]
      );

      // 2. Simulate data request
      await pool.query(
        `INSERT INTO gdpr_requests 
         (shop_domain, customer_id, request_type, status)
         VALUES ($1, $2, $3, $4)`,
        [testShop, 'customer-gdpr', 'data_request', 'pending']
      );

      // 3. Verify request was logged
      const requestResult = await pool.query(
        'SELECT * FROM gdpr_requests WHERE customer_id = $1',
        ['customer-gdpr']
      );

      expect(requestResult.rows.length).toBe(1);
      expect(requestResult.rows[0].request_type).toBe('data_request');

      // 4. Simulate customer redaction
      await pool.query(
        `UPDATE discount_usage 
         SET customer_id = 'REDACTED_' || id::text 
         WHERE customer_id = $1`,
        ['customer-gdpr']
      );

      // 5. Verify redaction
      const redactedResult = await pool.query(
        'SELECT customer_id FROM discount_usage WHERE customer_id = $1',
        ['customer-gdpr']
      );

      expect(redactedResult.rows.length).toBe(0);

      // 6. Cleanup
      await pool.query(
        'DELETE FROM gdpr_requests WHERE customer_id LIKE $1',
        ['%gdpr%']
      );
      
      await pool.query(
        'DELETE FROM discount_usage WHERE customer_id LIKE $1',
        ['REDACTED_%']
      );
    });
  });

  describe('Billing Integration Flow', () => {
    test('should handle subscription lifecycle', async () => {
      // 1. Create billing charge
      const chargeData = {
        shop_domain: testShop,
        charge_id: 999999,
        plan: 'growth',
        status: 'pending',
      };

      await pool.query(
        `INSERT INTO billing_charges 
         (shop_domain, charge_id, plan, status)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (charge_id) DO UPDATE SET status = $4`,
        [chargeData.shop_domain, chargeData.charge_id, chargeData.plan, chargeData.status]
      );

      // 2. Activate subscription
      await pool.query(
        `INSERT INTO shop_subscriptions 
         (shop_domain, charge_id, plan, status, price)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (shop_domain) 
         DO UPDATE SET status = $4, plan = $3`,
        [testShop, chargeData.charge_id, 'growth', 'active', 79.00]
      );

      // 3. Verify active subscription
      const subResult = await pool.query(
        'SELECT * FROM shop_subscriptions WHERE shop_domain = $1',
        [testShop]
      );

      expect(subResult.rows[0].status).toBe('active');
      expect(subResult.rows[0].plan).toBe('growth');

      // 4. Cancel subscription
      await pool.query(
        'UPDATE shop_subscriptions SET status = $1 WHERE shop_domain = $2',
        ['cancelled', testShop]
      );

      // 5. Cleanup
      await pool.query(
        'DELETE FROM shop_subscriptions WHERE shop_domain = $1',
        [testShop]
      );
      
      await pool.query(
        'DELETE FROM billing_charges WHERE charge_id = $1',
        [chargeData.charge_id]
      );
    });
  });

  describe('Performance Tests', () => {
    test('should handle bulk discount operations efficiently', async () => {
      const storeResult = await pool.query(
        'SELECT id FROM stores WHERE shop_domain = $1',
        [testShop]
      );
      const storeId = storeResult.rows[0].id;

      const startTime = Date.now();

      // Create 100 discounts
      const discountPromises = [];
      for (let i = 0; i < 100; i++) {
        const promise = pool.query(
          `INSERT INTO discount_rules 
           (store_id, name, discount_type, discount_value, applies_to, is_active)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            storeId,
            `Bulk Test Discount ${i}`,
            'percentage',
            (Math.random() * 50).toFixed(4),
            'all_products',
            true,
          ]
        );
        discountPromises.push(promise);
      }

      await Promise.all(discountPromises);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within 5 seconds
      expect(duration).toBeLessThan(5000);

      // Cleanup
      await pool.query(
        'DELETE FROM discount_rules WHERE store_id = $1 AND name LIKE $2',
        [storeId, 'Bulk Test Discount%']
      );
    });
  });
});