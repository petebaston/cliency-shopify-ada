import React, { useState, useEffect, useCallback } from 'react';
import {
  Page,
  Card,
  Layout,
  Text,
  Select,
  LegacyStack,
  DataTable,
  Badge,
  EmptyState,
  Banner,
  Box,
  Divider,
  ButtonGroup,
  Button,
  Modal,
  TextContainer,
} from '@shopify/polaris';
import { format, subDays, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import api from '../services/api';

interface AnalyticsData {
  totalDiscounts: number;
  activeDiscounts: number;
  totalSavings: number;
  totalUsage: number;
  subscriptionDiscounts: number;
  activeSubscriptions: number;
  averageDiscountValue: number;
  conversionRate: number;
  topDiscounts: Array<{
    id: string;
    name: string;
    usage_count: number;
    total_savings: number;
    discount_value: string;
    discount_type: string;
  }>;
  topSubscriptions: Array<{
    id: string;
    customer_email: string;
    discount_percentage: string;
    usage_count: number;
    total_savings: number;
  }>;
  usageOverTime: Array<{
    date: string;
    discount_usage: number;
    subscription_usage: number;
    total_savings: number;
  }>;
}

function Analytics() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30_days');
  const [selectedMetric, setSelectedMetric] = useState<'usage' | 'savings'>('usage');
  const [exportModalActive, setExportModalActive] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchAnalyticsData();
  }, [dateRange]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('period', dateRange);

      const response = await api.get(`/analytics?${params.toString()}`);
      setAnalyticsData(response.data.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async () => {
    try {
      setExporting(true);
      const response = await api.get(`/analytics/export?period=${dateRange}`, {
        responseType: 'blob',
      });
      
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `discount-analytics-${dateRange}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      setExportModalActive(false);
    } catch (error) {
      console.error('Error exporting data:', error);
    } finally {
      setExporting(false);
    }
  };

  const dateRangeOptions = [
    { label: 'Last 7 days', value: '7_days' },
    { label: 'Last 30 days', value: '30_days' },
    { label: 'Last 3 months', value: '3_months' },
    { label: 'Last 6 months', value: '6_months' },
    { label: 'Last year', value: '1_year' },
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const getMetricColor = (value: number, isPositive: boolean = true) => {
    if (isPositive) {
      return value > 0 ? 'success' : 'subdued';
    }
    return value < 0 ? 'critical' : 'subdued';
  };

  const topDiscountsRows = analyticsData?.topDiscounts.map((discount) => [
    discount.name,
    <Badge status="info">
      {discount.discount_type.replace('_', ' ').charAt(0).toUpperCase() + 
       discount.discount_type.replace('_', ' ').slice(1)}
    </Badge>,
    discount.discount_type === 'percentage' 
      ? `${discount.discount_value}%` 
      : formatCurrency(parseFloat(discount.discount_value)),
    discount.usage_count,
    formatCurrency(discount.total_savings),
  ]) || [];

  const topSubscriptionsRows = analyticsData?.topSubscriptions.map((subscription) => [
    subscription.customer_email,
    `${subscription.discount_percentage}%`,
    subscription.usage_count,
    formatCurrency(subscription.total_savings),
  ]) || [];

  const exportModalMarkup = (
    <Modal
      open={exportModalActive}
      onClose={() => setExportModalActive(false)}
      title="Export Analytics Data"
      primaryAction={{
        content: 'Export CSV',
        onAction: handleExportData,
        loading: exporting,
      }}
      secondaryActions={[
        {
          content: 'Cancel',
          onAction: () => setExportModalActive(false),
        },
      ]}
    >
      <Modal.Section>
        <TextContainer>
          <p>
            Export your discount analytics data for the selected time period. 
            The CSV file will include detailed usage statistics, savings data, 
            and performance metrics.
          </p>
        </TextContainer>
      </Modal.Section>
    </Modal>
  );

  if (!analyticsData && !loading) {
    return (
      <Page title="Analytics">
        <Banner status="critical">
          <p>Failed to load analytics data. Please try refreshing the page.</p>
        </Banner>
      </Page>
    );
  }

  return (
    <Page
      title="Analytics Dashboard"
      primaryAction={{
        content: 'Export Data',
        onAction: () => setExportModalActive(true),
      }}
    >
      <Layout>
        <Layout.Section oneThird>
          <Card sectioned>
            <LegacyStack vertical spacing="tight">
              <Text variant="headingMd" as="h3">
                Time Period
              </Text>
              <Select
                label=""
                options={dateRangeOptions}
                value={dateRange}
                onChange={setDateRange}
              />
            </LegacyStack>
          </Card>
        </Layout.Section>

        <Layout.Section oneThird>
          <Card sectioned>
            <LegacyStack vertical spacing="tight">
              <Text variant="headingMd" as="h3">
                Chart Metric
              </Text>
              <ButtonGroup segmented>
                <Button
                  pressed={selectedMetric === 'usage'}
                  onClick={() => setSelectedMetric('usage')}
                >
                  Usage
                </Button>
                <Button
                  pressed={selectedMetric === 'savings'}
                  onClick={() => setSelectedMetric('savings')}
                >
                  Savings
                </Button>
              </ButtonGroup>
            </LegacyStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Layout>
            <Layout.Section oneHalf>
              <LegacyStack vertical>
                <Card sectioned title="Discount Performance">
                  <LegacyStack distribution="fillEvenly">
                    <LegacyStack vertical alignment="center">
                      <Text variant="headingLg" as="h3">
                        {analyticsData?.totalDiscounts || 0}
                      </Text>
                      <Text variant="bodySm" color="subdued">
                        Total Discounts
                      </Text>
                    </LegacyStack>
                    
                    <LegacyStack vertical alignment="center">
                      <Text variant="headingLg" as="h3" color="success">
                        {analyticsData?.activeDiscounts || 0}
                      </Text>
                      <Text variant="bodySm" color="subdued">
                        Active Discounts
                      </Text>
                    </LegacyStack>
                  </LegacyStack>
                </Card>

                <Card sectioned title="Subscription Metrics">
                  <LegacyStack distribution="fillEvenly">
                    <LegacyStack vertical alignment="center">
                      <Text variant="headingLg" as="h3">
                        {analyticsData?.subscriptionDiscounts || 0}
                      </Text>
                      <Text variant="bodySm" color="subdued">
                        Total Subscriptions
                      </Text>
                    </LegacyStack>
                    
                    <LegacyStack vertical alignment="center">
                      <Text variant="headingLg" as="h3" color="success">
                        {analyticsData?.activeSubscriptions || 0}
                      </Text>
                      <Text variant="bodySm" color="subdued">
                        Active Subscriptions
                      </Text>
                    </LegacyStack>
                  </LegacyStack>
                </Card>
              </LegacyStack>
            </Layout.Section>

            <Layout.Section oneHalf>
              <LegacyStack vertical>
                <Card sectioned title="Revenue Impact">
                  <LegacyStack distribution="fillEvenly">
                    <LegacyStack vertical alignment="center">
                      <Text variant="headingLg" as="h3" color="success">
                        {formatCurrency(analyticsData?.totalSavings || 0)}
                      </Text>
                      <Text variant="bodySm" color="subdued">
                        Total Savings Given
                      </Text>
                    </LegacyStack>
                    
                    <LegacyStack vertical alignment="center">
                      <Text variant="headingLg" as="h3">
                        {formatCurrency(analyticsData?.averageDiscountValue || 0)}
                      </Text>
                      <Text variant="bodySm" color="subdued">
                        Average Discount
                      </Text>
                    </LegacyStack>
                  </LegacyStack>
                </Card>

                <Card sectioned title="Usage Statistics">
                  <LegacyStack distribution="fillEvenly">
                    <LegacyStack vertical alignment="center">
                      <Text variant="headingLg" as="h3">
                        {analyticsData?.totalUsage || 0}
                      </Text>
                      <Text variant="bodySm" color="subdued">
                        Total Uses
                      </Text>
                    </LegacyStack>
                    
                    <LegacyStack vertical alignment="center">
                      <Text variant="headingLg" as="h3" color="success">
                        {formatPercentage(analyticsData?.conversionRate || 0)}
                      </Text>
                      <Text variant="bodySm" color="subdued">
                        Conversion Rate
                      </Text>
                    </LegacyStack>
                  </LegacyStack>
                </Card>
              </LegacyStack>
            </Layout.Section>
          </Layout>
        </Layout.Section>

        <Layout.Section>
          <Card title="Top Performing Discounts">
            {topDiscountsRows.length > 0 ? (
              <DataTable
                columnContentTypes={[
                  'text',
                  'text',
                  'text',
                  'numeric',
                  'numeric',
                ]}
                headings={[
                  'Discount Name',
                  'Type',
                  'Value',
                  'Usage Count',
                  'Total Savings',
                ]}
                rows={topDiscountsRows}
              />
            ) : (
              <Card.Section>
                <EmptyState
                  heading="No discount data available"
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>Create some discounts to see performance data here.</p>
                </EmptyState>
              </Card.Section>
            )}
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card title="Top Subscription Discounts">
            {topSubscriptionsRows.length > 0 ? (
              <DataTable
                columnContentTypes={[
                  'text',
                  'text',
                  'numeric',
                  'numeric',
                ]}
                headings={[
                  'Customer',
                  'Discount %',
                  'Usage Count',
                  'Total Savings',
                ]}
                rows={topSubscriptionsRows}
              />
            ) : (
              <Card.Section>
                <EmptyState
                  heading="No subscription data available"
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>Create subscription discounts to see performance data here.</p>
                </EmptyState>
              </Card.Section>
            )}
          </Card>
        </Layout.Section>

        {analyticsData?.usageOverTime && analyticsData.usageOverTime.length > 0 && (
          <Layout.Section>
            <Card sectioned title="Usage Trends">
              <Box paddingBlockStart="400" paddingBlockEnd="400">
                <Text variant="bodyMd" color="subdued" alignment="center">
                  Chart visualization would be implemented here using a charting library like Chart.js or D3.js
                </Text>
                <Divider />
                <Box paddingBlockStart="400">
                  <Text variant="headingMd" as="h4">
                    Sample Data Points:
                  </Text>
                  {analyticsData.usageOverTime.slice(0, 3).map((dataPoint, index) => (
                    <LegacyStack key={index} distribution="fillEvenly">
                      <Text variant="bodySm">
                        {format(new Date(dataPoint.date), 'MMM dd, yyyy')}
                      </Text>
                      <Text variant="bodySm">
                        Usage: {dataPoint.discount_usage + dataPoint.subscription_usage}
                      </Text>
                      <Text variant="bodySm">
                        Savings: {formatCurrency(dataPoint.total_savings)}
                      </Text>
                    </LegacyStack>
                  ))}
                </Box>
              </Box>
            </Card>
          </Layout.Section>
        )}
      </Layout>

      {exportModalMarkup}
    </Page>
  );
}

export default Analytics;