-- Support System Database Schema

-- Support tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number VARCHAR(20) UNIQUE NOT NULL,
    shop_domain VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_name VARCHAR(255),
    subject VARCHAR(500) NOT NULL,
    category VARCHAR(50), -- 'billing', 'technical', 'feature', 'other'
    priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
    status VARCHAR(50) DEFAULT 'open', -- 'open', 'in_progress', 'waiting_customer', 'resolved', 'closed'
    assigned_to VARCHAR(255), -- admin email
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    first_response_at TIMESTAMP,
    satisfaction_rating INTEGER, -- 1-5 stars
    tags TEXT[], -- array of tags
    metadata JSONB
);

-- Support messages table (for chat history)
CREATE TABLE IF NOT EXISTS support_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_type VARCHAR(20) NOT NULL, -- 'customer', 'admin', 'system', 'bot'
    sender_id VARCHAR(255),
    sender_name VARCHAR(255),
    message TEXT NOT NULL,
    attachments JSONB, -- [{url, name, size, type}]
    is_internal_note BOOLEAN DEFAULT FALSE,
    read_by_customer BOOLEAN DEFAULT FALSE,
    read_by_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Canned responses table
CREATE TABLE IF NOT EXISTS canned_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(50),
    shortcut VARCHAR(50) UNIQUE, -- e.g., '/billing-help'
    usage_count INTEGER DEFAULT 0,
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Support agents table
CREATE TABLE IF NOT EXISTS support_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'agent', -- 'agent', 'supervisor', 'admin'
    avatar_url TEXT,
    is_online BOOLEAN DEFAULT FALSE,
    last_seen_at TIMESTAMP,
    specialties TEXT[], -- ['billing', 'technical', 'onboarding']
    active_tickets INTEGER DEFAULT 0,
    total_resolved INTEGER DEFAULT 0,
    average_rating DECIMAL(3, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customer support profiles
CREATE TABLE IF NOT EXISTS customer_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_domain VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    plan VARCHAR(50),
    total_tickets INTEGER DEFAULT 0,
    total_spent DECIMAL(10, 2),
    lifetime_value DECIMAL(10, 2),
    tags TEXT[],
    notes TEXT,
    vip_status BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_contact_at TIMESTAMP,
    UNIQUE(shop_domain, email)
);

-- Knowledge base articles
CREATE TABLE IF NOT EXISTS knowledge_base (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(500) UNIQUE NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(100),
    tags TEXT[],
    views INTEGER DEFAULT 0,
    helpful_count INTEGER DEFAULT 0,
    not_helpful_count INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT FALSE,
    author VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Support analytics
CREATE TABLE IF NOT EXISTS support_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    total_tickets INTEGER DEFAULT 0,
    resolved_tickets INTEGER DEFAULT 0,
    avg_response_time_minutes INTEGER,
    avg_resolution_time_hours INTEGER,
    satisfaction_score DECIMAL(3, 2),
    busiest_hour INTEGER,
    top_categories JSONB,
    agent_performance JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date)
);

-- Email templates for notifications
CREATE TABLE IF NOT EXISTS email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    subject VARCHAR(500) NOT NULL,
    html_content TEXT NOT NULL,
    text_content TEXT,
    variables TEXT[], -- ['customer_name', 'ticket_number', etc.]
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Support automation rules
CREATE TABLE IF NOT EXISTS automation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    trigger_type VARCHAR(50), -- 'keyword', 'category', 'time_based', 'customer_segment'
    trigger_conditions JSONB,
    actions JSONB, -- [{type: 'assign', value: 'agent@email'}, {type: 'tag', value: 'urgent'}]
    is_active BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_tickets_shop ON support_tickets(shop_domain);
CREATE INDEX idx_tickets_status ON support_tickets(status);
CREATE INDEX idx_tickets_assigned ON support_tickets(assigned_to);
CREATE INDEX idx_tickets_created ON support_tickets(created_at DESC);
CREATE INDEX idx_messages_ticket ON support_messages(ticket_id);
CREATE INDEX idx_messages_created ON support_messages(created_at);
CREATE INDEX idx_customer_profiles_shop ON customer_profiles(shop_domain);
CREATE INDEX idx_customer_profiles_email ON customer_profiles(email);
CREATE INDEX idx_kb_slug ON knowledge_base(slug);
CREATE INDEX idx_kb_published ON knowledge_base(is_published);
CREATE INDEX idx_analytics_date ON support_analytics(date DESC);

-- Triggers for updated_at
CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON support_tickets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_canned_responses_updated_at BEFORE UPDATE ON canned_responses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kb_updated_at BEFORE UPDATE ON knowledge_base
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();