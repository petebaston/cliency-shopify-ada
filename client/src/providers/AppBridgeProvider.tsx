import React, { useEffect, useState } from 'react';
import { Provider } from '@shopify/app-bridge-react';
import { Banner, Spinner } from '@shopify/polaris';

interface AppBridgeProviderProps {
  children: React.ReactNode;
}

function AppBridgeProvider({ children }: AppBridgeProviderProps) {
  const [appBridgeConfig, setAppBridgeConfig] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get shop domain from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const shop = urlParams.get('shop');
    const host = urlParams.get('host');

    if (!shop || !host) {
      setError('Missing required parameters. Please reinstall the app from your Shopify admin.');
      return;
    }

    // Validate shop domain format
    const shopRegex = /^[a-zA-Z0-9-]+\.myshopify\.com$/;
    if (!shopRegex.test(shop)) {
      setError('Invalid shop domain format.');
      return;
    }

    const config = {
      apiKey: process.env.REACT_APP_SHOPIFY_API_KEY || '',
      host: host,
      forceRedirect: true,
    };

    setAppBridgeConfig(config);
  }, []);

  if (error) {
    return (
      <div style={{ padding: '20px' }}>
        <Banner status="critical" title="Configuration Error">
          <p>{error}</p>
        </Banner>
      </div>
    );
  }

  if (!appBridgeConfig) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <Spinner size="large" />
      </div>
    );
  }

  return (
    <Provider config={appBridgeConfig}>
      {children}
    </Provider>
  );
}

export default AppBridgeProvider;