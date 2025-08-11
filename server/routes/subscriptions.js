const express = require('express');
const router = express.Router();
const Joi = require('joi');
const SubscriptionDiscount = require('../models/SubscriptionDiscount');
const { query } = require('../database/init');

const subscriptionDiscountSchema = Joi.object({
  discount_rule_id: Joi.string().uuid().optional(),
  subscription_contract_id: Joi.string().required(),
  customer_id: Joi.string().required(),
  product_id: Joi.string().optional(),
  variant_id: Joi.string().optional(),
  discount_percentage: Joi.number().min(0).max(100).precision(4).required(),
  discount_amount: Joi.number().positive().optional(),
  frequency: Joi.string().valid('weekly', 'monthly', 'quarterly', 'yearly').optional(),
  billing_cycles_remaining: Joi.number().integer().positive().optional(),
  next_billing_date: Joi.date().optional(),
  status: Joi.string().valid('active', 'paused', 'cancelled', 'expired').optional()
});

const percentageUpdateSchema = Joi.object({
  discount_percentage: Joi.number().min(0).max(100).precision(4).required()
});

async function getStoreId(shop) {
  const result = await query(
    'SELECT id FROM stores WHERE shop_domain = $1 AND is_active = true',
    [shop]
  );
  
  if (result.rows.length === 0) {
    throw new Error('Store not found or inactive');
  }
  
  return result.rows[0].id;
}

router.get('/', async (req, res, next) => {
  try {
    const shop = res.locals.shopify.session.shop;
    const storeId = await getStoreId(shop);
    
    const filters = {
      status: req.query.status,
      customer_id: req.query.customer_id,
      product_id: req.query.product_id
    };
    
    const subscriptions = await SubscriptionDiscount.findByStore(storeId, filters);
    
    res.json({
      success: true,
      data: subscriptions,
      count: subscriptions.length
    });
  } catch (error) {
    next(error);
  }
});

router.get('/active', async (req, res, next) => {
  try {
    const shop = res.locals.shopify.session.shop;
    const storeId = await getStoreId(shop);
    
    const nextBillingDate = req.query.next_billing_date || null;
    const activeSubscriptions = await SubscriptionDiscount.getActiveSubscriptions(storeId, nextBillingDate);
    
    res.json({
      success: true,
      data: activeSubscriptions,
      count: activeSubscriptions.length
    });
  } catch (error) {
    next(error);
  }
});

router.get('/statistics', async (req, res, next) => {
  try {
    const shop = res.locals.shopify.session.shop;
    const storeId = await getStoreId(shop);
    
    const stats = await SubscriptionDiscount.getStatistics(storeId);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const shop = res.locals.shopify.session.shop;
    const storeId = await getStoreId(shop);
    
    const subscription = await SubscriptionDiscount.findById(req.params.id, storeId);
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'Subscription discount not found'
      });
    }
    
    res.json({
      success: true,
      data: subscription
    });
  } catch (error) {
    next(error);
  }
});

router.get('/contract/:contractId', async (req, res, next) => {
  try {
    const shop = res.locals.shopify.session.shop;
    const storeId = await getStoreId(shop);
    
    const subscription = await SubscriptionDiscount.findBySubscriptionContract(
      req.params.contractId,
      storeId
    );
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'Subscription discount not found for this contract'
      });
    }
    
    res.json({
      success: true,
      data: subscription
    });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { error } = subscriptionDiscountSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }
    
    const shop = res.locals.shopify.session.shop;
    const storeId = await getStoreId(shop);
    
    const subscription = await SubscriptionDiscount.create(storeId, req.body);
    
    res.status(201).json({
      success: true,
      data: subscription
    });
  } catch (error) {
    if (error.message.includes('unique_subscription_discount')) {
      return res.status(400).json({
        success: false,
        error: 'A discount already exists for this subscription contract'
      });
    }
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const shop = res.locals.shopify.session.shop;
    const storeId = await getStoreId(shop);
    
    const subscription = await SubscriptionDiscount.update(
      req.params.id,
      storeId,
      req.body
    );
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'Subscription discount not found'
      });
    }
    
    res.json({
      success: true,
      data: subscription
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/percentage', async (req, res, next) => {
  try {
    const { error } = percentageUpdateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }
    
    const shop = res.locals.shopify.session.shop;
    const storeId = await getStoreId(shop);
    
    const subscription = await SubscriptionDiscount.updateDiscountPercentage(
      req.params.id,
      storeId,
      req.body.discount_percentage
    );
    
    res.json({
      success: true,
      data: subscription,
      message: `Discount percentage updated to ${req.body.discount_percentage}%`
    });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/pause', async (req, res, next) => {
  try {
    const shop = res.locals.shopify.session.shop;
    const storeId = await getStoreId(shop);
    
    const subscription = await SubscriptionDiscount.pauseSubscriptionDiscount(
      req.params.id,
      storeId
    );
    
    res.json({
      success: true,
      data: subscription,
      message: 'Subscription discount paused successfully'
    });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/resume', async (req, res, next) => {
  try {
    const shop = res.locals.shopify.session.shop;
    const storeId = await getStoreId(shop);
    
    const subscription = await SubscriptionDiscount.resumeSubscriptionDiscount(
      req.params.id,
      storeId
    );
    
    res.json({
      success: true,
      data: subscription,
      message: 'Subscription discount resumed successfully'
    });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/cancel', async (req, res, next) => {
  try {
    const shop = res.locals.shopify.session.shop;
    const storeId = await getStoreId(shop);
    
    const subscription = await SubscriptionDiscount.cancelSubscriptionDiscount(
      req.params.id,
      storeId
    );
    
    res.json({
      success: true,
      data: subscription,
      message: 'Subscription discount cancelled successfully'
    });
  } catch (error) {
    next(error);
  }
});

router.post('/contract/:contractId/apply', async (req, res, next) => {
  try {
    const shop = res.locals.shopify.session.shop;
    const storeId = await getStoreId(shop);
    
    const subscription = await SubscriptionDiscount.applyToNextBilling(
      req.params.contractId,
      storeId
    );
    
    res.json({
      success: true,
      data: subscription,
      message: 'Discount applied to next billing cycle'
    });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/calculate', async (req, res, next) => {
  try {
    const shop = res.locals.shopify.session.shop;
    const storeId = await getStoreId(shop);
    
    const subscription = await SubscriptionDiscount.findById(req.params.id, storeId);
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'Subscription discount not found'
      });
    }
    
    const { original_price } = req.body;
    
    if (!original_price) {
      return res.status(400).json({
        success: false,
        error: 'Original price is required'
      });
    }
    
    const calculation = await SubscriptionDiscount.calculateSubscriptionPrice(
      original_price,
      subscription.discount_percentage
    );
    
    res.json({
      success: true,
      data: calculation
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;