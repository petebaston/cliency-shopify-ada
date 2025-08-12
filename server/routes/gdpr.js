const express = require('express');
const router = express.Router();
const { verifyWebhookSignature } = require('../middleware/auth');
const { query } = require('../database/init');

/**
 * GDPR Mandatory Webhooks for Shopify App Store
 * These are REQUIRED for public app submission
 */

/**
 * Customer data request webhook
 * Shopify sends this when a customer requests their data
 */
router.post('/customers/data_request', async (req, res) => {
  try {
    const rawBody = req.rawBody;
    const signature = req.get('X-Shopify-Hmac-Sha256');
    
    // Verify webhook authenticity
    if (!verifyWebhookSignature(rawBody, signature, process.env.SHOPIFY_WEBHOOK_SECRET)) {
      return res.status(401).send('Unauthorized');
    }

    const { shop_domain, customer } = req.body;
    
    console.log(`[GDPR] Customer data request from ${shop_domain} for customer ${customer.id}`);
    
    // Collect all customer data from your database
    const customerData = await query(
      `SELECT 
        du.order_id,
        du.discount_amount,
        du.applied_at,
        sd.subscription_contract_id,
        sd.discount_percentage,
        sd.status as subscription_status
       FROM discount_usage du
       LEFT JOIN subscription_discounts sd ON sd.customer_id = du.customer_id
       WHERE du.customer_id = $1 
       AND du.store_id = (SELECT id FROM stores WHERE shop_domain = $2)`,
      [customer.id, shop_domain]
    );

    // Store the request for compliance tracking
    await query(
      `INSERT INTO gdpr_requests 
       (shop_domain, customer_id, request_type, status, requested_at)
       VALUES ($1, $2, 'data_request', 'pending', NOW())`,
      [shop_domain, customer.id]
    );

    // In production, you would:
    // 1. Generate a report with all customer data
    // 2. Send it to the shop owner or customer via secure channel
    // 3. Update the request status to 'completed'
    
    res.status(200).json({
      message: 'Customer data request received and will be processed within 30 days',
      request_id: `${shop_domain}_${customer.id}_${Date.now()}`,
    });
  } catch (error) {
    console.error('[GDPR] Customer data request error:', error);
    res.status(500).send('Internal server error');
  }
});

/**
 * Customer redact webhook
 * Shopify sends this to request deletion of customer data
 */
router.post('/customers/redact', async (req, res) => {
  try {
    const rawBody = req.rawBody;
    const signature = req.get('X-Shopify-Hmac-Sha256');
    
    // Verify webhook authenticity
    if (!verifyWebhookSignature(rawBody, signature, process.env.SHOPIFY_WEBHOOK_SECRET)) {
      return res.status(401).send('Unauthorized');
    }

    const { shop_domain, customer } = req.body;
    
    console.log(`[GDPR] Customer redact request from ${shop_domain} for customer ${customer.id}`);
    
    // Delete or anonymize customer data
    // NOTE: You may need to keep some data for legal/tax purposes
    
    // Anonymize discount usage records
    await query(
      `UPDATE discount_usage 
       SET customer_id = 'REDACTED_' || id::text,
           metadata = jsonb_set(metadata, '{redacted}', 'true')
       WHERE customer_id = $1 
       AND store_id = (SELECT id FROM stores WHERE shop_domain = $2)`,
      [customer.id, shop_domain]
    );

    // Cancel and anonymize subscription discounts
    await query(
      `UPDATE subscription_discounts 
       SET customer_id = 'REDACTED_' || id::text,
           status = 'cancelled',
           updated_at = NOW()
       WHERE customer_id = $1 
       AND store_id = (SELECT id FROM stores WHERE shop_domain = $2)`,
      [customer.id, shop_domain]
    );

    // Store the request for compliance tracking
    await query(
      `INSERT INTO gdpr_requests 
       (shop_domain, customer_id, request_type, status, completed_at)
       VALUES ($1, $2, 'customer_redact', 'completed', NOW())`,
      [shop_domain, customer.id]
    );

    res.status(200).json({
      message: 'Customer data has been redacted successfully',
      redacted_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[GDPR] Customer redact error:', error);
    res.status(500).send('Internal server error');
  }
});

/**
 * Shop redact webhook
 * Shopify sends this 48 hours after app uninstall to delete shop data
 */
router.post('/shop/redact', async (req, res) => {
  try {
    const rawBody = req.rawBody;
    const signature = req.get('X-Shopify-Hmac-Sha256');
    
    // Verify webhook authenticity
    if (!verifyWebhookSignature(rawBody, signature, process.env.SHOPIFY_WEBHOOK_SECRET)) {
      return res.status(401).send('Unauthorized');
    }

    const { shop_domain } = req.body;
    
    console.log(`[GDPR] Shop redact request for ${shop_domain}`);
    
    // Delete all shop data from database
    // This happens 48 hours after uninstall
    
    // Get store ID
    const storeResult = await query(
      'SELECT id FROM stores WHERE shop_domain = $1',
      [shop_domain]
    );

    if (storeResult.rows.length > 0) {
      const storeId = storeResult.rows[0].id;
      
      // Delete in correct order due to foreign key constraints
      await query('DELETE FROM audit_logs WHERE store_id = $1', [storeId]);
      await query('DELETE FROM discount_codes WHERE store_id = $1', [storeId]);
      await query('DELETE FROM discount_usage WHERE store_id = $1', [storeId]);
      await query('DELETE FROM subscription_discounts WHERE store_id = $1', [storeId]);
      await query('DELETE FROM customer_segments WHERE store_id = $1', [storeId]);
      await query('DELETE FROM discount_rules WHERE store_id = $1', [storeId]);
      await query('DELETE FROM shop_subscriptions WHERE shop_domain = $1', [shop_domain]);
      await query('DELETE FROM billing_charges WHERE shop_domain = $1', [shop_domain]);
      await query('DELETE FROM stores WHERE id = $1', [storeId]);
      
      console.log(`[GDPR] Successfully deleted all data for shop ${shop_domain}`);
    }

    // Store the request for compliance tracking (in a separate compliance DB)
    await query(
      `INSERT INTO gdpr_requests 
       (shop_domain, request_type, status, completed_at)
       VALUES ($1, 'shop_redact', 'completed', NOW())
       ON CONFLICT DO NOTHING`,
      [shop_domain]
    );

    res.status(200).json({
      message: 'Shop data has been completely removed',
      redacted_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[GDPR] Shop redact error:', error);
    res.status(500).send('Internal server error');
  }
});

/**
 * Data retention policy endpoint (required for app listing)
 */
router.get('/data-retention-policy', (req, res) => {
  res.json({
    app_name: 'Discount Manager Pro',
    data_retention: {
      customer_data: {
        retention_period: '90 days after last activity',
        data_types: ['order_id', 'discount_usage', 'subscription_status'],
        purpose: 'Provide discount services and analytics',
        deletion: 'Automatic after retention period or upon request',
      },
      shop_data: {
        retention_period: '48 hours after app uninstall',
        data_types: ['discount_rules', 'subscription_settings', 'analytics'],
        purpose: 'Provide app functionality and services',
        deletion: 'Automatic via shop/redact webhook',
      },
      compliance: {
        gdpr: true,
        ccpa: true,
        pipeda: true,
      },
      contact: {
        email: 'privacy@discountmanager.com',
        response_time: 'Within 30 days',
      },
    },
  });
});

/**
 * Privacy policy endpoint (required for app listing)
 */
router.get('/privacy-policy', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Privacy Policy - Discount Manager Pro</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
        h1 { color: #333; }
        h2 { color: #666; margin-top: 30px; }
        p { line-height: 1.6; color: #555; }
      </style>
    </head>
    <body>
      <h1>Privacy Policy</h1>
      <p>Last updated: ${new Date().toLocaleDateString()}</p>
      
      <h2>1. Information We Collect</h2>
      <p>We collect information necessary to provide discount management services:</p>
      <ul>
        <li>Shop information (domain, email, settings)</li>
        <li>Discount usage data (anonymous)</li>
        <li>Order information related to discounts</li>
        <li>Customer IDs for subscription management</li>
      </ul>
      
      <h2>2. How We Use Information</h2>
      <p>We use collected information to:</p>
      <ul>
        <li>Provide discount management services</li>
        <li>Generate analytics and recommendations</li>
        <li>Send important app notifications</li>
        <li>Improve our services</li>
      </ul>
      
      <h2>3. Data Storage and Security</h2>
      <p>All data is stored securely using industry-standard encryption. We use PostgreSQL databases with SSL/TLS encryption for data in transit and AES-256 encryption for data at rest.</p>
      
      <h2>4. Data Sharing</h2>
      <p>We never sell or share your data with third parties. Data is only used to provide our services to you.</p>
      
      <h2>5. Data Retention</h2>
      <p>Customer data is retained for 90 days after last activity. Shop data is deleted 48 hours after app uninstall.</p>
      
      <h2>6. Your Rights</h2>
      <p>You have the right to:</p>
      <ul>
        <li>Request access to your data</li>
        <li>Request data deletion</li>
        <li>Request data portability</li>
        <li>Opt-out of communications</li>
      </ul>
      
      <h2>7. GDPR Compliance</h2>
      <p>We are fully GDPR compliant and respond to all data requests within 30 days.</p>
      
      <h2>8. Contact Us</h2>
      <p>For privacy concerns, contact us at: privacy@discountmanager.com</p>
    </body>
    </html>
  `);
});

/**
 * Terms of Service endpoint (required for app listing)
 */
router.get('/terms-of-service', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Terms of Service - Discount Manager Pro</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
        h1 { color: #333; }
        h2 { color: #666; margin-top: 30px; }
        p { line-height: 1.6; color: #555; }
      </style>
    </head>
    <body>
      <h1>Terms of Service</h1>
      <p>Last updated: ${new Date().toLocaleDateString()}</p>
      
      <h2>1. Acceptance of Terms</h2>
      <p>By installing and using Discount Manager Pro, you agree to these terms.</p>
      
      <h2>2. Service Description</h2>
      <p>Discount Manager Pro provides discount management and analytics services for Shopify stores.</p>
      
      <h2>3. Billing</h2>
      <p>Subscription fees are billed monthly through Shopify. You can cancel anytime.</p>
      
      <h2>4. Acceptable Use</h2>
      <p>You agree to use the app in compliance with all applicable laws and Shopify's terms.</p>
      
      <h2>5. Limitation of Liability</h2>
      <p>We are not liable for any indirect, incidental, or consequential damages.</p>
      
      <h2>6. Support</h2>
      <p>Support is provided via email at support@discountmanager.com</p>
      
      <h2>7. Changes to Terms</h2>
      <p>We may update these terms. Continued use constitutes acceptance of new terms.</p>
      
      <h2>8. Contact</h2>
      <p>For questions, contact: legal@discountmanager.com</p>
    </body>
    </html>
  `);
});

module.exports = router;