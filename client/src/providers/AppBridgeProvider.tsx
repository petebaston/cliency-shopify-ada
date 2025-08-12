import React, { useEffect, useState } from 'react';
// App Bridge Provider is temporarily disabled for development
// import { Provider } from '@shopify/app-bridge-react';
import { Banner, Spinner } from '@shopify/polaris';

interface AppBridgeProviderProps {
  children: React.ReactNode;
}

function AppBridgeProvider({ children }: AppBridgeProviderProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // In development mode, skip App Bridge initialization
    if (process.env.NODE_ENV === 'development') {
      setLoading(false);
      return;
    }

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

    setLoading(false);
  }, []);

  if (error) {
    return (
      <div style={{ padding: '20px' }}>
        <Banner tone="critical">
          <p>{error}</p>
        </Banner>
      </div>
    );
  }

  if (loading) {
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

  // In development, just render children without App Bridge
  return <>{children}</>;
}

export default AppBridgeProvider;