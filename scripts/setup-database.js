#!/usr/bin/env node

require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
  console.log('🚀 Setting up database...\n');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Create update_updated_at_column function first
    console.log('Creating helper functions...');
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // Read and execute main schema
    console.log('Creating main tables...');
    const schemaPath = path.join(__dirname, '..', 'server', 'database', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute the entire schema as one statement (handles functions better)
    try {
      await client.query(schema);
    } catch (err) {
      if (!err.message.includes('already exists')) {
        console.error('Error creating main tables:', err.message);
      }
    }
    console.log('✅ Main tables created\n');

    // Read and execute support schema
    console.log('Creating support tables...');
    const supportSchemaPath = path.join(__dirname, '..', 'server', 'database', 'support_schema.sql');
    const supportSchema = fs.readFileSync(supportSchemaPath, 'utf8');
    
    // Execute the entire support schema
    try {
      await client.query(supportSchema);
    } catch (err) {
      if (!err.message.includes('already exists')) {
        console.error('Error creating support tables:', err.message);
      }
    }
    console.log('✅ Support tables created\n');

    // Add missing columns if they don't exist
    console.log('Adding additional columns...');
    try {
      await client.query(`ALTER TABLE stores ADD COLUMN IF NOT EXISTS plan VARCHAR(50) DEFAULT 'starter';`);
      await client.query(`ALTER TABLE stores ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP;`);
    } catch (err) {
      // Ignore if columns already exist
    }

    // Insert sample data for development
    if (process.env.NODE_ENV === 'development') {
      console.log('Inserting sample data for development...');
      
      // Sample store
      await client.query(`
        INSERT INTO stores (shop_domain, access_token, is_active, plan)
        VALUES ('test-shop.myshopify.com', 'test_token', true, 'starter')
        ON CONFLICT (shop_domain) DO NOTHING;
      `);

      // Sample canned responses
      await client.query(`
        INSERT INTO canned_responses (title, content, category, shortcut)
        VALUES 
          ('Decimal Discount Help', 'To create decimal percentage discounts:\n1. Go to Discounts → Create New\n2. Select "Percentage" as type\n3. Enter decimal value (e.g., 12.75%)\n4. System supports up to 4 decimal places', 'technical', '/decimal'),
          ('Billing Information', 'Our plans:\n• Starter ($29/mo): 10 discounts\n• Growth ($79/mo): Unlimited + AI\n• Pro ($199/mo): Everything + API\n\nAll include 14-day free trial.', 'billing', '/billing'),
          ('Getting Started', 'Welcome! To get started:\n1. Complete onboarding wizard\n2. Create your first discount\n3. Test with sample order\n4. Check analytics\n\nNeed help? Visit docs.discountmanager.com', 'general', '/start')
        ON CONFLICT (shortcut) DO NOTHING;
      `);

      console.log('✅ Sample data inserted\n');
    }

    // Verify tables
    console.log('Verifying installation...');
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    console.log('\n📊 Created tables:');
    tables.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}`);
    });

    console.log('\n✨ Database setup complete!\n');
    console.log('You can now run: npm run dev\n');

  } catch (error) {
    console.error('❌ Error setting up database:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run if called directly
if (require.main === module) {
  setupDatabase();
}

module.exports = setupDatabase;