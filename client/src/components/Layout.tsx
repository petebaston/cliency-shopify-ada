import React, { useState, useCallback } from 'react';
import { Frame, Navigation, TopBar, Toast } from '@shopify/polaris';
import {
  HomeIcon,
  DiscountIcon,
  OrderIcon,
  ChartLineIcon,
  SettingsIcon,
  ChatIcon,
} from '@shopify/polaris-icons';
import { useNavigate, useLocation } from 'react-router-dom';
import SupportChat from './SupportChat';

interface LayoutProps {
  children: React.ReactNode;
}

function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileNavigationActive, setMobileNavigationActive] = useState(false);
  const [toastActive, setToastActive] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const toggleMobileNavigation = useCallback(
    () => setMobileNavigationActive((active) => !active),
    []
  );

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    setToastActive(true);
  }, []);

  const toggleToast = useCallback(() => setToastActive((active) => !active), []);

  const userMenuMarkup = (
    <TopBar.UserMenu
      name="Merchant"
      initials="M"
      actions={[
        {
          items: [
            {
              content: 'Account settings',
              onAction: () => navigate('/settings'),
            },
            {
              content: 'Help & Support',
              onAction: () => window.open('https://help.shopify.com', '_blank'),
            },
          ],
        },
      ]}
    />
  );

  const topBarMarkup = (
    <TopBar
      showNavigationToggle
      userMenu={userMenuMarkup}
      onNavigationToggle={toggleMobileNavigation}
    />
  );

  const navigationMarkup = (
    <Navigation location={location.pathname}>
      <Navigation.Section
        items={[
          {
            url: '/',
            label: 'Dashboard',
            icon: HomeIcon,
            selected: location.pathname === '/',
            onClick: () => navigate('/'),
          },
          {
            url: '/discounts',
            label: 'Discounts',
            icon: DiscountIcon,
            selected: location.pathname.startsWith('/discounts'),
            onClick: () => navigate('/discounts'),
            subNavigationItems: [
              {
                url: '/discounts',
                label: 'All Discounts',
                onClick: () => navigate('/discounts'),
              },
              {
                url: '/discounts/new',
                label: 'Create Discount',
                onClick: () => navigate('/discounts/new'),
              },
            ],
          },
          {
            url: '/subscriptions',
            label: 'Subscriptions',
            icon: OrderIcon,
            selected: location.pathname.startsWith('/subscriptions'),
            onClick: () => navigate('/subscriptions'),
          },
          {
            url: '/analytics',
            label: 'Analytics',
            icon: ChartLineIcon,
            selected: location.pathname === '/analytics',
            onClick: () => navigate('/analytics'),
          },
        ]}
      />
      <Navigation.Section
        title="Settings"
        items={[
          {
            url: '/settings',
            label: 'Settings',
            icon: SettingsIcon,
            selected: location.pathname === '/settings',
            onClick: () => navigate('/settings'),
          },
          {
            url: '/admin/support',
            label: 'Admin Support',
            icon: ChatIcon,
            selected: location.pathname === '/admin/support',
            onClick: () => navigate('/admin/support'),
            badge: '3', // Number of pending tickets
          },
        ]}
      />
    </Navigation>
  );

  return (
    <Frame
      logo={{
        width: 86,
        contextualSaveBarSource:
          'https://cdn.shopify.com/s/files/1/0446/6937/files/jaded-pixel-logo-gray.svg?6215648040070010999',
        url: '/',
        accessibilityLabel: 'Discount Manager',
      }}
      topBar={topBarMarkup}
      navigation={navigationMarkup}
      showMobileNavigation={mobileNavigationActive}
      onNavigationDismiss={toggleMobileNavigation}
    >
      {children}
      {toastActive && (
        <Toast content={toastMessage} onDismiss={toggleToast} />
      )}
      <SupportChat 
        shopDomain="demo-store.myshopify.com"
        userEmail="merchant@example.com"
        userName="Merchant"
      />
    </Frame>
  );
}

export default Layout;