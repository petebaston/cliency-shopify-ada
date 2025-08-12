import React, { useState, useEffect, useCallback } from 'react';
import {
  Page,
  Card,
  FormLayout,
  TextField,
  Select,
  Checkbox,
  DatePicker,
  Button,
  Banner,
  LegacyStack,
  RadioButton,
  Popover,
  Text,
  Box,
  Loading,
  Modal,
  TextContainer,
} from '@shopify/polaris';
import { useNavigate, useParams } from 'react-router-dom';
import Decimal from 'decimal.js';
import api from '../services/api';

interface Discount {
  id: string;
  name: string;
  description: string;
  discount_type: string;
  discount_value: string;
  applies_to: string;
  minimum_requirements: {
    type: string;
    value: string;
  } | null;
  usage_limit: number | null;
  starts_at: Date;
  ends_at: Date | null;
  is_active: boolean;
}

function EditDiscount() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  const [discount, setDiscount] = useState<Discount | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    discount_type: 'percentage',
    discount_value: '',
    applies_to: 'all_products',
    minimum_requirements: {
      type: 'none',
      value: '',
    },
    usage_limit: '',
    starts_at: new Date(),
    ends_at: null as Date | null,
    is_active: true,
  });

  const [errors, setErrors] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [successBanner, setSuccessBanner] = useState(false);
  const [datePickerActive, setDatePickerActive] = useState<'start' | 'end' | null>(null);
  const [deleteModalActive, setDeleteModalActive] = useState(false);

  useEffect(() => {
    if (id) {
      fetchDiscount();
    }
  }, [id]);

  const fetchDiscount = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/discounts/${id}`);
      const discountData = response.data.data;
      
      setDiscount(discountData);
      setFormData({
        name: discountData.name || '',
        description: discountData.description || '',
        discount_type: discountData.discount_type || 'percentage',
        discount_value: discountData.discount_value || '',
        applies_to: discountData.applies_to || 'all_products',
        minimum_requirements: discountData.minimum_requirements || {
          type: 'none',
          value: '',
        },
        usage_limit: discountData.usage_limit?.toString() || '',
        starts_at: discountData.starts_at ? new Date(discountData.starts_at) : new Date(),
        ends_at: discountData.ends_at ? new Date(discountData.ends_at) : null,
        is_active: discountData.is_active ?? true,
      });
    } catch (error) {
      console.error('Error fetching discount:', error);
      setErrors({ fetch: 'Failed to load discount. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = useCallback((field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setErrors((prev: any) => ({ ...prev, [field]: undefined }));
  }, []);

  const handleMinimumRequirementChange = useCallback((field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      minimum_requirements: {
        ...prev.minimum_requirements,
        [field]: value,
      },
    }));
  }, []);

  const validateForm = () => {
    const newErrors: any = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Discount name is required';
    }

    if (!formData.discount_value) {
      newErrors.discount_value = 'Discount value is required';
    } else {
      try {
        const value = new Decimal(formData.discount_value);
        if (formData.discount_type === 'percentage' && (value.lt(0) || value.gt(100))) {
          newErrors.discount_value = 'Percentage must be between 0 and 100';
        } else if (value.lt(0)) {
          newErrors.discount_value = 'Value must be positive';
        }
      } catch (error) {
        newErrors.discount_value = 'Invalid number format';
      }
    }

    if (formData.minimum_requirements.type !== 'none' && !formData.minimum_requirements.value) {
      newErrors.minimum_value = 'Minimum value is required';
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
        discount_value: new Decimal(formData.discount_value).toFixed(
          formData.discount_type === 'percentage' ? 4 : 2
        ),
        usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
        minimum_requirements: formData.minimum_requirements.type === 'none' 
          ? null 
          : formData.minimum_requirements,
      };

      await api.put(`/discounts/${id}`, dataToSend);
      setSuccessBanner(true);
      setTimeout(() => {
        navigate('/discounts');
      }, 1500);
    } catch (error) {
      console.error('Error updating discount:', error);
      setErrors({ submit: 'Failed to update discount. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/discounts/${id}`);
      navigate('/discounts');
    } catch (error) {
      console.error('Error deleting discount:', error);
      setErrors({ submit: 'Failed to delete discount. Please try again.' });
    }
    setDeleteModalActive(false);
  };

  const discountTypeOptions = [
    { label: 'Percentage', value: 'percentage' },
    { label: 'Fixed Amount', value: 'fixed_amount' },
    { label: 'Buy X Get Y', value: 'buy_x_get_y' },
  ];

  const appliesToOptions = [
    { label: 'All Products', value: 'all_products' },
    { label: 'Specific Products', value: 'specific_products' },
    { label: 'Collections', value: 'collections' },
    { label: 'Subscriptions', value: 'subscriptions' },
  ];

  if (loading) {
    return (
      <Page title="Edit Discount">
        <Loading />
      </Page>
    );
  }

  if (!discount && !loading) {
    return (
      <Page 
        breadcrumbs={[{ content: 'Discounts', url: '/discounts' }]}
        title="Discount not found"
      >
        <Banner status="critical">
          <p>The discount you're looking for could not be found.</p>
        </Banner>
      </Page>
    );
  }

  const deleteModalMarkup = (
    <Modal
      open={deleteModalActive}
      onClose={() => setDeleteModalActive(false)}
      title="Delete discount?"
      primaryAction={{
        content: 'Delete',
        destructive: true,
        onAction: handleDelete,
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
            Are you sure you want to delete "{formData.name}"? This action cannot be undone.
          </p>
        </TextContainer>
      </Modal.Section>
    </Modal>
  );

  return (
    <Page
      breadcrumbs={[{ content: 'Discounts', url: '/discounts' }]}
      title={`Edit ${formData.name || 'discount'}`}
      primaryAction={{
        content: 'Save discount',
        onAction: handleSubmit,
        loading: saving,
      }}
      secondaryActions={[
        {
          content: 'Delete',
          destructive: true,
          onAction: () => setDeleteModalActive(true),
        },
        {
          content: 'Cancel',
          onAction: () => navigate('/discounts'),
        },
      ]}
    >
      {successBanner && (
        <Banner status="success" onDismiss={() => setSuccessBanner(false)}>
          <p>Discount updated successfully!</p>
        </Banner>
      )}

      {errors.submit && (
        <Banner status="critical" onDismiss={() => setErrors({ ...errors, submit: undefined })}>
          <p>{errors.submit}</p>
        </Banner>
      )}

      {errors.fetch && (
        <Banner status="critical" onDismiss={() => setErrors({ ...errors, fetch: undefined })}>
          <p>{errors.fetch}</p>
        </Banner>
      )}

      <FormLayout>
        <Card sectioned title="Discount information">
          <FormLayout>
            <TextField
              label="Discount name"
              value={formData.name}
              onChange={(value) => handleInputChange('name', value)}
              error={errors.name}
              autoComplete="off"
              placeholder="e.g., Summer Sale 20% Off"
            />
            <TextField
              label="Description (optional)"
              value={formData.description}
              onChange={(value) => handleInputChange('description', value)}
              multiline={3}
              autoComplete="off"
              placeholder="Describe this discount for internal reference"
            />
          </FormLayout>
        </Card>

        <Card sectioned title="Discount value">
          <FormLayout>
            <Select
              label="Discount type"
              options={discountTypeOptions}
              value={formData.discount_type}
              onChange={(value) => handleInputChange('discount_type', value)}
            />
            <TextField
              label={formData.discount_type === 'percentage' ? 'Percentage' : 'Amount'}
              type="number"
              value={formData.discount_value}
              onChange={(value) => handleInputChange('discount_value', value)}
              error={errors.discount_value}
              suffix={formData.discount_type === 'percentage' ? '%' : '$'}
              autoComplete="off"
              step={formData.discount_type === 'percentage' ? '0.0001' : '0.01'}
              helpText={
                formData.discount_type === 'percentage'
                  ? 'Supports decimal values (e.g., 12.75%)'
                  : 'Enter the discount amount'
              }
            />
          </FormLayout>
        </Card>

        <Card sectioned title="Applies to">
          <Select
            label="Apply discount to"
            options={appliesToOptions}
            value={formData.applies_to}
            onChange={(value) => handleInputChange('applies_to', value)}
            helpText="Choose which products or services this discount applies to"
          />
        </Card>

        <Card sectioned title="Minimum requirements">
          <LegacyStack vertical>
            <RadioButton
              label="No minimum requirements"
              checked={formData.minimum_requirements.type === 'none'}
              id="none"
              onChange={() => handleMinimumRequirementChange('type', 'none')}
            />
            <RadioButton
              label="Minimum quantity"
              checked={formData.minimum_requirements.type === 'quantity'}
              id="quantity"
              onChange={() => handleMinimumRequirementChange('type', 'quantity')}
            />
            {formData.minimum_requirements.type === 'quantity' && (
              <Box paddingInlineStart="800">
                <TextField
                  label=""
                  type="number"
                  value={formData.minimum_requirements.value}
                  onChange={(value) => handleMinimumRequirementChange('value', value)}
                  error={errors.minimum_value}
                  autoComplete="off"
                  placeholder="e.g., 3"
                />
              </Box>
            )}
            <RadioButton
              label="Minimum purchase amount"
              checked={formData.minimum_requirements.type === 'amount'}
              id="amount"
              onChange={() => handleMinimumRequirementChange('type', 'amount')}
            />
            {formData.minimum_requirements.type === 'amount' && (
              <Box paddingInlineStart="800">
                <TextField
                  label=""
                  type="number"
                  value={formData.minimum_requirements.value}
                  onChange={(value) => handleMinimumRequirementChange('value', value)}
                  error={errors.minimum_value}
                  prefix="$"
                  autoComplete="off"
                  placeholder="e.g., 50.00"
                />
              </Box>
            )}
          </LegacyStack>
        </Card>

        <Card sectioned title="Usage limits">
          <FormLayout>
            <TextField
              label="Total usage limit (optional)"
              type="number"
              value={formData.usage_limit}
              onChange={(value) => handleInputChange('usage_limit', value)}
              autoComplete="off"
              helpText="Leave blank for unlimited usage"
              placeholder="e.g., 100"
            />
          </FormLayout>
        </Card>

        <Card sectioned title="Active dates">
          <FormLayout>
            <LegacyStack distribution="fill">
              <Popover
                active={datePickerActive === 'start'}
                activator={
                  <TextField
                    label="Start date"
                    value={formData.starts_at?.toLocaleDateString() || ''}
                    onFocus={() => setDatePickerActive('start')}
                    autoComplete="off"
                  />
                }
                onClose={() => setDatePickerActive(null)}
              >
                <DatePicker
                  month={formData.starts_at?.getMonth() || new Date().getMonth()}
                  year={formData.starts_at?.getFullYear() || new Date().getFullYear()}
                  onChange={(date) => {
                    handleInputChange('starts_at', date.start);
                    setDatePickerActive(null);
                  }}
                  selected={formData.starts_at}
                />
              </Popover>

              <Popover
                active={datePickerActive === 'end'}
                activator={
                  <TextField
                    label="End date (optional)"
                    value={formData.ends_at?.toLocaleDateString() || ''}
                    onFocus={() => setDatePickerActive('end')}
                    autoComplete="off"
                    placeholder="No end date"
                  />
                }
                onClose={() => setDatePickerActive(null)}
              >
                <DatePicker
                  month={formData.ends_at?.getMonth() || new Date().getMonth()}
                  year={formData.ends_at?.getFullYear() || new Date().getFullYear()}
                  onChange={(date) => {
                    handleInputChange('ends_at', date.start);
                    setDatePickerActive(null);
                  }}
                  selected={formData.ends_at || undefined}
                  disableDatesBefore={formData.starts_at}
                />
              </Popover>
            </LegacyStack>
          </FormLayout>
        </Card>

        <Card sectioned>
          <Checkbox
            label="Discount is currently active"
            checked={formData.is_active}
            onChange={(value) => handleInputChange('is_active', value)}
            helpText="Inactive discounts won't be applied to any orders"
          />
        </Card>
      </FormLayout>

      {deleteModalMarkup}
    </Page>
  );
}

export default EditDiscount;