const { query, transaction } = require('../database/init');
const Decimal = require('decimal.js');

class SubscriptionDiscount {
  static async create(storeId, subscriptionData) {
    const {
      discount_rule_id,
      subscription_contract_id,
      customer_id,
      product_id,
      variant_id,
      discount_percentage,
      discount_amount,
      frequency,
      billing_cycles_remaining,
      next_billing_date,
      status = 'active'
    } = subscriptionData;

    const result = await query(
      `INSERT INTO subscription_discounts 
       (store_id, discount_rule_id, subscription_contract_id, customer_id, 
        product_id, variant_id, discount_percentage, discount_amount,
        frequency, billing_cycles_remaining, next_billing_date, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        storeId,
        discount_rule_id,
        subscription_contract_id,
        customer_id,
        product_id,
        variant_id,
        new Decimal(discount_percentage).toFixed(4),
        discount_amount ? new Decimal(discount_amount).toFixed(2) : null,
        frequency,
        billing_cycles_remaining,
        next_billing_date,
        status
      ]
    );

    return result.rows[0];
  }

  static async findById(id, storeId) {
    const result = await query(
      `SELECT sd.*, dr.name as discount_name, dr.discount_type 
       FROM subscription_discounts sd
       LEFT JOIN discount_rules dr ON sd.discount_rule_id = dr.id
       WHERE sd.id = $1 AND sd.store_id = $2`,
      [id, storeId]
    );
    return result.rows[0];
  }

  static async findBySubscriptionContract(subscriptionContractId, storeId) {
    const result = await query(
      `SELECT sd.*, dr.name as discount_name, dr.discount_type 
       FROM subscription_discounts sd
       LEFT JOIN discount_rules dr ON sd.discount_rule_id = dr.id
       WHERE sd.subscription_contract_id = $1 AND sd.store_id = $2`,
      [subscriptionContractId, storeId]
    );
    return result.rows[0];
  }

  static async findByStore(storeId, filters = {}) {
    let queryStr = `
      SELECT sd.*, dr.name as discount_name, dr.discount_type 
      FROM subscription_discounts sd
      LEFT JOIN discount_rules dr ON sd.discount_rule_id = dr.id
      WHERE sd.store_id = $1
    `;
    const params = [storeId];
    let paramIndex = 2;

    if (filters.status) {
      queryStr += ` AND sd.status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.customer_id) {
      queryStr += ` AND sd.customer_id = $${paramIndex}`;
      params.push(filters.customer_id);
      paramIndex++;
    }

    if (filters.product_id) {
      queryStr += ` AND sd.product_id = $${paramIndex}`;
      params.push(filters.product_id);
      paramIndex++;
    }

    queryStr += ' ORDER BY sd.created_at DESC';

    const result = await query(queryStr, params);
    return result.rows;
  }

  static async updateDiscountPercentage(id, storeId, newPercentage) {
    const percentage = new Decimal(newPercentage);
    
    if (percentage.lt(0) || percentage.gt(100)) {
      throw new Error('Discount percentage must be between 0 and 100');
    }

    const result = await query(
      `UPDATE subscription_discounts 
       SET discount_percentage = $3, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 AND store_id = $2 
       RETURNING *`,
      [id, storeId, percentage.toFixed(4)]
    );

    if (result.rows.length === 0) {
      throw new Error('Subscription discount not found');
    }

    await this.logChange(storeId, id, 'discount_percentage_updated', {
      old_value: result.rows[0].discount_percentage,
      new_value: percentage.toFixed(4)
    });

    return result.rows[0];
  }

  static async update(id, storeId, updates) {
    const allowedFields = [
      'discount_percentage', 'discount_amount', 'frequency',
      'billing_cycles_remaining', 'next_billing_date', 'status'
    ];

    const fieldsToUpdate = Object.keys(updates)
      .filter(key => allowedFields.includes(key));

    if (fieldsToUpdate.length === 0) {
      throw new Error('No valid fields to update');
    }

    const setClause = fieldsToUpdate
      .map((field, index) => `${field} = $${index + 3}`)
      .join(', ');

    const values = [id, storeId];
    fieldsToUpdate.forEach(field => {
      let value = updates[field];
      if (field === 'discount_percentage') {
        value = new Decimal(value).toFixed(4);
      } else if (field === 'discount_amount' && value !== null) {
        value = new Decimal(value).toFixed(2);
      }
      values.push(value);
    });

    const result = await query(
      `UPDATE subscription_discounts 
       SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 AND store_id = $2 
       RETURNING *`,
      values
    );

    if (result.rows.length > 0) {
      await this.logChange(storeId, id, 'updated', updates);
    }

    return result.rows[0];
  }

  static async pauseSubscriptionDiscount(id, storeId) {
    return await this.update(id, storeId, { status: 'paused' });
  }

  static async resumeSubscriptionDiscount(id, storeId) {
    return await this.update(id, storeId, { status: 'active' });
  }

  static async cancelSubscriptionDiscount(id, storeId) {
    return await this.update(id, storeId, { status: 'cancelled' });
  }

  static async applyToNextBilling(subscriptionContractId, storeId) {
    return await transaction(async (client) => {
      const subscriptionResult = await client.query(
        `SELECT * FROM subscription_discounts 
         WHERE subscription_contract_id = $1 AND store_id = $2 AND status = 'active'`,
        [subscriptionContractId, storeId]
      );

      if (subscriptionResult.rows.length === 0) {
        throw new Error('Active subscription discount not found');
      }

      const subscription = subscriptionResult.rows[0];

      await client.query(
        `UPDATE subscription_discounts 
         SET applied_count = applied_count + 1,
             billing_cycles_remaining = CASE 
               WHEN billing_cycles_remaining IS NOT NULL 
               THEN billing_cycles_remaining - 1 
               ELSE NULL 
             END
         WHERE id = $1`,
        [subscription.id]
      );

      if (subscription.billing_cycles_remaining === 1) {
        await client.query(
          `UPDATE subscription_discounts SET status = 'expired' WHERE id = $1`,
          [subscription.id]
        );
      }

      return subscription;
    });
  }

  static async calculateSubscriptionPrice(originalPrice, discountPercentage) {
    const price = new Decimal(originalPrice);
    const percentage = new Decimal(discountPercentage);
    const discountAmount = price.mul(percentage.div(100));
    const finalPrice = price.minus(discountAmount);

    return {
      original_price: price.toFixed(2),
      discount_amount: discountAmount.toFixed(2),
      final_price: finalPrice.toFixed(2),
      discount_percentage: percentage.toFixed(4)
    };
  }

  static async getActiveSubscriptions(storeId, nextBillingDate = null) {
    let queryStr = `
      SELECT sd.*, dr.name as discount_name 
      FROM subscription_discounts sd
      LEFT JOIN discount_rules dr ON sd.discount_rule_id = dr.id
      WHERE sd.store_id = $1 AND sd.status = 'active'
    `;
    const params = [storeId];

    if (nextBillingDate) {
      queryStr += ' AND sd.next_billing_date = $2';
      params.push(nextBillingDate);
    }

    queryStr += ' ORDER BY sd.next_billing_date ASC';

    const result = await query(queryStr, params);
    return result.rows;
  }

  static async logChange(storeId, entityId, action, changes) {
    await query(
      `INSERT INTO audit_logs 
       (store_id, entity_type, entity_id, action, changes, performed_by)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        storeId,
        'subscription_discount',
        entityId,
        action,
        JSON.stringify(changes),
        'system'
      ]
    );
  }

  static async getStatistics(storeId) {
    const result = await query(
      `SELECT 
         COUNT(*) FILTER (WHERE status = 'active') as active_count,
         COUNT(*) FILTER (WHERE status = 'paused') as paused_count,
         COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count,
         COUNT(*) FILTER (WHERE status = 'expired') as expired_count,
         AVG(discount_percentage) as avg_discount_percentage,
         SUM(applied_count) as total_applications
       FROM subscription_discounts
       WHERE store_id = $1`,
      [storeId]
    );

    return result.rows[0];
  }
}

module.exports = SubscriptionDiscount;