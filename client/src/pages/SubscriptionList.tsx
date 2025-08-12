import React, { useState, useEffect, useCallback } from 'react';
import {
  Page,
  Card,
  DataTable,
  Badge,
  Button,
  Filters,
  ChoiceList,
  TextField,
  Modal,
  TextContainer,
  Banner,
  EmptyState,
  Pagination,
  ButtonGroup,
  Popover,
  ActionList,
} from '@shopify/polaris';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import api from '../services/api';

interface SubscriptionDiscount {
  id: string;
  customer_id: string;
  customer_email: string;
  discount_percentage: string;
  status: 'active' | 'paused' | 'cancelled';
  billing_cycle: 'monthly' | 'quarterly' | 'yearly';
  next_billing_date: string;
  created_at: string;
  total_savings: number;
  usage_count: number;
}

function SubscriptionList() {
  const navigate = useNavigate();
  const [subscriptions, setSubscriptions] = useState<SubscriptionDiscount[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubscriptions, setSelectedSubscriptions] = useState<string[]>([]);
  const [bulkActionModalActive, setBulkActionModalActive] = useState(false);
  const [bulkAction, setBulkAction] = useState<'pause' | 'resume' | 'cancel' | ''>('');
  const [queryValue, setQueryValue] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [billingCycleFilter, setBillingCycleFilter] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionPopoverActive, setActionPopoverActive] = useState<string | null>(null);

  useEffect(() => {
    fetchSubscriptions();
  }, [statusFilter, billingCycleFilter, currentPage, queryValue]);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (statusFilter.length > 0) {
        statusFilter.forEach(status => params.append('status', status));
      }
      if (billingCycleFilter.length > 0) {
        billingCycleFilter.forEach(cycle => params.append('billing_cycle', cycle));
      }
      if (queryValue) {
        params.append('search', queryValue);
      }
      params.append('page', currentPage.toString());
      params.append('limit', '20');

      const response = await api.get(`/subscriptions?${params.toString()}`);
      setSubscriptions(response.data.data || []);
      setTotalPages(response.data.totalPages || 1);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedSubscriptions.length === 0) return;

    try {
      await Promise.all(
        selectedSubscriptions.map((id) => 
          api.patch(`/subscriptions/${id}`, { status: bulkAction === 'resume' ? 'active' : bulkAction })
        )
      );
      setBulkActionModalActive(false);
      setSelectedSubscriptions([]);
      setBulkAction('');
      fetchSubscriptions();
    } catch (error) {
      console.error('Error performing bulk action:', error);
    }
  };

  const handleSingleAction = async (subscriptionId: string, action: 'pause' | 'resume' | 'cancel') => {
    try {
      const status = action === 'resume' ? 'active' : action;
      await api.patch(`/subscriptions/${subscriptionId}`, { status });
      fetchSubscriptions();
    } catch (error) {
      console.error('Error updating subscription:', error);
    }
    setActionPopoverActive(null);
  };

  const handleStatusFilterChange = useCallback(
    (value: string[]) => setStatusFilter(value),
    []
  );

  const handleBillingCycleFilterChange = useCallback(
    (value: string[]) => setBillingCycleFilter(value),
    []
  );

  const handleQueryValueChange = useCallback(
    (value: string) => setQueryValue(value),
    []
  );

  const handleQueryValueRemove = useCallback(() => setQueryValue(''), []);

  const handleClearAll = useCallback(() => {
    setQueryValue('');
    setStatusFilter([]);
    setBillingCycleFilter([]);
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge tone="success">Active</Badge>;
      case 'paused':
        return <Badge tone="warning">Paused</Badge>;
      case 'cancelled':
        return <Badge tone="critical">Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getBillingCycleBadge = (cycle: string) => {
    const cycleLabels = {
      monthly: 'Monthly',
      quarterly: 'Quarterly',
      yearly: 'Yearly',
    };
    return <Badge tone="info">{cycleLabels[cycle as keyof typeof cycleLabels] || cycle}</Badge>;
  };

  const getActionItems = (subscription: SubscriptionDiscount) => {
    const items = [
      {
        content: 'Edit',
        onAction: () => navigate(`/subscriptions/${subscription.id}/edit`),
      },
    ];

    if (subscription.status === 'active') {
      items.push({
        content: 'Pause',
        onAction: () => handleSingleAction(subscription.id, 'pause'),
      });
    } else if (subscription.status === 'paused') {
      items.push({
        content: 'Resume',
        onAction: () => handleSingleAction(subscription.id, 'resume'),
      });
    }

    if (subscription.status !== 'cancelled') {
      items.push({
        content: 'Cancel',
        onAction: () => handleSingleAction(subscription.id, 'cancel'),
      });
    }

    return items;
  };

  const filters = [
    {
      key: 'status',
      label: 'Status',
      filter: (
        <ChoiceList
          title="Status"
          titleHidden
          choices={[
            { label: 'Active', value: 'active' },
            { label: 'Paused', value: 'paused' },
            { label: 'Cancelled', value: 'cancelled' },
          ]}
          selected={statusFilter}
          onChange={handleStatusFilterChange}
          allowMultiple
        />
      ),
      shortcut: true,
    },
    {
      key: 'billingCycle',
      label: 'Billing Cycle',
      filter: (
        <ChoiceList
          title="Billing Cycle"
          titleHidden
          choices={[
            { label: 'Monthly', value: 'monthly' },
            { label: 'Quarterly', value: 'quarterly' },
            { label: 'Yearly', value: 'yearly' },
          ]}
          selected={billingCycleFilter}
          onChange={handleBillingCycleFilterChange}
          allowMultiple
        />
      ),
    },
  ];

  const appliedFilters = [];
  if (statusFilter.length > 0) {
    appliedFilters.push({
      key: 'status',
      label: `Status: ${statusFilter.join(', ')}`,
      onRemove: () => setStatusFilter([]),
    });
  }
  if (billingCycleFilter.length > 0) {
    appliedFilters.push({
      key: 'billingCycle',
      label: `Billing Cycle: ${billingCycleFilter.join(', ')}`,
      onRemove: () => setBillingCycleFilter([]),
    });
  }

  const rows = subscriptions.map((subscription) => [
    subscription.customer_email,
    getStatusBadge(subscription.status),
    `${subscription.discount_percentage}%`,
    getBillingCycleBadge(subscription.billing_cycle),
    format(new Date(subscription.next_billing_date), 'MMM dd, yyyy'),
    `$${subscription.total_savings.toFixed(2)}`,
    subscription.usage_count,
    (
      <Popover
        active={actionPopoverActive === subscription.id}
        activator={
          <Button
            variant="plain"
            onClick={() => setActionPopoverActive(
              actionPopoverActive === subscription.id ? null : subscription.id
            )}
          >
            Actions
          </Button>
        }
        onClose={() => setActionPopoverActive(null)}
      >
        <ActionList items={getActionItems(subscription)} />
      </Popover>
    ),
  ]);

  const emptyStateMarkup = (
    <EmptyState
      heading="No subscription discounts yet"
      action={{ 
        content: 'Create subscription discount', 
        onAction: () => navigate('/subscriptions/new') 
      }}
      image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
    >
      <p>Start offering subscription discounts to build customer loyalty and recurring revenue.</p>
    </EmptyState>
  );

  const bulkActionModalMarkup = (
    <Modal
      open={bulkActionModalActive}
      onClose={() => setBulkActionModalActive(false)}
      title={`${bulkAction.charAt(0).toUpperCase() + bulkAction.slice(1)} subscriptions?`}
      primaryAction={{
        content: bulkAction.charAt(0).toUpperCase() + bulkAction.slice(1),
        destructive: bulkAction === 'cancel',
        onAction: handleBulkAction,
      }}
      secondaryActions={[
        {
          content: 'Cancel',
          onAction: () => setBulkActionModalActive(false),
        },
      ]}
    >
      <Modal.Section>
        <TextContainer>
          <p>
            Are you sure you want to {bulkAction} {selectedSubscriptions.length} subscription
            {selectedSubscriptions.length > 1 ? 's' : ''}?
          </p>
        </TextContainer>
      </Modal.Section>
    </Modal>
  );

  const bulkActions = selectedSubscriptions.length > 0 ? [
    {
      content: 'Pause selected',
      onAction: () => {
        setBulkAction('pause');
        setBulkActionModalActive(true);
      },
    },
    {
      content: 'Resume selected',
      onAction: () => {
        setBulkAction('resume');
        setBulkActionModalActive(true);
      },
    },
    {
      content: 'Cancel selected',
      destructive: true,
      onAction: () => {
        setBulkAction('cancel');
        setBulkActionModalActive(true);
      },
    },
  ] : [];

  return (
    <Page
      title="Subscription Discounts"
      primaryAction={{
        content: 'Create subscription discount',
        onAction: () => navigate('/subscriptions/new'),
      }}
      secondaryActions={bulkActions}
    >
      {subscriptions.length === 0 && !loading && queryValue === '' && statusFilter.length === 0 && billingCycleFilter.length === 0 ? (
        emptyStateMarkup
      ) : (
        <Card>
          <Card.Section>
            <Filters
              queryValue={queryValue}
              filters={filters}
              appliedFilters={appliedFilters}
              onQueryChange={handleQueryValueChange}
              onQueryClear={handleQueryValueRemove}
              onClearAll={handleClearAll}
              queryPlaceholder="Search by customer email"
            />
          </Card.Section>
          <DataTable
            columnContentTypes={[
              'text',
              'text',
              'text',
              'text',
              'text',
              'numeric',
              'numeric',
              'text',
            ]}
            headings={[
              'Customer',
              'Status',
              'Discount',
              'Billing Cycle',
              'Next Billing',
              'Total Savings',
              'Usage Count',
              'Actions',
            ]}
            rows={rows}
            selectable
            selectedRows={selectedSubscriptions}
            onSelectionChange={setSelectedSubscriptions}
            loading={loading}
          />
          {totalPages > 1 && (
            <Box padding="400">
              <Pagination
                hasPrevious={currentPage > 1}
                hasNext={currentPage < totalPages}
                onPrevious={() => setCurrentPage(currentPage - 1)}
                onNext={() => setCurrentPage(currentPage + 1)}
                label={`Page ${currentPage} of ${totalPages}`}
              />
            </Box>
          )}
        </Card>
      )}
      {bulkActionModalMarkup}
    </Page>
  );
}

export default SubscriptionList;