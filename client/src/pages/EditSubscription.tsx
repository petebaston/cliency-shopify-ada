import React, { useState, useEffect, useCallback } from 'react';
import {
  Page,
  Card,
  FormLayout,
  TextField,
  Select,
  Button,
  Banner,
  LegacyStack,
  Text,
  Box,
  Loading,
  Modal,
  TextContainer,
  Badge,
  Divider,
  ButtonGroup,
} from '@shopify/polaris';
import { useNavigate, useParams } from 'react-router-dom';
import Decimal from 'decimal.js';
import { format } from 'date-fns';
import api from '../services/api';

interface SubscriptionDiscount {
  id: string;
  customer_id: string;
  customer_email: string;
  customer_name: string;
  discount_percentage: string;
  status: 'active' | 'paused' | 'cancelled';
  billing_cycle: 'monthly' | 'quarterly' | 'yearly';
  next_billing_date: string;
  created_at: string;
  updated_at: string;
  total_savings: number;
  usage_count: number;
  base_amount: number;
  notes: string;
}

function EditSubscription() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  const [subscription, setSubscription] = useState<SubscriptionDiscount | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    discount_percentage: '',
    billing_cycle: 'monthly',
    base_amount: '',
    notes: '',
  });

  const [errors, setErrors] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [successBanner, setSuccessBanner] = useState(false);
  const [statusModalActive, setStatusModalActive] = useState(false);
  const [newStatus, setNewStatus] = useState<'active' | 'paused' | 'cancelled'>('active');
  const [calculatedDiscount, setCalculatedDiscount] = useState<string>('0.00');

  useEffect(() => {
    if (id) {
      fetchSubscription();
    }
  }, [id]);

  useEffect(() => {
    calculateDiscount();
  }, [formData.discount_percentage, formData.base_amount]);

  const fetchSubscription = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/subscriptions/${id}`);
      const subscriptionData = response.data.data;
      
      setSubscription(subscriptionData);
      setFormData({
        discount_percentage: subscriptionData.discount_percentage || '',
        billing_cycle: subscriptionData.billing_cycle || 'monthly',
        base_amount: subscriptionData.base_amount?.toString() || '',
        notes: subscriptionData.notes || '',
      });
    } catch (error) {
      console.error('Error fetching subscription:', error);
      setErrors({ fetch: 'Failed to load subscription. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const calculateDiscount = () => {
    try {
      if (formData.discount_percentage && formData.base_amount) {
        const percentage = new Decimal(formData.discount_percentage);
        const baseAmount = new Decimal(formData.base_amount);
        const discount = baseAmount.mul(percentage).div(100);
        setCalculatedDiscount(discount.toFixed(2));
      } else {
        setCalculatedDiscount('0.00');
      }
    } catch (error) {
      setCalculatedDiscount('0.00');
    }
  };

  const handleInputChange = useCallback((field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setErrors((prev: any) => ({ ...prev, [field]: undefined }));
  }, []);

  const validateForm = () => {
    const newErrors: any = {};

    if (!formData.discount_percentage) {
      newErrors.discount_percentage = 'Discount percentage is required';
    } else {
      try {
        const percentage = new Decimal(formData.discount_percentage);
        if (percentage.lt(0) || percentage.gt(100)) {
          newErrors.discount_percentage = 'Percentage must be between 0 and 100';
        }
      } catch (error) {
        newErrors.discount_percentage = 'Invalid percentage format';
      }
    }

    if (!formData.base_amount) {
      newErrors.base_amount = 'Base amount is required';
    } else {
      try {
        const amount = new Decimal(formData.base_amount);
        if (amount.lt(0)) {
          newErrors.base_amount = 'Base amount must be positive';
        }
      } catch (error) {
        newErrors.base_amount = 'Invalid amount format';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const dataToSend = {
        ...formData,
        discount_percentage: new Decimal(formData.discount_percentage).toFixed(4),
        base_amount: new Decimal(formData.base_amount).toFixed(2),
      };

      await api.put(`/subscriptions/${id}`, dataToSend);
      setSuccessBanner(true);
      setTimeout(() => {
        navigate('/subscriptions');
      }, 1500);
    } catch (error) {
      console.error('Error updating subscription:', error);
      setErrors({ submit: 'Failed to update subscription. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async () => {
    try {
      await api.patch(`/subscriptions/${id}`, { status: newStatus });
      if (subscription) {
        setSubscription({ ...subscription, status: newStatus });
      }
      setStatusModalActive(false);
    } catch (error) {
      console.error('Error updating subscription status:', error);
      setErrors({ submit: 'Failed to update subscription status. Please try again.' });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge tone="success">Active</Badge>;
      case 'paused':
        return <Badge tone="warning">Paused</Badge>;
      case 'cancelled':
        return <Badge tone="critical">Cancelled</Badge>;
      default:
        return <Badge tone="base">{status}</Badge>;
    }
  };

  const getStatusActions = () => {
    if (!subscription) return [];

    const actions = [];
    
    if (subscription.status === 'active') {
      actions.push({
        content: 'Pause Subscription',
        onAction: () => {
          setNewStatus('paused');
          setStatusModalActive(true);
        },
      });
    } else if (subscription.status === 'paused') {
      actions.push({
        content: 'Resume Subscription',
        onAction: () => {
          setNewStatus('active');
          setStatusModalActive(true);
        },
      });
    }

    if (subscription.status !== 'cancelled') {
      actions.push({
        content: 'Cancel Subscription',
        destructive: true,
        onAction: () => {
          setNewStatus('cancelled');
          setStatusModalActive(true);
        },
      });
    }

    return actions;
  };

  const billingCycleOptions = [
    { label: 'Monthly', value: 'monthly' },
    { label: 'Quarterly', value: 'quarterly' },
    { label: 'Yearly', value: 'yearly' },
  ];

  if (loading) {
    return (
      <Page title="Edit Subscription">
        <Loading />
      </Page>
    );
  }

  if (!subscription && !loading) {
    return (
      <Page 
        title="Subscription not found"
      >
        <Banner tone="critical">
          <p>The subscription you're looking for could not be found.</p>
        </Banner>
      </Page>
    );
  }

  const statusModalMarkup = (
    <Modal
      open={statusModalActive}
      onClose={() => setStatusModalActive(false)}
      title={`${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)} subscription?`}
      primaryAction={{
        content: newStatus.charAt(0).toUpperCase() + newStatus.slice(1),
        destructive: newStatus === 'cancelled',
        onAction: handleStatusChange,
      }}
      secondaryActions={[
        {
          content: 'Cancel',
          onAction: () => setStatusModalActive(false),
        },
      ]}
    >
      <Modal.Section>
        <TextContainer>
          <p>
            Are you sure you want to {newStatus} this subscription for {subscription?.customer_email}?
            {newStatus === 'cancelled' && ' This action cannot be undone.'}
          </p>
        </TextContainer>
      </Modal.Section>
    </Modal>
  );

  return (
    <Page
      title={`Edit subscription for ${subscription?.customer_email}`}
      primaryAction={{
        content: 'Save changes',
        onAction: handleSubmit,
        loading: saving,
      }}
      secondaryActions={[
        {
          content: 'Cancel',
          onAction: () => navigate('/subscriptions'),
        },
        ...getStatusActions(),
      ]}
    >
      {successBanner && (
        <Banner tone="success" onDismiss={() => setSuccessBanner(false)}>
          <p>Subscription updated successfully!</p>
        </Banner>
      )}

      {errors.submit && (
        <Banner tone="critical" onDismiss={() => setErrors({ ...errors, submit: undefined)}>
          <p>{errors.submit}</p>
        </Banner>
      )}

      {errors.fetch && (
        <Banner status="critical" onDismiss={() => setErrors({ ...errors, fetch: undefined })}>
          <p>{errors.fetch}</p>
        </Banner>
      )}

      <FormLayout>
        <Card sectioned title="Customer Information">
          <LegacyStack vertical spacing="tight">
            <LegacyStack alignment="center">
              <Text variant="headingMd" as="h3">
                {subscription?.customer_name || subscription?.customer_email}
              </Text>
              {subscription && getStatusBadge(subscription.status)}
            </LegacyStack>
            <Text variant="bodySm" color="subdued">
              Customer since: {subscription && format(new Date(subscription.created_at), 'MMMM dd, yyyy')}
            </Text>
            <Text variant="bodySm" color="subdued">
              Next billing: {subscription && format(new Date(subscription.next_billing_date), 'MMMM dd, yyyy')}
            </Text>
          </LegacyStack>
        </Card>

        <Card sectioned title="Discount Configuration">
          <FormLayout>
            <TextField
              label="Discount Percentage"
              type="number"
              value={formData.discount_percentage}
              onChange={(value) => handleInputChange('discount_percentage', value)}
              error={errors.discount_percentage}
              suffix="%"
              step={0.0001}
              autoComplete="off"
              helpText="Supports up to 4 decimal places (e.g., 12.7500%)"
            />
            
            <TextField
              label="Base Amount"
              type="number"
              value={formData.base_amount}
              onChange={(value) => handleInputChange('base_amount', value)}
              error={errors.base_amount}
              prefix="$"
              step={0.01}
              autoComplete="off"
              helpText="The base subscription amount before discount"
            />

            <Select
              label="Billing Cycle"
              options={billingCycleOptions}
              value={formData.billing_cycle}
              onChange={(value) => handleInputChange('billing_cycle', value)}
            />
          </FormLayout>
        </Card>

        <Card>
          <Box padding="400">
            <Text variant="headingMd" as="h3">Discount Preview</Text>
          </Box>
          <Box padding="400">
          <LegacyStack distribution="fillEvenly">
            <LegacyStack vertical alignment="center">
              <Text variant="headingLg" as="h3">
                ${formData.base_amount || '0.00'}
              </Text>
              <Text variant="bodySm" as="p" tone="subdued">
                Base Amount
              </Text>
            </LegacyStack>
            
            <LegacyStack vertical alignment="center">
              <Text variant="headingLg" as="h3" tone="critical">
                -${calculatedDiscount}
              </Text>
              <Text variant="bodySm" as="p" tone="subdued">
                Discount ({formData.discount_percentage || '0'}%)
              </Text>
            </LegacyStack>
            
            <LegacyStack vertical alignment="center">
              <Text variant="headingLg" as="h3" tone="success">
                ${formData.base_amount && formData.discount_percentage 
                  ? new Decimal(formData.base_amount).minus(calculatedDiscount).toFixed(2)
                  : '0.00'
                }
              </Text>
              <Text variant="bodySm" as="p" tone="subdued">
                Final Amount
              </Text>
            </LegacyStack>
          </LegacyStack>
          </Box>
        </Card>

        <Card>
          <Box padding="400">
            <Text variant="headingMd" as="h3">Usage Statistics</Text>
          </Box>
          <Box padding="400">
          <LegacyStack distribution="fillEvenly">
            <LegacyStack vertical alignment="center">
              <Text variant="headingLg" as="h3">
                {subscription?.usage_count || 0}
              </Text>
              <Text variant="bodySm" as="p" tone="subdued">
                Times Used
              </Text>
            </LegacyStack>
            
            <LegacyStack vertical alignment="center">
              <Text variant="headingLg" as="h3" tone="success">
                ${subscription?.total_savings.toFixed(2) || '0.00'}
              </Text>
              <Text variant="bodySm" as="p" tone="subdued">
                Total Savings
              </Text>
            </LegacyStack>
          </LegacyStack>
          </Box>
        </Card>

        <Card>
          <Box padding="400">
            <Text variant="headingMd" as="h3">Notes</Text>
          </Box>
          <Box padding="400">
          <TextField
            label=""
            value={formData.notes}
            onChange={(value) => handleInputChange('notes', value)}
            multiline={4}
            autoComplete="off"
            placeholder="Add any notes about this subscription discount..."
            helpText="Internal notes for managing this subscription"
          />
          </Box>
        </Card>

        <Card>
          <Box padding="400">
          <LegacyStack distribution="fillEvenly">
            <ButtonGroup>
              {subscription?.status === 'active' && (
                <Button
                  onClick={() => {
                    setNewStatus('paused');
                    setStatusModalActive(true);
                  }}
                >
                  Pause Subscription
                </Button>
              )}
              
              {subscription?.status === 'paused' && (
                <Button
                  onClick={() => {
                    setNewStatus('active');
                    setStatusModalActive(true);
                  }}
                  variant="primary"
                >
                  Resume Subscription
                </Button>
              )}
              
              {subscription?.status !== 'cancelled' && (
                <Button
                  onClick={() => {
                    setNewStatus('cancelled');
                    setStatusModalActive(true);
                  }}
                  variant="primary" tone="critical"
                >
                  Cancel Subscription
                </Button>
              )}
            </ButtonGroup>
          </LegacyStack>
          </Box>
        </Card>
      </FormLayout>

      {statusModalMarkup}
    </Page>
  );
}

export default EditSubscription;