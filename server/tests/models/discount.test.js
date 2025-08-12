const Discount = require('../../models/Discount');
const { query } = require('../../database/init');
const Decimal = require('decimal.js');

// Mock the database
jest.mock('../../database/init');

describe('Discount Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a discount with decimal precision', async () => {
      const mockDiscount = {
        id: 'test-id',
        name: 'Test Discount',
        discount_value: '12.7500',
      };

      query.mockResolvedValue({ rows: [mockDiscount] });

      const result = await Discount.create('store-123', {
        name: 'Test Discount',
        description: 'Test description',
        discount_type: 'percentage',
        discount_value: 12.75,
        applies_to: 'all_products',
      });

      expect(result).toEqual(mockDiscount);
      expect(query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['12.7500'])
      );
    });

    it('should handle decimal values with 4 decimal places', async () => {
      query.mockResolvedValue({ rows: [{}] });

      await Discount.create('store-123', {
        name: 'Precise Discount',
        discount_type: 'percentage',
        discount_value: 15.3333,
        applies_to: 'subscriptions',
      });

      const callArgs = query.mock.calls[0][1];
      expect(callArgs[4]).toBe('15.3333');
    });
  });

  describe('calculateDiscountAmount', () => {
    it('should calculate percentage discount correctly', async () => {
      const discountRule = {
        discount_type: 'percentage',
        discount_value: '12.75',
      };

      const result = await Discount.calculateDiscountAmount(discountRule, 100);
      expect(result).toBe('12.75');
    });

    it('should calculate fixed amount discount correctly', async () => {
      const discountRule = {
        discount_type: 'fixed_amount',
        discount_value: '25.00',
      };

      const result = await Discount.calculateDiscountAmount(discountRule, 100);
      expect(result).toBe('25.00');
    });

    it('should not exceed original price for fixed discount', async () => {
      const discountRule = {
        discount_type: 'fixed_amount',
        discount_value: '150.00',
      };

      const result = await Discount.calculateDiscountAmount(discountRule, 100);
      expect(result).toBe('100.00');
    });
  });

  describe('findByStore', () => {
    it('should filter by active status', async () => {
      query.mockResolvedValue({ rows: [] });

      await Discount.findByStore('store-123', { is_active: true });

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('AND is_active = $2'),
        ['store-123', true]
      );
    });

    it('should filter by discount type', async () => {
      query.mockResolvedValue({ rows: [] });

      await Discount.findByStore('store-123', { discount_type: 'percentage' });

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('AND discount_type = $2'),
        ['store-123', 'percentage']
      );
    });
  });

  describe('update', () => {
    it('should update discount with new decimal value', async () => {
      const mockUpdated = { id: 'test-id', discount_value: '18.2500' };
      query.mockResolvedValue({ rows: [mockUpdated] });

      const result = await Discount.update('test-id', 'store-123', {
        discount_value: 18.25,
      });

      expect(result).toEqual(mockUpdated);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE discount_rules'),
        expect.arrayContaining(['18.2500'])
      );
    });

    it('should reject invalid fields', async () => {
      await expect(
        Discount.update('test-id', 'store-123', {
          invalid_field: 'value',
        })
      ).rejects.toThrow('No valid fields to update');
    });
  });

  describe('applyDiscount', () => {
    it('should handle usage limits correctly', async () => {
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ 
            rows: [{ usage_limit: 10, usage_count: 10 }] 
          }),
      };

      await expect(
        Discount.applyDiscount('order-123', 'discount-123', 'store-123', {})
      ).rejects.toThrow('Discount usage limit reached');
    });
  });
});