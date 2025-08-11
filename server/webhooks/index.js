const { query } = require('../database/init');

const webhookHandlers = {
  APP_UNINSTALLED: {
    path: '/api/webhooks',
    webhookHandler: async (topic, shop, body) => {
      console.log(`App uninstalled from ${shop}`);
      
      await query(
        'UPDATE stores SET is_active = false WHERE shop_domain = $1',
        [shop]
      );
    },
  },
  
  ORDERS_CREATE: {
    path: '/api/webhooks',
    webhookHandler: async (topic, shop, body) => {
      const order = JSON.parse(body);
      console.log(`New order created in ${shop}:`, order.id);
      
      if (order.discount_codes && order.discount_codes.length > 0) {
        for (const discountCode of order.discount_codes) {
          await query(
            `INSERT INTO discount_usage (store_id, order_id, customer_id, discount_amount, original_amount, final_amount, metadata)
             SELECT s.id, $2, $3, $4, $5, $6, $7
             FROM stores s
             WHERE s.shop_domain = $1`,
            [
              shop,
              order.id,
              order.customer?.id || null,
              discountCode.amount || 0,
              order.subtotal_price,
              order.total_price,
              JSON.stringify({ code: discountCode.code, type: discountCode.type })
            ]
          );
          
          await query(
            `UPDATE discount_codes 
             SET usage_count = usage_count + 1
             WHERE code = $1 AND store_id = (SELECT id FROM stores WHERE shop_domain = $2)`,
            [discountCode.code, shop]
          );
        }
      }
    },
  },
  
  ORDERS_UPDATED: {
    path: '/api/webhooks',
    webhookHandler: async (topic, shop, body) => {
      const order = JSON.parse(body);
      console.log(`Order updated in ${shop}:`, order.id);
    },
  },
  
  CUSTOMERS_CREATE: {
    path: '/api/webhooks',
    webhookHandler: async (topic, shop, body) => {
      const customer = JSON.parse(body);
      console.log(`New customer created in ${shop}:`, customer.id);
    },
  },
  
  CUSTOMERS_UPDATE: {
    path: '/api/webhooks',
    webhookHandler: async (topic, shop, body) => {
      const customer = JSON.parse(body);
      console.log(`Customer updated in ${shop}:`, customer.id);
    },
  },
  
  SUBSCRIPTION_CONTRACTS_CREATE: {
    path: '/api/webhooks',
    webhookHandler: async (topic, shop, body) => {
      const contract = JSON.parse(body);
      console.log(`New subscription contract created in ${shop}:`, contract.id);
      
      const storeResult = await query(
        'SELECT id FROM stores WHERE shop_domain = $1',
        [shop]
      );
      
      if (storeResult.rows.length > 0) {
        const storeId = storeResult.rows[0].id;
        
        const applicableDiscounts = await query(
          `SELECT * FROM discount_rules 
           WHERE store_id = $1 
           AND is_active = true 
           AND applies_to IN ('all_products', 'subscriptions')
           AND (starts_at IS NULL OR starts_at <= NOW())
           AND (ends_at IS NULL OR ends_at >= NOW())`,
          [storeId]
        );
        
        if (applicableDiscounts.rows.length > 0) {
          const discount = applicableDiscounts.rows[0];
          
          await query(
            `INSERT INTO subscription_discounts 
             (store_id, discount_rule_id, subscription_contract_id, customer_id, 
              discount_percentage, status, next_billing_date)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              storeId,
              discount.id,
              contract.id,
              contract.customer?.id || null,
              discount.discount_value,
              'active',
              contract.next_billing_date || null
            ]
          );
        }
      }
    },
  },
  
  SUBSCRIPTION_CONTRACTS_UPDATE: {
    path: '/api/webhooks',
    webhookHandler: async (topic, shop, body) => {
      const contract = JSON.parse(body);
      console.log(`Subscription contract updated in ${shop}:`, contract.id);
      
      await query(
        `UPDATE subscription_discounts 
         SET status = $1, updated_at = NOW()
         WHERE subscription_contract_id = $2 
         AND store_id = (SELECT id FROM stores WHERE shop_domain = $3)`,
        [contract.status, contract.id, shop]
      );
    },
  },
};

module.exports = webhookHandlers;