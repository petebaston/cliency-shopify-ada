import React, { useEffect, useState } from 'react';
import {
  Page,
  Card,
  Grid,
  Text,
  Badge,
  DataTable,
  Button,
  ButtonGroup,
  LegacyStack,
  Box,
} from '@shopify/polaris';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    activeDiscounts: 0,
    activeSubscriptions: 0,
    totalSavings: 0,
    conversionRate: 0,
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [discountsRes, subscriptionsRes] = await Promise.all([
        api.get('/discounts?is_active=true'),
        api.get('/subscriptions/statistics'),
      ]);

      setStats({
        activeDiscounts: discountsRes.data.count || 0,
        activeSubscriptions: subscriptionsRes.data.data?.active_count || 0,
        totalSavings: subscriptionsRes.data.data?.total_savings || 0,
        conversionRate: 8.5,
      });

      setRecentActivity(discountsRes.data.data?.slice(0, 5) || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statsCards = [
    {
      title: 'Active Discounts',
      value: stats.activeDiscounts.toString(),
      change: '+12%',
      trend: 'positive' as const,
    },
    {
      title: 'Active Subscriptions',
      value: stats.activeSubscriptions.toString(),
      change: '+8%',
      trend: 'positive' as const,
    },
    {
      title: 'Total Savings',
      value: `$${stats.totalSavings.toLocaleString()}`,
      change: '+25%',
      trend: 'positive' as const,
    },
    {
      title: 'Conversion Rate',
      value: `${stats.conversionRate}%`,
      change: '+2.3%',
      trend: 'positive' as const,
    },
  ];

  const activityRows = recentActivity.map((item) => [
    item.name,
    <Badge tone={item.is_active ? 'success' : 'base'}>
      {item.is_active ? 'Active' : 'Inactive'}
    </Badge>,
    item.discount_type,
    `${item.discount_value}${item.discount_type === 'percentage' ? '%' : ''}`,
    item.usage_count || 0,
  ]);

  return (
    <Page
      title="Dashboard"
      primaryAction={{
        content: 'Create Discount',
        onAction: () => navigate('/discounts/new'),
      }}
      secondaryActions={[
        {
          content: 'View Analytics',
          onAction: () => navigate('/analytics'),
        },
      ]}
    >
      <Grid>
        {statsCards.map((stat, index) => (
          <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 3, lg: 3, xl: 3 }} key={index}>
            <Card>
              <Box padding="400">
                <LegacyStack vertical spacing="tight">
                  <Text variant="bodyMd" as="p" tone="subdued">
                    {stat.title}
                  </Text>
                  <Text variant="heading2xl" as="h2">
                    {stat.value}
                  </Text>
                  <Badge tone={stat.trend === 'positive' ? 'success' : 'base'}>
                    {stat.change}
                  </Badge>
                </LegacyStack>
              </Box>
            </Card>
          </Grid.Cell>
        ))}
      </Grid>

      <Box paddingBlockStart="400">
        <Card>
          <Box padding="400">
            <LegacyStack distribution="equalSpacing" alignment="center">
              <Text variant="headingMd" as="h3">
                Recent Discount Activity
              </Text>
              <ButtonGroup>
                <Button onClick={() => navigate('/discounts')}>View All</Button>
                <Button variant="primary" onClick={() => navigate('/discounts/new')}>
                  Create New
                </Button>
              </ButtonGroup>
            </LegacyStack>
          </Box>
          <DataTable
            columnContentTypes={['text', 'text', 'text', 'text', 'numeric']}
            headings={['Name', 'Status', 'Type', 'Value', 'Usage']}
            rows={activityRows}
            showTotalsInFooter={false}
          />
        </Card>
      </Box>

      <Box paddingBlockStart="400">
        <Grid>
          <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
            <Card>
              <Box padding="400">
                <Text variant="headingMd" as="h3">
                  Quick Actions
                </Text>
              </Box>
              <Box padding="400">
              <LegacyStack vertical spacing="tight">
                <Button fullWidth onClick={() => navigate('/discounts/new')}>
                  Create New Discount
                </Button>
                <Button fullWidth onClick={() => navigate('/subscriptions')}>
                  Manage Subscriptions
                </Button>
                <Button fullWidth onClick={() => navigate('/analytics')}>
                  View Analytics
                </Button>
              </LegacyStack>
              </Box>
            </Card>
          </Grid.Cell>
          <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
            <Card>
              <Box padding="400">
                <Text variant="headingMd" as="h3">
                  Performance Overview
                </Text>
              </Box>
              <Box padding="400">
              <LegacyStack vertical spacing="tight">
                <LegacyStack distribution="equalSpacing">
                  <Text variant="bodyMd" as="p">
                    Discount Redemption Rate
                  </Text>
                  <Badge tone="success">68%</Badge>
                </LegacyStack>
                <LegacyStack distribution="equalSpacing">
                  <Text variant="bodyMd" as="p">
                    Average Order Value
                  </Text>
                  <Text variant="bodyMd" as="p" fontWeight="semibold">
                    $125.50
                  </Text>
                </LegacyStack>
                <LegacyStack distribution="equalSpacing">
                  <Text variant="bodyMd" as="p">
                    Customer Retention
                  </Text>
                  <Badge tone="success">+15%</Badge>
                </LegacyStack>
              </LegacyStack>
              </Box>
            </Card>
          </Grid.Cell>
        </Grid>
      </Box>
    </Page>
  );
}

export default Dashboard;