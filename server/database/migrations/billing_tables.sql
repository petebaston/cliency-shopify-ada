-- Billing and GDPR compliance tables

-- Shop subscriptions table
CREATE TABLE IF NOT EXISTS shop_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_domain VARCHAR(255) UNIQUE NOT NULL,
    charge_id BIGINT UNIQUE,
    plan VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    price DECIMAL(10, 2),
    trial_ends_at TIMESTAMP,
    activated_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Billing charges tracking
CREATE TABLE IF NOT EXISTS billing_charges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_domain VARCHAR(255) NOT NULL,
    charge_id BIGINT UNIQUE NOT NULL,
    plan VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    confirmation_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Usage charges for metered billing
CREATE TABLE IF NOT EXISTS usage_charges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_domain VARCHAR(255) NOT NULL,
    charge_id BIGINT NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- GDPR compliance requests tracking
CREATE TABLE IF NOT EXISTS gdpr_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_domain VARCHAR(255),
    customer_id VARCHAR(255),
    request_type VARCHAR(50) NOT NULL, -- 'data_request', 'customer_redact', 'shop_redact'
    status VARCHAR(50) DEFAULT 'pending',
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    notes TEXT
);

-- Shopify sessions storage
CREATE TABLE IF NOT EXISTS shopify_sessions (
    id VARCHAR(255) PRIMARY KEY,
    shop VARCHAR(255) NOT NULL,
    state VARCHAR(255),
    isOnline BOOLEAN DEFAULT FALSE,
    accessToken VARCHAR(255),
    expires TIMESTAMP,
    scope VARCHAR(500),
    onlineAccessInfo JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- App installation tracking
CREATE TABLE IF NOT EXISTS app_installations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_domain VARCHAR(255) UNIQUE NOT NULL,
    access_token TEXT,
    scope VARCHAR(500),
    installed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    uninstalled_at TIMESTAMP,
    reinstalled_count INTEGER DEFAULT 0,
    last_webhook_at TIMESTAMP
);

-- Webhook tracking for reliability
CREATE TABLE IF NOT EXISTS webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_domain VARCHAR(255),
    topic VARCHAR(255) NOT NULL,
    payload JSONB,
    status VARCHAR(50),
    attempts INTEGER DEFAULT 1,
    last_attempt_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    error_message TEXT
);

-- API rate limiting tracking
CREATE TABLE IF NOT EXISTS rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_domain VARCHAR(255) NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    requests_count INTEGER DEFAULT 0,
    window_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(shop_domain, endpoint, window_start)
);

-- Indexes for performance
CREATE INDEX idx_shop_subscriptions_shop ON shop_subscriptions(shop_domain);
CREATE INDEX idx_shop_subscriptions_status ON shop_subscriptions(status);
CREATE INDEX idx_billing_charges_shop ON billing_charges(shop_domain);
CREATE INDEX idx_gdpr_requests_shop ON gdpr_requests(shop_domain);
CREATE INDEX idx_gdpr_requests_customer ON gdpr_requests(customer_id);
CREATE INDEX idx_shopify_sessions_shop ON shopify_sessions(shop);
CREATE INDEX idx_app_installations_shop ON app_installations(shop_domain);
CREATE INDEX idx_webhook_logs_shop ON webhook_logs(shop_domain);
CREATE INDEX idx_rate_limits_shop ON rate_limits(shop_domain);

-- Update triggers
CREATE TRIGGER update_shop_subscriptions_updated_at BEFORE UPDATE ON shop_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_billing_charges_updated_at BEFORE UPDATE ON billing_charges
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shopify_sessions_updated_at BEFORE UPDATE ON shopify_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();