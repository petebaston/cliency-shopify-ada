const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { shopifyApi } = require('@shopify/shopify-api');

/**
 * Verify HMAC signature for webhook validation
 */
function verifyWebhookSignature(rawBody, signature, secret) {
  const hash = crypto
    .createHmac('sha256', secret)
    .update(rawBody, 'utf8')
    .digest('base64');
  
  return hash === signature;
}

/**
 * Verify Shopify request authenticity
 */
function verifyShopifyRequest(req, res, next) {
  const { shop, timestamp, hmac, ...params } = req.query;
  
  if (!shop || !timestamp || !hmac) {
    return res.status(401).json({ error: 'Missing required parameters' });
  }

  // Check timestamp to prevent replay attacks (must be within 1 minute)
  const currentTime = Math.floor(Date.now() / 1000);
  if (Math.abs(currentTime - parseInt(timestamp)) > 60) {
    return res.status(401).json({ error: 'Request timestamp expired' });
  }

  // Build message from query params
  const message = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  const fullMessage = `shop=${shop}&timestamp=${timestamp}&${message}`;
  
  // Calculate HMAC
  const calculatedHmac = crypto
    .createHmac('sha256', process.env.SHOPIFY_API_SECRET)
    .update(fullMessage)
    .digest('hex');

  if (calculatedHmac !== hmac) {
    return res.status(401).json({ error: 'Invalid HMAC signature' });
  }

  next();
}

/**
 * Verify App Bridge session token
 */
async function verifySessionToken(req, res, next) {
  const sessionToken = req.get('authorization')?.replace('Bearer ', '');
  
  if (!sessionToken) {
    return res.status(401).json({ error: 'No session token provided' });
  }

  try {
    // Decode without verification first to get the shop domain
    const payload = jwt.decode(sessionToken);
    
    if (!payload) {
      return res.status(401).json({ error: 'Invalid session token' });
    }

    // Check token expiry
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp <= now) {
      return res.status(401).json({ error: 'Session token expired' });
    }

    // Verify token with Shopify's public key
    const shopifyClient = new shopifyApi({
      apiKey: process.env.SHOPIFY_API_KEY,
      apiSecretKey: process.env.SHOPIFY_API_SECRET,
      apiVersion: '2024-01',
      hostName: process.env.HOST,
    });

    const isValid = await shopifyClient.auth.verifySessionToken(sessionToken);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid session token signature' });
    }

    // Add shop domain to request for later use
    req.shopDomain = payload.dest.replace('https://', '');
    req.shopifySession = payload;
    
    next();
  } catch (error) {
    console.error('Session token verification error:', error);
    return res.status(401).json({ error: 'Session token verification failed' });
  }
}

/**
 * Check if shop has active billing
 */
async function requiresActiveBilling(req, res, next) {
  try {
    const shop = req.shopDomain || req.query.shop;
    
    if (!shop) {
      return res.status(400).json({ error: 'Shop domain required' });
    }

    // Check if shop has active subscription in database
    const { query } = require('../database/init');
    const result = await query(
      `SELECT * FROM shop_subscriptions 
       WHERE shop_domain = $1 
       AND status = 'active' 
       AND (expires_at IS NULL OR expires_at > NOW())`,
      [shop]
    );

    if (result.rows.length === 0) {
      return res.status(402).json({ 
        error: 'Active subscription required',
        redirectUrl: `/billing?shop=${shop}`
      });
    }

    req.subscription = result.rows[0];
    next();
  } catch (error) {
    console.error('Billing check error:', error);
    return res.status(500).json({ error: 'Failed to verify billing status' });
  }
}

/**
 * Rate limiting middleware
 */
const rateLimitMap = new Map();

function rateLimit(maxRequests = 100, windowMs = 60000) {
  return (req, res, next) => {
    const shop = req.shopDomain || req.query.shop || 'unknown';
    const key = `${shop}:${req.path}`;
    const now = Date.now();
    
    if (!rateLimitMap.has(key)) {
      rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    const limit = rateLimitMap.get(key);
    
    if (now > limit.resetTime) {
      limit.count = 1;
      limit.resetTime = now + windowMs;
      return next();
    }
    
    if (limit.count >= maxRequests) {
      return res.status(429).json({ 
        error: 'Too many requests',
        retryAfter: Math.ceil((limit.resetTime - now) / 1000)
      });
    }
    
    limit.count++;
    next();
  };
}

module.exports = {
  verifyWebhookSignature,
  verifyShopifyRequest,
  verifySessionToken,
  requiresActiveBilling,
  rateLimit,
};