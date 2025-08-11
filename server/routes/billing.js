const express = require('express');
const router = express.Router();
const { shopifyApi } = require('@shopify/shopify-api');
const { query } = require('../database/init');

// Billing plans configuration
const BILLING_PLANS = {
  starter: {
    name: 'Starter Plan',
    price: 29.00,
    interval: 'EVERY_30_DAYS',
    trialDays: 14,
    features: {
      maxDiscounts: 10,
      aiRecommendations: false,
      advancedAnalytics: false,
      prioritySupport: false,
    },
    test: false, // Set to true for development
  },
  growth: {
    name: 'Growth Plan',
    price: 79.00,
    interval: 'EVERY_30_DAYS',
    trialDays: 14,
    features: {
      maxDiscounts: -1, // Unlimited
      aiRecommendations: true,
      advancedAnalytics: true,
      prioritySupport: false,
    },
    test: false,
  },
  pro: {
    name: 'Pro Plan',
    price: 199.00,
    interval: 'EVERY_30_DAYS',
    trialDays: 14,
    features: {
      maxDiscounts: -1,
      aiRecommendations: true,
      advancedAnalytics: true,
      prioritySupport: true,
      apiAccess: true,
      customReports: true,
    },
    test: false,
  },
};

/**
 * Create a recurring application charge
 */
router.post('/create-charge', async (req, res) => {
  try {
    const { shop, accessToken } = res.locals.shopify.session;
    const { plan = 'starter' } = req.body;
    
    if (!BILLING_PLANS[plan]) {
      return res.status(400).json({ error: 'Invalid billing plan' });
    }

    const planDetails = BILLING_PLANS[plan];
    
    const client = new shopifyApi.clients.Rest({ session: res.locals.shopify.session });
    
    // Create recurring application charge
    const charge = await client.post({
      path: 'recurring_application_charges',
      data: {
        recurring_application_charge: {
          name: planDetails.name,
          price: planDetails.price,
          return_url: `${process.env.HOST}/api/billing/activate?shop=${shop}`,
          trial_days: planDetails.trialDays,
          test: planDetails.test,
          terms: `$${planDetails.price} charged every 30 days`,
        },
      },
    });

    const chargeData = charge.body.recurring_application_charge;

    // Store charge in database
    await query(
      `INSERT INTO billing_charges 
       (shop_domain, charge_id, plan, status, confirmation_url, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (charge_id) 
       DO UPDATE SET status = $4, updated_at = NOW()`,
      [shop, chargeData.id, plan, 'pending', chargeData.confirmation_url]
    );

    res.json({
      success: true,
      confirmationUrl: chargeData.confirmation_url,
    });
  } catch (error) {
    console.error('Billing creation error:', error);
    res.status(500).json({ error: 'Failed to create billing charge' });
  }
});

/**
 * Activate a recurring charge after merchant approval
 */
router.get('/activate', async (req, res) => {
  try {
    const { charge_id, shop } = req.query;
    
    if (!charge_id || !shop) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Get session from database
    const sessionResult = await query(
      'SELECT * FROM shopify_sessions WHERE shop = $1',
      [shop]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(401).json({ error: 'Shop session not found' });
    }

    const session = sessionResult.rows[0];
    const client = new shopifyApi.clients.Rest({ session });

    // Retrieve charge details
    const chargeResponse = await client.get({
      path: `recurring_application_charges/${charge_id}`,
    });

    const charge = chargeResponse.body.recurring_application_charge;

    // Activate if accepted
    if (charge.status === 'accepted') {
      await client.post({
        path: `recurring_application_charges/${charge_id}/activate`,
      });

      // Get plan from database
      const chargeResult = await query(
        'SELECT plan FROM billing_charges WHERE charge_id = $1',
        [charge_id]
      );

      const plan = chargeResult.rows[0]?.plan || 'starter';

      // Update database
      await query(
        `INSERT INTO shop_subscriptions 
         (shop_domain, charge_id, plan, status, price, trial_ends_at, activated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT (shop_domain) 
         DO UPDATE SET 
           charge_id = $2,
           plan = $3,
           status = $4,
           price = $5,
           trial_ends_at = $6,
           activated_at = NOW()`,
        [
          shop,
          charge_id,
          plan,
          'active',
          charge.price,
          charge.trial_ends_on,
        ]
      );

      // Update charge status
      await query(
        'UPDATE billing_charges SET status = $1 WHERE charge_id = $2',
        ['active', charge_id]
      );

      // Redirect to app with success message
      res.redirect(`/?shop=${shop}&billing=success`);
    } else if (charge.status === 'declined') {
      // Update charge status
      await query(
        'UPDATE billing_charges SET status = $1 WHERE charge_id = $2',
        ['declined', charge_id]
      );

      res.redirect(`/?shop=${shop}&billing=declined`);
    } else {
      res.redirect(`/?shop=${shop}&billing=pending`);
    }
  } catch (error) {
    console.error('Billing activation error:', error);
    res.status(500).json({ error: 'Failed to activate billing' });
  }
});

/**
 * Get current subscription status
 */
router.get('/status', async (req, res) => {
  try {
    const shop = res.locals.shopify.session.shop;
    
    const result = await query(
      `SELECT * FROM shop_subscriptions 
       WHERE shop_domain = $1 AND status = 'active'`,
      [shop]
    );

    if (result.rows.length === 0) {
      return res.json({
        hasActiveSubscription: false,
        requiresBilling: true,
      });
    }

    const subscription = result.rows[0];
    const planDetails = BILLING_PLANS[subscription.plan];

    res.json({
      hasActiveSubscription: true,
      subscription: {
        plan: subscription.plan,
        planName: planDetails.name,
        price: subscription.price,
        features: planDetails.features,
        trialEndsAt: subscription.trial_ends_at,
        isInTrial: subscription.trial_ends_at && new Date(subscription.trial_ends_at) > new Date(),
        activatedAt: subscription.activated_at,
      },
    });
  } catch (error) {
    console.error('Billing status error:', error);
    res.status(500).json({ error: 'Failed to get billing status' });
  }
});

/**
 * Cancel subscription
 */
router.post('/cancel', async (req, res) => {
  try {
    const { shop, accessToken } = res.locals.shopify.session;
    
    // Get active subscription
    const result = await query(
      `SELECT * FROM shop_subscriptions 
       WHERE shop_domain = $1 AND status = 'active'`,
      [shop]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    const subscription = result.rows[0];
    const client = new shopifyApi.clients.Rest({ session: res.locals.shopify.session });

    // Cancel the charge with Shopify
    await client.delete({
      path: `recurring_application_charges/${subscription.charge_id}`,
    });

    // Update database
    await query(
      `UPDATE shop_subscriptions 
       SET status = 'cancelled', cancelled_at = NOW() 
       WHERE shop_domain = $1`,
      [shop]
    );

    res.json({
      success: true,
      message: 'Subscription cancelled successfully',
    });
  } catch (error) {
    console.error('Billing cancellation error:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

/**
 * Handle usage charges for metered billing (optional)
 */
router.post('/usage-charge', async (req, res) => {
  try {
    const { shop } = res.locals.shopify.session;
    const { description, price } = req.body;
    
    // Get active subscription
    const result = await query(
      `SELECT * FROM shop_subscriptions 
       WHERE shop_domain = $1 AND status = 'active'`,
      [shop]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    const subscription = result.rows[0];
    const client = new shopifyApi.clients.Rest({ session: res.locals.shopify.session });

    // Create usage charge
    const usageCharge = await client.post({
      path: `recurring_application_charges/${subscription.charge_id}/usage_charges`,
      data: {
        usage_charge: {
          description,
          price,
        },
      },
    });

    // Store in database for tracking
    await query(
      `INSERT INTO usage_charges 
       (shop_domain, charge_id, description, price, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [shop, subscription.charge_id, description, price]
    );

    res.json({
      success: true,
      usageCharge: usageCharge.body.usage_charge,
    });
  } catch (error) {
    console.error('Usage charge error:', error);
    res.status(500).json({ error: 'Failed to create usage charge' });
  }
});

module.exports = router;