# 🚀 Quick Start Guide - Discount Manager Pro

## Prerequisites
- Node.js 16+ installed
- npm or yarn installed
- PostgreSQL database (you already have Neon DB configured ✅)

## Step 1: Install Dependencies

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd client
npm install --legacy-peer-deps
cd ..
```

## Step 2: Setup Database

```bash
# This will create all necessary tables in your Neon database
npm run setup
```

## Step 3: Start the Application

```bash
# Start both backend and frontend
npm run dev
```

The app will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8080

## 🎯 What You Can Do Without Shopify Connection

Even without a real Shopify store, you can:

1. **Browse the UI** - All pages and components are functional
2. **Admin Support Dashboard** - Access at http://localhost:3000/admin/support
3. **View Mock Data** - Sample discounts and analytics
4. **Test Support Chat** - Floating chat widget works with mock responses
5. **Explore Features** - All UI components are interactive

## 📝 Default Test Credentials

Since we're in development mode:
- Shop Domain: `test-shop.myshopify.com`
- Admin Email: `admin@discountmanager.com`

## 🔧 Troubleshooting

### Database Connection Issues
If you see database errors:
1. Check your .env file has the correct DATABASE_URL
2. Ensure your Neon database is active
3. Run `npm run setup` to create tables

### Port Already in Use
If port 8080 or 3000 is busy:
```bash
# Change backend port in .env
PORT=8081

# For frontend, it will auto-select next available port
```

### Module Not Found Errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
rm -rf client/node_modules client/package-lock.json
npm install
cd client && npm install --legacy-peer-deps
```

## 🎨 Accessing Key Features

### Admin Support System
Navigate to: http://localhost:3000/admin/support
- View mock support tickets
- Test ticket management interface
- See analytics and metrics

### Discount Management
Navigate to: http://localhost:3000/discounts
- Browse sample discounts
- Test decimal percentage precision
- Create/edit discount forms

### Billing Page
Navigate to: http://localhost:3000/billing
- View pricing tiers
- Test plan selection UI
- See trial countdown

## 📊 Database Overview

Your Neon database now contains:
- `stores` - Shop configurations
- `discount_rules` - Discount definitions with decimal precision
- `subscription_discounts` - Subscription-specific discounts
- `support_tickets` - Customer support tickets
- `support_messages` - Ticket conversations
- `canned_responses` - Quick reply templates
- Plus 10+ other supporting tables

## 🚢 Next Steps for Production

When you're ready to connect to a real Shopify store:

1. **Create Shopify Partner Account**
   - Go to partners.shopify.com
   - Create a new app

2. **Update .env with Real Credentials**
   ```
   SHOPIFY_API_KEY=your_real_api_key
   SHOPIFY_API_SECRET=your_real_api_secret
   HOST=https://your-app-url.com
   ```

3. **Deploy to Production**
   - Use services like Heroku, Railway, or Render
   - Ensure HTTPS is enabled
   - Set up proper domain

4. **Install on Development Store**
   - Create a development store in Partner Dashboard
   - Install your app for testing

## 💡 Tips

- The app uses mock data in development mode, so you can explore all features
- Check the browser console for any errors
- The support chat widget appears in the bottom-right corner
- Admin support dashboard shows sample tickets with various statuses

## 🆘 Getting Help

- Check `TEST_REPORT.md` for test coverage details
- Review `server/README.md` for API documentation
- See `client/README.md` for frontend architecture

---

**Ready to start?** Run `npm run dev` and explore your new Shopify app! 🎉