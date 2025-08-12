import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from '@shopify/polaris';
import enTranslations from '@shopify/polaris/locales/en.json';
import '@shopify/polaris/build/esm/styles.css';

import AppBridgeProvider from './providers/AppBridgeProvider';
import EnhancedDashboard from './pages/EnhancedDashboard';
import DiscountList from './pages/DiscountList';
import CreateDiscount from './pages/CreateDiscount';
import EditDiscount from './pages/EditDiscount';
import SubscriptionList from './pages/SubscriptionList';
import EditSubscription from './pages/EditSubscription';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import Billing from './pages/Billing';
import Layout from './components/Layout';

function App() {
  return (
    <AppProvider i18n={enTranslations}>
      <AppBridgeProvider>
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<EnhancedDashboard />} />
              <Route path="/billing" element={<Billing />} />
              <Route path="/discounts" element={<DiscountList />} />
              <Route path="/discounts/new" element={<CreateDiscount />} />
              <Route path="/discounts/:id/edit" element={<EditDiscount />} />
              <Route path="/subscriptions" element={<SubscriptionList />} />
              <Route path="/subscriptions/:id/edit" element={<EditSubscription />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </Layout>
        </Router>
      </AppBridgeProvider>
    </AppProvider>
  );
}

export default App;
