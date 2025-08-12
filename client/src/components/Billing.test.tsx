import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Billing from '../pages/Billing';
import { BrowserRouter } from 'react-router-dom';
import api from '../services/api';

// Mock dependencies
jest.mock('../services/api');
jest.mock('@shopify/app-bridge-react', () => ({
  useAppBridge: () => ({
    dispatch: jest.fn(),
  }),
  Redirect: {
    create: () => ({
      dispatch: jest.fn(),
    }),
  },
}));
jest.mock('canvas-confetti', () => jest.fn());

const mockApi = api as jest.Mocked<typeof api>;

const renderBilling = () => {
  return render(
    <BrowserRouter>
      <Billing />
    </BrowserRouter>
  );
};

describe('Billing Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders billing plans', async () => {
    mockApi.get.mockResolvedValue({
      data: {
        hasActiveSubscription: false,
        requiresBilling: true,
      },
    });

    renderBilling();

    await waitFor(() => {
      expect(screen.getByText('Billing & Plans')).toBeInTheDocument();
      expect(screen.getByText('Starter')).toBeInTheDocument();
      expect(screen.getByText('Growth')).toBeInTheDocument();
      expect(screen.getByText('Pro')).toBeInTheDocument();
    });
  });

  test('shows current plan when subscription is active', async () => {
    mockApi.get.mockResolvedValue({
      data: {
        hasActiveSubscription: true,
        subscription: {
          plan: 'growth',
          planName: 'Growth Plan',
          price: 79,
          features: {
            maxDiscounts: null,
            aiRecommendations: true,
            advancedAnalytics: true,
            prioritySupport: false,
          },
          isInTrial: true,
          trialEndsAt: '2024-12-31',
        },
      },
    });

    renderBilling();

    await waitFor(() => {
      expect(screen.getByText('Current Plan')).toBeInTheDocument();
      expect(screen.getByText('Growth Plan')).toBeInTheDocument();
    });
  });

  test('shows trial banner when in trial period', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);

    mockApi.get.mockResolvedValue({
      data: {
        hasActiveSubscription: true,
        subscription: {
          plan: 'starter',
          planName: 'Starter Plan',
          price: 29,
          isInTrial: true,
          trialEndsAt: futureDate.toISOString(),
        },
      },
    });

    renderBilling();

    await waitFor(() => {
      expect(screen.getByText(/Free trial: \d+ days remaining/)).toBeInTheDocument();
    });
  });

  test('handles plan selection and upgrade', async () => {
    mockApi.get.mockResolvedValue({
      data: {
        hasActiveSubscription: false,
      },
    });

    mockApi.post.mockResolvedValue({
      data: {
        confirmationUrl: 'https://test-shop.myshopify.com/admin/charges/confirm',
      },
    });

    renderBilling();

    await waitFor(() => {
      const growthPlanButton = screen.getAllByText(/Choose Growth/)[0];
      fireEvent.click(growthPlanButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Upgrade to Growth')).toBeInTheDocument();
    });

    const continueButton = screen.getByText('Continue to Payment');
    fireEvent.click(continueButton);

    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith('/billing/create-charge', {
        plan: 'growth',
      });
    });
  });

  test('displays plan features correctly', async () => {
    mockApi.get.mockResolvedValue({
      data: {
        hasActiveSubscription: false,
      },
    });

    renderBilling();

    await waitFor(() => {
      // Starter plan features
      expect(screen.getByText('Up to 10 active discounts')).toBeInTheDocument();
      
      // Growth plan features
      expect(screen.getByText('Unlimited active discounts')).toBeInTheDocument();
      expect(screen.getByText('AI-powered recommendations')).toBeInTheDocument();
      
      // Pro plan features
      expect(screen.getByText('Everything in Growth')).toBeInTheDocument();
      expect(screen.getByText('24/7 priority support')).toBeInTheDocument();
    });
  });

  test('shows pricing correctly', async () => {
    mockApi.get.mockResolvedValue({
      data: {
        hasActiveSubscription: false,
      },
    });

    renderBilling();

    await waitFor(() => {
      expect(screen.getByText('$29')).toBeInTheDocument();
      expect(screen.getByText('$79')).toBeInTheDocument();
      expect(screen.getByText('$199')).toBeInTheDocument();
    });
  });

  test('handles subscription cancellation', async () => {
    mockApi.get.mockResolvedValue({
      data: {
        hasActiveSubscription: true,
        subscription: {
          plan: 'growth',
          planName: 'Growth Plan',
          price: 79,
        },
      },
    });

    mockApi.post.mockResolvedValue({
      data: {
        success: true,
        message: 'Subscription cancelled successfully',
      },
    });

    renderBilling();

    await waitFor(() => {
      const cancelButton = screen.getByText('Cancel Subscription');
      fireEvent.click(cancelButton);
    });

    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith('/billing/cancel');
    });
  });

  test('shows ROI calculator section', async () => {
    mockApi.get.mockResolvedValue({
      data: {
        hasActiveSubscription: false,
      },
    });

    renderBilling();

    await waitFor(() => {
      expect(screen.getByText('Average ROI with our app')).toBeInTheDocument();
      expect(screen.getByText(/312% ROI/)).toBeInTheDocument();
    });
  });

  test('shows FAQ section', async () => {
    mockApi.get.mockResolvedValue({
      data: {
        hasActiveSubscription: false,
      },
    });

    renderBilling();

    await waitFor(() => {
      expect(screen.getByText('Frequently Asked Questions')).toBeInTheDocument();
      expect(screen.getByText('Can I change plans at any time?')).toBeInTheDocument();
      expect(screen.getByText('Is there a free trial?')).toBeInTheDocument();
    });
  });
});