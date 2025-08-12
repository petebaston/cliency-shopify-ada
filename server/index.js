require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const { shopifyApp } = require('@shopify/shopify-app-express');
const { PostgreSQLSessionStorage } = require('@shopify/shopify-app-session-storage-postgresql');
const { join } = require('path');

// Routes
const discountRoutes = require('./routes/discounts');
const subscriptionRoutes = require('./routes/subscriptions');
const billingRoutes = require('./routes/billing');
const gdprRoutes = require('./routes/gdpr');
const webhookRoutes = require('./routes/webhooks');

// Middleware
const { verifySessionToken, requiresActiveBilling, rateLimit } = require('./middleware/auth');

// Database
const { initializeDatabase } = require('./database/init');

const PORT = process.env.PORT || 8080;
const isDevelopment = process.env.NODE_ENV === 'development';

// Configure Shopify App
const shopify = shopifyApp({
  api: {
    apiKey: process.env.SHOPIFY_API_KEY,
    apiSecretKey: process.env.SHOPIFY_API_SECRET,
    scopes: process.env.SCOPES?.split(',') || [
      'write_products',
      'read_products',
      'write_discounts',
      'read_discounts',
      'write_orders',
      'read_orders',
      'write_customers',
      'read_customers',
      'write_script_tags',
      'read_script_tags',
    ],
    hostName: process.env.HOST?.replace(/https?:\/\//, ''),
    apiVersion: '2024-01',
    billing: {
      required: true,
      plans: {
        starter: {
          amount: 29.00,
          currencyCode: 'USD',
          interval: 'EVERY_30_DAYS',
          trialDays: 14,
        },
        growth: {
          amount: 79.00,
          currencyCode: 'USD',
          interval: 'EVERY_30_DAYS',
          trialDays: 14,
        },
        pro: {
          amount: 199.00,
          currencyCode: 'USD',
          interval: 'EVERY_30_DAYS',
          trialDays: 14,
        },
      },
    },
  },
  auth: {
    path: '/api/auth',
    callbackPath: '/api/auth/callback',
  },
  webhooks: {
    path: '/api/webhooks',
    // Configure mandatory webhooks
    webhooks: [
      {
        topic: 'APP_UNINSTALLED',
        path: '/api/webhooks/app_uninstalled',
      },
      {
        topic: 'CUSTOMERS_DATA_REQUEST',
        path: '/api/gdpr/customers/data_request',
      },
      {
        topic: 'CUSTOMERS_REDACT',
        path: '/api/gdpr/customers/redact',
      },
      {
        topic: 'SHOP_REDACT',
        path: '/api/gdpr/shop/redact',
      },
      {
        topic: 'ORDERS_CREATE',
        path: '/api/webhooks/orders/create',
      },
      {
        topic: 'ORDERS_UPDATED',
        path: '/api/webhooks/orders/updated',
      },
      {
        topic: 'SUBSCRIPTION_CONTRACTS_CREATE',
        path: '/api/webhooks/subscription_contracts/create',
      },
      {
        topic: 'SUBSCRIPTION_CONTRACTS_UPDATE',
        path: '/api/webhooks/subscription_contracts/update',
      },
    ],
  },
  sessionStorage: new PostgreSQLSessionStorage(process.env.DATABASE_URL),
  useOnlineTokens: true, // Required for embedded apps
});

const app = express();

// Store raw body for webhook signature verification
app.use('/api/gdpr/*', express.raw({ type: 'application/json' }));
app.use('/api/webhooks/*', express.raw({ type: 'application/json' }));

// Security headers with proper CSP for embedded apps
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          'https://cdn.shopify.com',
          'https://cdnjs.cloudflare.com',
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://cdn.shopify.com',
        ],
        imgSrc: [
          "'self'",
          'data:',
          'https:',
        ],
        connectSrc: [
          "'self'",
          'https://*.myshopify.com',
          'https://api.shopify.com',
        ],
        frameSrc: [
          "'self'",
          'https://*.myshopify.com',
        ],
        frameAncestors: [
          'https://*.myshopify.com',
          'https://admin.shopify.com',
        ],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// CORS configuration for embedded apps
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow Shopify admin and development
      const allowedOrigins = [
        /^https:\/\/[a-zA-Z0-9-]+\.myshopify\.com$/,
        /^https:\/\/admin\.shopify\.com$/,
      ];
      
      if (isDevelopment) {
        allowedOrigins.push(/^http:\/\/localhost:\d+$/);
      }
      
      const isAllowed = !origin || allowedOrigins.some(pattern => pattern.test(origin));
      callback(null, isAllowed);
    },
    credentials: true,
  })
);

app.use(compression());
app.use(express.json({ limit: '10mb' }));

// OAuth routes
app.get(shopify.config.auth.path, shopify.auth.begin());
app.get(
  shopify.config.auth.callbackPath,
  shopify.auth.callback(),
  shopify.redirectToShopifyOrAppRoot()
);

// GDPR mandatory webhooks (must be public)
app.use('/api/gdpr', gdprRoutes);

// Process Shopify webhooks
app.post(
  shopify.config.webhooks.path,
  shopify.processWebhooks({ webhookHandlers: require('./webhooks') })
);

// App Bridge authentication for all API routes
app.use('/api/*', shopify.validateAuthenticatedSession());

// Billing routes (check subscription status)
app.use('/api/billing', billingRoutes);

// Protected API routes (require active billing)
app.use('/api/discounts', requiresActiveBilling, rateLimit(100, 60000), discountRoutes);
app.use('/api/subscriptions', requiresActiveBilling, rateLimit(100, 60000), subscriptionRoutes);
app.use('/api/webhooks', webhookRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV,
  });
});

// Serve React app for embedded experience
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, '../client/build')));
  
  app.get('/*', (req, res) => {
    res.sendFile(join(__dirname, '../client/build', 'index.html'));
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // Don't expose internal errors in production
  const message = isDevelopment 
    ? err.message 
    : 'An error occurred processing your request';
  
  res.status(err.status || 500).json({
    error: {
      message,
      status: err.status || 500,
      ...(isDevelopment && { stack: err.stack }),
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      message: 'Endpoint not found',
      status: 404,
    },
  });
});

// Start server
async function startServer() {
  try {
    console.log('Initializing database...');
    await initializeDatabase();
    
    app.listen(PORT, () => {
      console.log(`✅ Server is running on port ${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV}`);
      console.log(`🔗 App URL: ${process.env.HOST}`);
      console.log(`🏪 Shopify API Version: 2024-01`);
      
      if (isDevelopment) {
        console.log(`\n📝 Development URLs:`);
        console.log(`   Auth: ${process.env.HOST}/api/auth`);
        console.log(`   Callback: ${process.env.HOST}/api/auth/callback`);
        console.log(`   GDPR Webhooks: ${process.env.HOST}/api/gdpr/*`);
      }
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

startServer();