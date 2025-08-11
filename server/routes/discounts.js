const express = require('express');
const router = express.Router();
const Joi = require('joi');
const Discount = require('../models/Discount');
const { query } = require('../database/init');

const discountSchema = Joi.object({
  name: Joi.string().required().min(1).max(255),
  description: Joi.string().optional(),
  discount_type: Joi.string().valid('percentage', 'fixed_amount', 'buy_x_get_y').required(),
  discount_value: Joi.number().positive().required(),
  applies_to: Joi.string().valid('all_products', 'specific_products', 'collections', 'subscriptions').required(),
  minimum_requirements: Joi.object({
    type: Joi.string().valid('quantity', 'amount'),
    value: Joi.number().positive()
  }).optional(),
  target_selection: Joi.object({
    products: Joi.array().items(Joi.string()),
    collections: Joi.array().items(Joi.string()),
    customer_segments: Joi.array().items(Joi.string())
  }).optional(),
  starts_at: Joi.date().optional(),
  ends_at: Joi.date().optional(),
  usage_limit: Joi.number().integer().positive().optional(),
  priority: Joi.number().integer().optional(),
  is_active: Joi.boolean().optional()
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
      is_active: req.query.is_active === 'true',
      applies_to: req.query.applies_to,
      discount_type: req.query.discount_type
    };
    
    const discounts = await Discount.findByStore(storeId, filters);
    
    res.json({
      success: true,
      data: discounts,
      count: discounts.length
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const shop = res.locals.shopify.session.shop;
    const storeId = await getStoreId(shop);
    
    const discount = await Discount.findById(req.params.id, storeId);
    
    if (!discount) {
      return res.status(404).json({
        success: false,
        error: 'Discount not found'
      });
    }
    
    res.json({
      success: true,
      data: discount
    });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { error } = discountSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }
    
    const shop = res.locals.shopify.session.shop;
    const storeId = await getStoreId(shop);
    
    const discount = await Discount.create(storeId, req.body);
    
    res.status(201).json({
      success: true,
      data: discount
    });
  } catch (error) {
    if (error.message.includes('unique_discount_name_per_store')) {
      return res.status(400).json({
        success: false,
        error: 'A discount with this name already exists'
      });
    }
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const shop = res.locals.shopify.session.shop;
    const storeId = await getStoreId(shop);
    
    const discount = await Discount.update(req.params.id, storeId, req.body);
    
    if (!discount) {
      return res.status(404).json({
        success: false,
        error: 'Discount not found'
      });
    }
    
    res.json({
      success: true,
      data: discount
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const shop = res.locals.shopify.session.shop;
    const storeId = await getStoreId(shop);
    
    const discount = await Discount.delete(req.params.id, storeId);
    
    if (!discount) {
      return res.status(404).json({
        success: false,
        error: 'Discount not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Discount deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/apply', async (req, res, next) => {
  try {
    const shop = res.locals.shopify.session.shop;
    const storeId = await getStoreId(shop);
    
    const { order_id, customer_id, original_amount, discount_amount, final_amount } = req.body;
    
    if (!order_id || !original_amount) {
      return res.status(400).json({
        success: false,
        error: 'Order ID and original amount are required'
      });
    }
    
    const discount = await Discount.applyDiscount(
      order_id,
      req.params.id,
      storeId,
      {
        customer_id,
        original_amount,
        discount_amount,
        final_amount,
        metadata: req.body.metadata
      }
    );
    
    res.json({
      success: true,
      data: discount
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/usage', async (req, res, next) => {
  try {
    const shop = res.locals.shopify.session.shop;
    const storeId = await getStoreId(shop);
    
    const filters = {
      discount_rule_id: req.params.id,
      start_date: req.query.start_date,
      end_date: req.query.end_date,
      limit: req.query.limit ? parseInt(req.query.limit) : 100
    };
    
    const usage = await Discount.getUsageHistory(storeId, filters);
    
    res.json({
      success: true,
      data: usage,
      count: usage.length
    });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/calculate', async (req, res, next) => {
  try {
    const shop = res.locals.shopify.session.shop;
    const storeId = await getStoreId(shop);
    
    const discount = await Discount.findById(req.params.id, storeId);
    
    if (!discount) {
      return res.status(404).json({
        success: false,
        error: 'Discount not found'
      });
    }
    
    const { original_price } = req.body;
    
    if (!original_price) {
      return res.status(400).json({
        success: false,
        error: 'Original price is required'
      });
    }
    
    const discountAmount = await Discount.calculateDiscountAmount(discount, original_price);
    
    res.json({
      success: true,
      data: {
        original_price,
        discount_amount: discountAmount,
        final_price: (parseFloat(original_price) - parseFloat(discountAmount)).toFixed(2),
        discount_type: discount.discount_type,
        discount_value: discount.discount_value
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;