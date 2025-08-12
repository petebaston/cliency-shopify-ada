import React, { useState, useEffect, useCallback } from 'react';
import {
  Page,
  Card,
  Layout,
  FormLayout,
  TextField,
  Select,
  Checkbox,
  Button,
  Banner,
  LegacyStack,
  Text,
  Divider,
  Badge,
  Modal,
  TextContainer,
  ButtonGroup,
  Box,
} from '@shopify/polaris';
import api from '../services/api';

interface AppSettings {
  store_name: string;
  store_email: string;
  currency: string;
  timezone: string;
  default_discount_duration: number;
  auto_deactivate_expired: boolean;
  email_notifications: boolean;
  usage_alerts: boolean;
  usage_alert_threshold: number;
  webhook_url: string;
  api_rate_limit: number;
  max_discount_percentage: number;
  allow_stacking: boolean;
  require_minimum_order: boolean;
  minimum_order_amount: string;
}

function Settings() {
  const [settings, setSettings] = useState<AppSettings>({
    store_name: '',
    store_email: '',
    currency: 'USD',
    timezone: 'America/New_York',
    default_discount_duration: 30,
    auto_deactivate_expired: true,
    email_notifications: true,
    usage_alerts: true,
    usage_alert_threshold: 80,
    webhook_url: '',
    api_rate_limit: 1000,
    max_discount_percentage: 50,
    allow_stacking: false,
    require_minimum_order: false,
    minimum_order_amount: '25.00',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<any>({});
  const [successBanner, setSuccessBanner] = useState(false);
  const [resetModalActive, setResetModalActive] = useState(false);
  const [testWebhookLoading, setTestWebhookLoading] = useState(false);
  const [webhookTestResult, setWebhookTestResult] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/settings');
      setSettings(response.data.data || settings);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = useCallback((field: string, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
    setErrors((prev: any) => ({ ...prev, [field]: undefined }));
  }, []);

  const validateSettings = () => {
    const newErrors: any = {};

    if (!settings.store_name.trim()) {
      newErrors.store_name = 'Store name is required';
    }

    if (!settings.store_email.trim()) {
      newErrors.store_email = 'Store email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.store_email)) {
      newErrors.store_email = 'Please enter a valid email address';
    }

    if (settings.usage_alert_threshold < 1 || settings.usage_alert_threshold > 100) {
      newErrors.usage_alert_threshold = 'Threshold must be between 1 and 100';
    }

    if (settings.api_rate_limit < 100 || settings.api_rate_limit > 10000) {
      newErrors.api_rate_limit = 'Rate limit must be between 100 and 10000';
    }

    if (settings.max_discount_percentage < 1 || settings.max_discount_percentage > 100) {
      newErrors.max_discount_percentage = 'Maximum discount must be between 1 and 100';
    }

    if (settings.webhook_url && !/^https?:\/\/.+/.test(settings.webhook_url)) {
      newErrors.webhook_url = 'Please enter a valid URL';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateSettings()) return;

    setSaving(true);
    try {
      await api.put('/settings', settings);
      setSuccessBanner(true);
      setTimeout(() => setSuccessBanner(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setErrors({ submit: 'Failed to save settings. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleResetSettings = async () => {
    try {
      await api.post('/settings/reset');
      await fetchSettings();
      setResetModalActive(false);
      setSuccessBanner(true);
      setTimeout(() => setSuccessBanner(false), 3000);
    } catch (error) {
      console.error('Error resetting settings:', error);
      setErrors({ submit: 'Failed to reset settings. Please try again.' });
    }
  };

  const handleTestWebhook = async () => {
    if (!settings.webhook_url) return;

    setTestWebhookLoading(true);
    try {
      const response = await api.post('/settings/test-webhook', {
        webhook_url: settings.webhook_url,
      });
      setWebhookTestResult(response.data.success ? 'success' : 'failed');
    } catch (error) {
      setWebhookTestResult('failed');
    } finally {
      setTestWebhookLoading(false);
      setTimeout(() => setWebhookTestResult(null), 5000);
    }
  };

  const currencyOptions = [
    { label: 'US Dollar (USD)', value: 'USD' },
    { label: 'Canadian Dollar (CAD)', value: 'CAD' },
    { label: 'Euro (EUR)', value: 'EUR' },
    { label: 'British Pound (GBP)', value: 'GBP' },
    { label: 'Australian Dollar (AUD)', value: 'AUD' },
  ];

  const timezoneOptions = [
    { label: 'Eastern Time', value: 'America/New_York' },
    { label: 'Central Time', value: 'America/Chicago' },
    { label: 'Mountain Time', value: 'America/Denver' },
    { label: 'Pacific Time', value: 'America/Los_Angeles' },
    { label: 'UTC', value: 'UTC' },
  ];

  const durationOptions = [
    { label: '7 days', value: '7' },
    { label: '14 days', value: '14' },
    { label: '30 days', value: '30' },
    { label: '60 days', value: '60' },
    { label: '90 days', value: '90' },
    { label: 'No expiration', value: '0' },
  ];

  const resetModalMarkup = (
    <Modal
      open={resetModalActive}
      onClose={() => setResetModalActive(false)}
      title="Reset all settings?"
      primaryAction={{
        content: 'Reset Settings',
        destructive: true,
        onAction: handleResetSettings,
      }}
      secondaryActions={[
        {
          content: 'Cancel',
          onAction: () => setResetModalActive(false),
        },
      ]}
    >
      <Modal.Section>
        <TextContainer>
          <p>
            This will reset all settings to their default values. This action cannot be undone.
          </p>
        </TextContainer>
      </Modal.Section>
    </Modal>
  );

  return (
    <Page
      title="Settings"
      primaryAction={{
        content: 'Save settings',
        onAction: handleSubmit,
        loading: saving,
      }}
      secondaryActions={[
        {
          content: 'Reset to defaults',
          destructive: true,
          onAction: () => setResetModalActive(true),
        },
      ]}
    >
      {successBanner && (
        <Banner status="success" onDismiss={() => setSuccessBanner(false)}>
          <p>Settings saved successfully!</p>
        </Banner>
      )}

      {errors.submit && (
        <Banner status="critical" onDismiss={() => setErrors({ ...errors, submit: undefined })}>
          <p>{errors.submit}</p>
        </Banner>
      )}

      <Layout>
        <Layout.Section>
          <Card sectioned title="Store Information">
            <FormLayout>
              <TextField
                label="Store Name"
                value={settings.store_name}
                onChange={(value) => handleInputChange('store_name', value)}
                error={errors.store_name}
                autoComplete="organization"
              />
              <TextField
                label="Store Email"
                type="email"
                value={settings.store_email}
                onChange={(value) => handleInputChange('store_email', value)}
                error={errors.store_email}
                autoComplete="email"
                helpText="Used for notifications and system communications"
              />
              <LegacyStack distribution="fillEvenly">
                <Select
                  label="Currency"
                  options={currencyOptions}
                  value={settings.currency}
                  onChange={(value) => handleInputChange('currency', value)}
                />
                <Select
                  label="Timezone"
                  options={timezoneOptions}
                  value={settings.timezone}
                  onChange={(value) => handleInputChange('timezone', value)}
                />
              </LegacyStack>
            </FormLayout>
          </Card>

          <Card sectioned title="Discount Defaults">
            <FormLayout>
              <Select
                label="Default Discount Duration"
                options={durationOptions}
                value={settings.default_discount_duration.toString()}
                onChange={(value) => handleInputChange('default_discount_duration', parseInt(value))}
                helpText="How long new discounts are active by default"
              />
              <TextField
                label="Maximum Discount Percentage"
                type="number"
                value={settings.max_discount_percentage.toString()}
                onChange={(value) => handleInputChange('max_discount_percentage', parseInt(value) || 0)}
                error={errors.max_discount_percentage}
                suffix="%"
                helpText="Maximum percentage discount that can be created"
              />
              <Checkbox
                label="Allow discount stacking"
                checked={settings.allow_stacking}
                onChange={(value) => handleInputChange('allow_stacking', value)}
                helpText="Allow multiple discounts to be applied to the same order"
              />
              <Checkbox
                label="Require minimum order amount"
                checked={settings.require_minimum_order}
                onChange={(value) => handleInputChange('require_minimum_order', value)}
              />
              {settings.require_minimum_order && (
                <Box paddingInlineStart="800">
                  <TextField
                    label="Minimum Order Amount"
                    type="number"
                    value={settings.minimum_order_amount}
                    onChange={(value) => handleInputChange('minimum_order_amount', value)}
                    prefix="$"
                    autoComplete="off"
                  />
                </Box>
              )}
            </FormLayout>
          </Card>

          <Card sectioned title="Automation">
            <FormLayout>
              <Checkbox
                label="Auto-deactivate expired discounts"
                checked={settings.auto_deactivate_expired}
                onChange={(value) => handleInputChange('auto_deactivate_expired', value)}
                helpText="Automatically deactivate discounts when they expire"
              />
              <Checkbox
                label="Enable email notifications"
                checked={settings.email_notifications}
                onChange={(value) => handleInputChange('email_notifications', value)}
                helpText="Receive email notifications about discount usage and performance"
              />
              <Checkbox
                label="Enable usage alerts"
                checked={settings.usage_alerts}
                onChange={(value) => handleInputChange('usage_alerts', value)}
                helpText="Get notified when discounts reach usage thresholds"
              />
              {settings.usage_alerts && (
                <Box paddingInlineStart="800">
                  <TextField
                    label="Usage Alert Threshold"
                    type="number"
                    value={settings.usage_alert_threshold.toString()}
                    onChange={(value) => handleInputChange('usage_alert_threshold', parseInt(value) || 0)}
                    error={errors.usage_alert_threshold}
                    suffix="%"
                    helpText="Send alert when discount reaches this percentage of usage limit"
                  />
                </Box>
              )}
            </FormLayout>
          </Card>

          <Card sectioned title="Integrations">
            <FormLayout>
              <LegacyStack vertical>
                <TextField
                  label="Webhook URL (optional)"
                  type="url"
                  value={settings.webhook_url}
                  onChange={(value) => handleInputChange('webhook_url', value)}
                  error={errors.webhook_url}
                  placeholder="https://your-app.com/webhooks/discounts"
                  helpText="Receive real-time notifications when discounts are used"
                />
                {settings.webhook_url && (
                  <LegacyStack alignment="center">
                    <Button
                      onClick={handleTestWebhook}
                      loading={testWebhookLoading}
                      size="slim"
                    >
                      Test Webhook
                    </Button>
                    {webhookTestResult && (
                      <Badge status={webhookTestResult === 'success' ? 'success' : 'critical'}>
                        {webhookTestResult === 'success' ? 'Success' : 'Failed'}
                      </Badge>
                    )}
                  </LegacyStack>
                )}
              </LegacyStack>
              <TextField
                label="API Rate Limit (requests per hour)"
                type="number"
                value={settings.api_rate_limit.toString()}
                onChange={(value) => handleInputChange('api_rate_limit', parseInt(value) || 0)}
                error={errors.api_rate_limit}
                helpText="Maximum API requests allowed per hour"
              />
            </FormLayout>
          </Card>

          <Card sectioned title="Data & Privacy">
            <LegacyStack vertical spacing="loose">
              <Text variant="headingMd" as="h3">
                Data Retention
              </Text>
              <Text variant="bodyMd" color="subdued">
                Discount usage data is retained for 2 years for analytics purposes. 
                Customer data is handled according to Shopify's privacy policies.
              </Text>
              <Divider />
              <Text variant="headingMd" as="h3">
                Export Data
              </Text>
              <LegacyStack>
                <Button>Export All Discounts</Button>
                <Button>Export Analytics Data</Button>
                <Button>Export Settings</Button>
              </LegacyStack>
              <Divider />
              <Text variant="headingMd" as="h3">
                Danger Zone
              </Text>
              <ButtonGroup>
                <Button destructive onClick={() => setResetModalActive(true)}>
                  Reset All Settings
                </Button>
              </ButtonGroup>
            </LegacyStack>
          </Card>
        </Layout.Section>

        <Layout.Section secondary>
          <Card sectioned title="App Information">
            <LegacyStack vertical spacing="loose">
              <LegacyStack distribution="fillEvenly">
                <Text variant="bodyMd">Version:</Text>
                <Text variant="bodyMd">v2.1.0</Text>
              </LegacyStack>
              <LegacyStack distribution="fillEvenly">
                <Text variant="bodyMd">Last Updated:</Text>
                <Text variant="bodyMd">Jan 15, 2025</Text>
              </LegacyStack>
              <LegacyStack distribution="fillEvenly">
                <Text variant="bodyMd">Status:</Text>
                <Badge status="success">Active</Badge>
              </LegacyStack>
            </LegacyStack>
          </Card>

          <Card>
            <Box padding="400">
              <Text variant="headingMd" as="h3">Support</Text>
              <Box paddingBlockStart="400">
                <LegacyStack vertical spacing="loose">
                  <Button external url="https://help.shopify.com">
                    Help Documentation
                  </Button>
                  <Button external url="mailto:support@example.com">
                    Contact Support
                  </Button>
                  <Button external url="https://github.com/example/discount-app">
                    Report Issue
                  </Button>
                </LegacyStack>
              </Box>
            </Box>
          </Card>

          <Card>
            <Box padding="400">
              <Text variant="headingMd" as="h3">Quick Stats</Text>
              <Box paddingBlockStart="400">
                <LegacyStack vertical spacing="tight">
                  <LegacyStack distribution="fillEvenly">
                    <Text variant="bodyMd" as="p" tone="subdued">Total Discounts:</Text>
                    <Text variant="bodyMd" as="p">47</Text>
                  </LegacyStack>
                  <LegacyStack distribution="fillEvenly">
                    <Text variant="bodyMd" as="p" tone="subdued">Active Discounts:</Text>
                    <Text variant="bodyMd" as="p">23</Text>
                  </LegacyStack>
                  <LegacyStack distribution="fillEvenly">
                    <Text variant="bodyMd" as="p" tone="subdued">Total Savings:</Text>
                    <Text variant="bodyMd" as="p">$2,847.50</Text>
                  </LegacyStack>
                </LegacyStack>
              </Box>
            </Box>
          </Card>
        </Layout.Section>
      </Layout>

      {resetModalMarkup}
    </Page>
  );
}

export default Settings;