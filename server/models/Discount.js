const { query, transaction } = require('../database/init');
const Decimal = require('decimal.js');

class Discount {
  static async create(storeId, discountData) {
    const {
      name,
      description,
      discount_type,
      discount_value,
      applies_to,
      minimum_requirements,
      target_selection,
      starts_at,
      ends_at,
      usage_limit,
      priority = 0,
      is_active = true
    } = discountData;

    const result = await query(
      `INSERT INTO discount_rules 
       (store_id, name, description, discount_type, discount_value, applies_to, 
        minimum_requirements, target_selection, starts_at, ends_at, 
        usage_limit, priority, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        storeId,
        name,
        description,
        discount_type,
        new Decimal(discount_value).toFixed(4),
        applies_to,
        JSON.stringify(minimum_requirements || {}),
        JSON.stringify(target_selection || {}),
        starts_at,
        ends_at,
        usage_limit,
        priority,
        is_active
      ]
    );

    return result.rows[0];
  }

  static async findById(id, storeId) {
    const result = await query(
      'SELECT * FROM discount_rules WHERE id = $1 AND store_id = $2',
      [id, storeId]
    );
    return result.rows[0];
  }

  static async findByStore(storeId, filters = {}) {
    let queryStr = 'SELECT * FROM discount_rules WHERE store_id = $1';
    const params = [storeId];
    let paramIndex = 2;

    if (filters.is_active !== undefined) {
      queryStr += ` AND is_active = $${paramIndex}`;
      params.push(filters.is_active);
      paramIndex++;
    }

    if (filters.applies_to) {
      queryStr += ` AND applies_to = $${paramIndex}`;
      params.push(filters.applies_to);
      paramIndex++;
    }

    if (filters.discount_type) {
      queryStr += ` AND discount_type = $${paramIndex}`;
      params.push(filters.discount_type);
      paramIndex++;
    }

    queryStr += ' ORDER BY priority DESC, created_at DESC';

    const result = await query(queryStr, params);
    return result.rows;
  }

  static async update(id, storeId, updates) {
    const allowedFields = [
      'name', 'description', 'discount_type', 'discount_value',
      'applies_to', 'minimum_requirements', 'target_selection',
      'starts_at', 'ends_at', 'usage_limit', 'priority', 'is_active'
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
      if (field === 'discount_value') {
        value = new Decimal(value).toFixed(4);
      } else if (['minimum_requirements', 'target_selection'].includes(field)) {
        value = JSON.stringify(value);
      }
      values.push(value);
    });

    const result = await query(
      `UPDATE discount_rules 
       SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 AND store_id = $2 
       RETURNING *`,
      values
    );

    return result.rows[0];
  }

  static async delete(id, storeId) {
    const result = await query(
      'DELETE FROM discount_rules WHERE id = $1 AND store_id = $2 RETURNING *',
      [id, storeId]
    );
    return result.rows[0];
  }

  static async calculateDiscountAmount(discountRule, originalPrice) {
    const price = new Decimal(originalPrice);
    const discountValue = new Decimal(discountRule.discount_value);

    switch (discountRule.discount_type) {
      case 'percentage':
        return price.mul(discountValue.div(100)).toFixed(2);
      case 'fixed_amount':
        return Decimal.min(price, discountValue).toFixed(2);
      default:
        return '0.00';
    }
  }

  static async applyDiscount(orderId, discountId, storeId, customerData) {
    return await transaction(async (client) => {
      const discountResult = await client.query(
        'SELECT * FROM discount_rules WHERE id = $1 AND store_id = $2 AND is_active = true',
        [discountId, storeId]
      );

      if (discountResult.rows.length === 0) {
        throw new Error('Discount not found or inactive');
      }

      const discount = discountResult.rows[0];

      if (discount.usage_limit && discount.usage_count >= discount.usage_limit) {
        throw new Error('Discount usage limit reached');
      }

      await client.query(
        'UPDATE discount_rules SET usage_count = usage_count + 1 WHERE id = $1',
        [discountId]
      );

      await client.query(
        `INSERT INTO discount_usage 
         (store_id, discount_rule_id, order_id, customer_id, discount_amount, 
          original_amount, final_amount, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          storeId,
          discountId,
          orderId,
          customerData.customer_id,
          customerData.discount_amount,
          customerData.original_amount,
          customerData.final_amount,
          JSON.stringify(customerData.metadata || {})
        ]
      );

      return discount;
    });
  }

  static async getUsageHistory(storeId, filters = {}) {
    let queryStr = `
      SELECT du.*, dr.name as discount_name, dr.discount_type 
      FROM discount_usage du
      JOIN discount_rules dr ON du.discount_rule_id = dr.id
      WHERE du.store_id = $1
    `;
    const params = [storeId];
    let paramIndex = 2;

    if (filters.discount_rule_id) {
      queryStr += ` AND du.discount_rule_id = $${paramIndex}`;
      params.push(filters.discount_rule_id);
      paramIndex++;
    }

    if (filters.customer_id) {
      queryStr += ` AND du.customer_id = $${paramIndex}`;
      params.push(filters.customer_id);
      paramIndex++;
    }

    if (filters.start_date) {
      queryStr += ` AND du.applied_at >= $${paramIndex}`;
      params.push(filters.start_date);
      paramIndex++;
    }

    if (filters.end_date) {
      queryStr += ` AND du.applied_at <= $${paramIndex}`;
      params.push(filters.end_date);
      paramIndex++;
    }

    queryStr += ' ORDER BY du.applied_at DESC';

    if (filters.limit) {
      queryStr += ` LIMIT $${paramIndex}`;
      params.push(filters.limit);
      paramIndex++;
    }

    const result = await query(queryStr, params);
    return result.rows;
  }
}

module.exports = Discount;