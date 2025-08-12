require('dotenv').config();
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const { join } = require('path');

// Database
const pool = require('./database/db');

const PORT = process.env.PORT || 8080;
const isDevelopment = process.env.NODE_ENV === 'development';

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:8080'],
  credentials: true
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));

// Simple auth middleware for development
const devAuth = (req, res, next) => {
  // In development, just pass through
  if (isDevelopment) {
    req.session = { shop: 'test-shop.myshopify.com' };
    next();
  } else {
    res.status(401).json({ error: 'Authentication required' });
  }
};

// Import routes with fixed paths
const discountRoutes = require('./routes/discounts');
const subscriptionRoutes = require('./routes/subscriptions');
const billingRoutes = require('./routes/billing');
const gdprRoutes = require('./routes/gdpr');
const supportRoutes = require('./routes/support');

// GDPR routes (public)
app.use('/api/gdpr', gdprRoutes);

// Protected API routes (use dev auth in development)
app.use('/api/discounts', devAuth, discountRoutes);
app.use('/api/subscriptions', devAuth, subscriptionRoutes);
app.use('/api/billing', devAuth, billingRoutes);
app.use('/api/support', devAuth, supportRoutes);

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
    console.log('🚀 Starting server in DEVELOPMENT mode...\n');
    
    // Test database connection
    const client = await pool.connect();
    console.log('✅ Database connected');
    client.release();
    
    app.listen(PORT, () => {
      console.log(`\n✅ Server is running on port ${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV}`);
      console.log(`🔗 Backend URL: http://localhost:${PORT}`);
      console.log(`🎨 Frontend URL: http://localhost:3000`);
      console.log(`\n📝 Available endpoints:`);
      console.log(`   Health: http://localhost:${PORT}/api/health`);
      console.log(`   Discounts: http://localhost:${PORT}/api/discounts`);
      console.log(`   Support: http://localhost:${PORT}/api/support/tickets`);
      console.log(`\n🔐 Authentication: DISABLED (development mode)`);
      console.log(`   Using mock shop: test-shop.myshopify.com`);
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