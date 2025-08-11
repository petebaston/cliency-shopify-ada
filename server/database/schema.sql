-- PostgreSQL Schema for Shopify Discount Manager

-- Stores table for multi-tenancy
CREATE TABLE IF NOT EXISTS stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_domain VARCHAR(255) UNIQUE NOT NULL,
    shop_name VARCHAR(255),
    access_token TEXT,
    scope VARCHAR(500),
    installed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Discount rules table
CREATE TABLE IF NOT EXISTS discount_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    discount_type VARCHAR(50) NOT NULL, -- 'percentage', 'fixed_amount', 'buy_x_get_y'
    discount_value DECIMAL(10, 4) NOT NULL, -- Supports decimal percentages
    applies_to VARCHAR(50) NOT NULL, -- 'all_products', 'specific_products', 'collections', 'subscriptions'
    minimum_requirements JSONB, -- {type: 'quantity' | 'amount', value: number}
    target_selection JSONB, -- {products: [], collections: [], customer_segments: []}
    starts_at TIMESTAMP,
    ends_at TIMESTAMP,
    usage_limit INTEGER,
    usage_count INTEGER DEFAULT 0,
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_discount_name_per_store UNIQUE(store_id, name)
);

-- Subscription discounts table
CREATE TABLE IF NOT EXISTS subscription_discounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    discount_rule_id UUID REFERENCES discount_rules(id) ON DELETE CASCADE,
    subscription_contract_id VARCHAR(255) NOT NULL,
    customer_id VARCHAR(255) NOT NULL,
    product_id VARCHAR(255),
    variant_id VARCHAR(255),
    discount_percentage DECIMAL(10, 4) NOT NULL, -- Decimal percentage support
    discount_amount DECIMAL(10, 2),
    frequency VARCHAR(50), -- 'weekly', 'monthly', 'quarterly', 'yearly'
    billing_cycles_remaining INTEGER,
    next_billing_date DATE,
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'paused', 'cancelled', 'expired'
    applied_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_subscription_discount UNIQUE(store_id, subscription_contract_id)
);

-- Discount usage history
CREATE TABLE IF NOT EXISTS discount_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    discount_rule_id UUID REFERENCES discount_rules(id) ON DELETE CASCADE,
    order_id VARCHAR(255),
    customer_id VARCHAR(255),
    discount_amount DECIMAL(10, 2),
    original_amount DECIMAL(10, 2),
    final_amount DECIMAL(10, 2),
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB
);

-- Customer segments for targeted discounts
CREATE TABLE IF NOT EXISTS customer_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    criteria JSONB NOT NULL, -- {total_spent: {min: 100}, order_count: {min: 5}, tags: ['vip']}
    customer_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_segment_name_per_store UNIQUE(store_id, name)
);

-- Discount codes table
CREATE TABLE IF NOT EXISTS discount_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    discount_rule_id UUID REFERENCES discount_rules(id) ON DELETE CASCADE,
    code VARCHAR(100) NOT NULL,
    usage_limit INTEGER,
    usage_count INTEGER DEFAULT 0,
    customer_usage_limit INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_code_per_store UNIQUE(store_id, code)
);

-- Audit log for discount changes
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL, -- 'discount_rule', 'subscription_discount', etc.
    entity_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL, -- 'created', 'updated', 'deleted', 'activated', 'deactivated'
    changes JSONB,
    performed_by VARCHAR(255),
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_stores_shop_domain ON stores(shop_domain);
CREATE INDEX idx_stores_active ON stores(is_active);
CREATE INDEX idx_discount_rules_store_id ON discount_rules(store_id);
CREATE INDEX idx_discount_rules_active ON discount_rules(is_active);
CREATE INDEX idx_discount_rules_dates ON discount_rules(starts_at, ends_at);
CREATE INDEX idx_subscription_discounts_store_id ON subscription_discounts(store_id);
CREATE INDEX idx_subscription_discounts_status ON subscription_discounts(status);
CREATE INDEX idx_subscription_discounts_customer ON subscription_discounts(customer_id);
CREATE INDEX idx_discount_usage_store_id ON discount_usage(store_id);
CREATE INDEX idx_discount_usage_customer ON discount_usage(customer_id);
CREATE INDEX idx_discount_codes_store_id ON discount_codes(store_id);
CREATE INDEX idx_discount_codes_code ON discount_codes(code);
CREATE INDEX idx_audit_logs_store_id ON audit_logs(store_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON stores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_discount_rules_updated_at BEFORE UPDATE ON discount_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_discounts_updated_at BEFORE UPDATE ON subscription_discounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_segments_updated_at BEFORE UPDATE ON customer_segments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();