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
  Box,
} from '@shopify/polaris';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import api from '../services/api';

function DiscountList() {
  const navigate = useNavigate();
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDiscounts, setSelectedDiscounts] = useState<string[]>([]);
  const [deleteModalActive, setDeleteModalActive] = useState(false);
  const [queryValue, setQueryValue] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<string[]>([]);

  useEffect(() => {
    fetchDiscounts();
  }, [statusFilter, typeFilter]);

  const fetchDiscounts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter.includes('active')) params.append('is_active', 'true');
      if (statusFilter.includes('inactive')) params.append('is_active', 'false');
      if (typeFilter.length > 0) params.append('discount_type', typeFilter[0]);

      const response = await api.get(`/discounts?${params.toString()}`);
      setDiscounts(response.data.data || []);
    } catch (error) {
      console.error('Error fetching discounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDiscounts = async () => {
    try {
      await Promise.all(
        selectedDiscounts.map((id) => api.delete(`/discounts/${id}`))
      );
      setDeleteModalActive(false);
      setSelectedDiscounts([]);
      fetchDiscounts();
    } catch (error) {
      console.error('Error deleting discounts:', error);
    }
  };

  const handleStatusFilterChange = useCallback(
    (value: string[]) => setStatusFilter(value),
    []
  );

  const handleTypeFilterChange = useCallback(
    (value: string[]) => setTypeFilter(value),
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
    setTypeFilter([]);
  }, []);

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
            { label: 'Inactive', value: 'inactive' },
          ]}
          selected={statusFilter}
          onChange={handleStatusFilterChange}
          allowMultiple
        />
      ),
      shortcut: true,
    },
    {
      key: 'type',
      label: 'Discount Type',
      filter: (
        <ChoiceList
          title="Discount Type"
          titleHidden
          choices={[
            { label: 'Percentage', value: 'percentage' },
            { label: 'Fixed Amount', value: 'fixed_amount' },
            { label: 'Buy X Get Y', value: 'buy_x_get_y' },
          ]}
          selected={typeFilter}
          onChange={handleTypeFilterChange}
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
  if (typeFilter.length > 0) {
    appliedFilters.push({
      key: 'type',
      label: `Type: ${typeFilter.join(', ')}`,
      onRemove: () => setTypeFilter([]),
    });
  }

  const filteredDiscounts = discounts.filter((discount) => {
    if (queryValue) {
      return discount.name.toLowerCase().includes(queryValue.toLowerCase());
    }
    return true;
  });

  const rows = filteredDiscounts.map((discount) => [
    discount.name,
    <Badge tone={discount.is_active ? 'success' : 'base'}>
      {discount.is_active ? 'Active' : 'Inactive'}
    </Badge>,
    discount.discount_type.replace('_', ' ').charAt(0).toUpperCase() + 
    discount.discount_type.replace('_', ' ').slice(1),
    discount.discount_type === 'percentage' 
      ? `${discount.discount_value}%` 
      : `$${discount.discount_value}`,
    discount.applies_to.replace('_', ' ').charAt(0).toUpperCase() + 
    discount.applies_to.replace('_', ' ').slice(1),
    discount.usage_count || 0,
    discount.usage_limit || 'Unlimited',
    <Button variant="plain" onClick={() => navigate(`/discounts/${discount.id}/edit`)}>
      Edit
    </Button>,
  ]);

  const emptyStateMarkup = (
    <EmptyState
      heading="Create your first discount"
      action={{ content: 'Create discount', onAction: () => navigate('/discounts/new') }}
      image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
    >
      <p>Start offering discounts to increase sales and customer loyalty.</p>
    </EmptyState>
  );

  const deleteModalMarkup = (
    <Modal
      open={deleteModalActive}
      onClose={() => setDeleteModalActive(false)}
      title="Delete discounts?"
      primaryAction={{
        content: 'Delete',
        tone: 'critical' as const,
        onAction: handleDeleteDiscounts,
      }}
      secondaryActions={[
        {
          content: 'Cancel',
          onAction: () => setDeleteModalActive(false),
        },
      ]}
    >
      <Modal.Section>
        <TextContainer>
          <p>
            Are you sure you want to delete {selectedDiscounts.length} discount
            {selectedDiscounts.length > 1 ? 's' : ''}? This action cannot be undone.
          </p>
        </TextContainer>
      </Modal.Section>
    </Modal>
  );

  return (
    <Page
      title="Discounts"
      primaryAction={{
        content: 'Create discount',
        onAction: () => navigate('/discounts/new'),
      }}
      secondaryActions={
        selectedDiscounts.length > 0
          ? [
              {
                content: `Delete ${selectedDiscounts.length} discount${
                  selectedDiscounts.length > 1 ? 's' : ''
                }`,
                tone: 'critical' as const,
                onAction: () => setDeleteModalActive(true),
              },
            ]
          : []
      }
    >
      {filteredDiscounts.length === 0 && !loading && queryValue === '' && statusFilter.length === 0 && typeFilter.length === 0 ? (
        emptyStateMarkup
      ) : (
        <Card>
          <Box padding="400">
            <Filters
              queryValue={queryValue}
              filters={filters}
              appliedFilters={appliedFilters}
              onQueryChange={handleQueryValueChange}
              onQueryClear={handleQueryValueRemove}
              onClearAll={handleClearAll}
            />
          </Box>
          <DataTable
            columnContentTypes={[
              'text',
              'text',
              'text',
              'text',
              'text',
              'numeric',
              'text',
              'text',
            ]}
            headings={[
              'Name',
              'Status',
              'Type',
              'Value',
              'Applies To',
              'Used',
              'Limit',
              'Actions',
            ]}
            rows={rows}
            showTotalsInFooter={false}
          />
          {filteredDiscounts.length > 20 && (
            <Box padding="400">
              <Pagination
                hasPrevious
                hasNext
                onPrevious={() => {}}
                onNext={() => {}}
              />
            </Box>
          )}
        </Card>
      )}
      {deleteModalMarkup}
    </Page>
  );
}

export default DiscountList;