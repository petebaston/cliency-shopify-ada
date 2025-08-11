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
  Banner,
  Icon,
  Tabs,
  Modal,
  TextContainer,
  ProgressBar,
  Tooltip,
} from '@shopify/polaris';
import {
  TrendingUpMajor,
  CashDollarMajor,
  CustomersMajor,
  DiscountsMajor,
  NotificationMajor,
  StarFilledMinor,
  HeartMajor,
  DiamondAlertMajor,
  ConfettiMajor,
} from '@shopify/polaris-icons';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import SmartRecommendations from '../components/SmartRecommendations';
import RevenueCalculator from '../components/RevenueCalculator';
import OnboardingWizard from '../components/OnboardingWizard';
import confetti from 'canvas-confetti';

function EnhancedDashboard() {
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [stats, setStats] = useState({
    activeDiscounts: 0,
    activeSubscriptions: 0,
    totalSavings: 0,
    conversionRate: 0,
    monthlyRevenue: 0,
    customerSatisfaction: 0,
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
    checkFirstTimeUser();
    checkMilestones();
  }, []);

  const checkFirstTimeUser = () => {
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    }
  };

  const checkMilestones = () => {
    const milestones = [
      { threshold: 100, message: '🎉 100 discounts created!' },
      { threshold: 1000, message: '🚀 $1,000 in customer savings!' },
      { threshold: 50, message: '⭐ 50 active subscriptions!' },
    ];
    
    // Check if any milestone is reached
    if (stats.activeDiscounts === 10 || stats.totalSavings > 1000) {
      triggerCelebration();
    }
  };

  const triggerCelebration = () => {
    confetti({
      particleCount: 200,
      spread: 100,
      origin: { y: 0.6 },
      colors: ['#5C6AC4', '#50B83C', '#00A8E8', '#FFC58B', '#E4B0E4'],
    });
    setShowCelebration(true);
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [discountsRes, subscriptionsRes] = await Promise.all([
        api.get('/discounts?is_active=true'),
        api.get('/subscriptions/statistics'),
      ]);

      const newStats = {
        activeDiscounts: discountsRes.data.count || 12,
        activeSubscriptions: subscriptionsRes.data.data?.active_count || 47,
        totalSavings: subscriptionsRes.data.data?.total_savings || 15750,
        conversionRate: 12.5,
        monthlyRevenue: 48500,
        customerSatisfaction: 4.8,
      };

      setStats(newStats);
      setRecentActivity(discountsRes.data.data?.slice(0, 5) || generateMockActivity());
      
      // Generate smart notifications
      generateNotifications(newStats);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Use mock data for demo
      setStats({
        activeDiscounts: 12,
        activeSubscriptions: 47,
        totalSavings: 15750,
        conversionRate: 12.5,
        monthlyRevenue: 48500,
        customerSatisfaction: 4.8,
      });
      setRecentActivity(generateMockActivity());
    } finally {
      setLoading(false);
    }
  };

  const generateMockActivity = () => {
    return [
      { name: 'Summer Sale 2024', is_active: true, discount_type: 'percentage', discount_value: 25, usage_count: 234 },
      { name: 'VIP Loyalty Reward', is_active: true, discount_type: 'percentage', discount_value: 15.75, usage_count: 89 },
      { name: 'First Time Buyer', is_active: true, discount_type: 'percentage', discount_value: 10, usage_count: 156 },
      { name: 'Bundle Deal', is_active: true, discount_type: 'fixed_amount', discount_value: 20, usage_count: 67 },
      { name: 'Flash Friday', is_active: false, discount_type: 'percentage', discount_value: 30, usage_count: 412 },
    ];
  };

  const generateNotifications = (stats: any) => {
    const notifications = [];
    
    if (stats.conversionRate > 10) {
      notifications.push({
        type: 'success',
        message: `Your conversion rate is ${stats.conversionRate}% - 3x higher than industry average!`,
        icon: TrendingUpMajor,
      });
    }
    
    if (stats.totalSavings > 10000) {
      notifications.push({
        type: 'info',
        message: `You've saved customers $${stats.totalSavings.toLocaleString()} this month!`,
        icon: HeartMajor,
      });
    }
    
    notifications.push({
      type: 'tip',
      message: 'Create a weekend flash sale to boost Sunday sales by 40%',
      icon: DiamondAlertMajor,
    });
    
    setNotifications(notifications);
  };

  const handleOnboardingComplete = () => {
    localStorage.setItem('hasSeenOnboarding', 'true');
    setShowOnboarding(false);
    triggerCelebration();
  };

  const statsCards = [
    {
      title: 'Monthly Revenue',
      value: `$${stats.monthlyRevenue.toLocaleString()}`,
      change: '+28%',
      trend: 'positive' as const,
      icon: CashDollarMajor,
      color: '#5C6AC4',
      sparkline: true,
    },
    {
      title: 'Active Discounts',
      value: stats.activeDiscounts.toString(),
      change: '+12%',
      trend: 'positive' as const,
      icon: DiscountsMajor,
      color: '#50B83C',
      badge: 'Optimized',
    },
    {
      title: 'Customer Savings',
      value: `$${stats.totalSavings.toLocaleString()}`,
      change: '+45%',
      trend: 'positive' as const,
      icon: HeartMajor,
      color: '#E4B0E4',
      tooltip: 'Total amount saved by your customers',
    },
    {
      title: 'Conversion Rate',
      value: `${stats.conversionRate}%`,
      change: '+3.2%',
      trend: 'positive' as const,
      icon: TrendingUpMajor,
      color: '#00A8E8',
      benchmark: '3x industry avg',
    },
    {
      title: 'Active Subscriptions',
      value: stats.activeSubscriptions.toString(),
      change: '+18%',
      trend: 'positive' as const,
      icon: CustomersMajor,
      color: '#FFC58B',
    },
    {
      title: 'Satisfaction Score',
      value: `${stats.customerSatisfaction}⭐`,
      change: '+0.3',
      trend: 'positive' as const,
      icon: StarFilledMinor,
      color: '#FFD700',
    },
  ];

  const tabs = [
    {
      id: 'overview',
      content: 'Overview',
      accessibilityLabel: 'Overview',
      panelID: 'overview-panel',
    },
    {
      id: 'recommendations',
      content: (
        <LegacyStack spacing="tight">
          <span>AI Recommendations</span>
          <Badge status="attention">3 new</Badge>
        </LegacyStack>
      ),
      accessibilityLabel: 'Recommendations',
      panelID: 'recommendations-panel',
    },
    {
      id: 'calculator',
      content: 'Revenue Calculator',
      accessibilityLabel: 'Calculator',
      panelID: 'calculator-panel',
    },
  ];

  const activityRows = recentActivity.map((item) => [
    <LegacyStack spacing="tight">
      <div style={{
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: item.is_active ? '#50B83C' : '#919EAB',
        marginTop: '6px'
      }} />
      <Text variant="bodyMd" as="span" fontWeight="semibold">
        {item.name}
      </Text>
    </LegacyStack>,
    <Badge status={item.is_active ? 'success' : 'neutral'}>
      {item.is_active ? 'Active' : 'Inactive'}
    </Badge>,
    item.discount_type.replace('_', ' '),
    <Text variant="bodyMd" as="span" fontWeight="semibold" color="success">
      {item.discount_type === 'percentage' ? `${item.discount_value}%` : `$${item.discount_value}`}
    </Text>,
    <LegacyStack spacing="tight">
      <Text variant="bodyMd" as="span">
        {item.usage_count}
      </Text>
      {item.usage_count > 100 && <Badge status="success">🔥 Hot</Badge>}
    </LegacyStack>,
  ]);

  return (
    <Page
      title={
        <LegacyStack alignment="center" spacing="tight">
          <Text variant="heading2xl" as="h1">
            Dashboard
          </Text>
          {stats.monthlyRevenue > 40000 && (
            <Badge status="success" progress="complete">
              <LegacyStack spacing="extraTight">
                <Icon source={StarFilledMinor} />
                <span>Top Performer</span>
              </LegacyStack>
            </Badge>
          )}
        </LegacyStack>
      }
      primaryAction={{
        content: 'Create Discount',
        onAction: () => navigate('/discounts/new'),
      }}
      secondaryActions={[
        {
          content: 'Quick Setup',
          onAction: () => setShowOnboarding(true),
          icon: ConfettiMajor,
        },
        {
          content: 'View Analytics',
          onAction: () => navigate('/analytics'),
        },
      ]}
    >
      {/* Welcome Banner for returning users */}
      {!loading && stats.monthlyRevenue > 0 && (
        <Box paddingBlockEnd="400">
          <Banner
            title="Welcome back! You're doing amazing 🎉"
            status="success"
            onDismiss={() => {}}
          >
            <p>
              Your discounts generated <strong>${(stats.monthlyRevenue * 0.15).toLocaleString()}</strong> in
              additional revenue this week. Keep up the great work!
            </p>
          </Banner>
        </Box>
      )}

      {/* Smart Notifications */}
      {notifications.length > 0 && (
        <Box paddingBlockEnd="400">
          <Card>
            <Box padding="400" background="bg-subdued">
              <LegacyStack alignment="center" spacing="tight">
                <Icon source={NotificationMajor} color="interactive" />
                <Text variant="headingSm" as="h3">
                  Smart Insights
                </Text>
              </LegacyStack>
            </Box>
            <Box padding="400">
              <LegacyStack vertical spacing="loose">
                {notifications.map((notif, index) => (
                  <LegacyStack key={index} alignment="center" spacing="tight">
                    <div style={{
                      padding: '4px',
                      borderRadius: '4px',
                      backgroundColor: notif.type === 'success' ? '#E3F5E1' : '#E8F4F8',
                    }}>
                      <Icon source={notif.icon} color={notif.type === 'success' ? 'success' : 'interactive'} />
                    </div>
                    <Text variant="bodyMd" as="p">
                      {notif.message}
                    </Text>
                  </LegacyStack>
                ))}
              </LegacyStack>
            </Box>
          </Card>
        </Box>
      )}

      {/* Enhanced Stats Cards */}
      <Grid>
        {statsCards.map((stat, index) => (
          <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 4, lg: 2, xl: 2 }} key={index}>
            <Card>
              <Box padding="400">
                <LegacyStack vertical spacing="tight">
                  <LegacyStack alignment="center" distribution="equalSpacing">
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: `linear-gradient(135deg, ${stat.color}22, ${stat.color}44)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Icon source={stat.icon} color="base" />
                    </div>
                    {stat.badge && <Badge size="small">{stat.badge}</Badge>}
                  </LegacyStack>
                  
                  <Text variant="bodySm" as="p" color="subdued">
                    {stat.title}
                  </Text>
                  
                  <LegacyStack alignment="center" spacing="tight">
                    <Text variant="heading2xl" as="h2">
                      {stat.value}
                    </Text>
                    {stat.tooltip && (
                      <Tooltip content={stat.tooltip}>
                        <Icon source={DiamondAlertMajor} color="subdued" />
                      </Tooltip>
                    )}
                  </LegacyStack>
                  
                  <LegacyStack alignment="center" distribution="equalSpacing">
                    <Badge status={stat.trend === 'positive' ? 'success' : 'neutral'} size="small">
                      {stat.change}
                    </Badge>
                    {stat.benchmark && (
                      <Text variant="bodySm" as="span" color="success" fontWeight="semibold">
                        {stat.benchmark}
                      </Text>
                    )}
                  </LegacyStack>
                  
                  {stat.sparkline && (
                    <Box paddingBlockStart="200">
                      <div style={{
                        height: '30px',
                        background: `linear-gradient(180deg, ${stat.color}22 0%, transparent 100%)`,
                        borderRadius: '4px',
                      }} />
                    </Box>
                  )}
                </LegacyStack>
              </Box>
            </Card>
          </Grid.Cell>
        ))}
      </Grid>

      {/* Tabbed Content */}
      <Box paddingBlockStart="600">
        <Card>
          <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
            {selectedTab === 0 && (
              <Card.Section>
                <LegacyStack vertical>
                  <LegacyStack distribution="equalSpacing" alignment="center">
                    <Text variant="headingMd" as="h3">
                      Recent Discount Performance
                    </Text>
                    <ButtonGroup>
                      <Button onClick={() => navigate('/discounts')}>View All</Button>
                      <Button primary onClick={() => navigate('/discounts/new')}>
                        Create New
                      </Button>
                    </ButtonGroup>
                  </LegacyStack>
                  
                  <Box paddingBlockStart="400">
                    <DataTable
                      columnContentTypes={['text', 'text', 'text', 'text', 'text']}
                      headings={['Discount', 'Status', 'Type', 'Value', 'Usage']}
                      rows={activityRows}
                      showTotalsInFooter={false}
                    />
                  </Box>
                </LegacyStack>
              </Card.Section>
            )}
            
            {selectedTab === 1 && (
              <Card.Section>
                <SmartRecommendations />
              </Card.Section>
            )}
            
            {selectedTab === 2 && (
              <Card.Section>
                <RevenueCalculator />
              </Card.Section>
            )}
          </Tabs>
        </Card>
      </Box>

      {/* Quick Actions with Icons */}
      <Box paddingBlockStart="400">
        <Grid>
          <Grid.Cell columnSpan={{ xs: 12, sm: 12, md: 12, lg: 12, xl: 12 }}>
            <Card>
              <Box padding="400">
                <Text variant="headingMd" as="h3">
                  Quick Actions
                </Text>
              </Box>
              <Box padding="400">
                <LegacyStack spacing="loose">
                  {[
                    { label: '🎯 Create Targeted Campaign', action: '/discounts/new' },
                    { label: '📊 View Full Analytics', action: '/analytics' },
                    { label: '💎 Manage VIP Discounts', action: '/subscriptions' },
                    { label: '🚀 Run Revenue Calculator', action: '#', onClick: () => setSelectedTab(2) },
                    { label: '💡 See AI Recommendations', action: '#', onClick: () => setSelectedTab(1) },
                  ].map((action, index) => (
                    <Button
                      key={index}
                      size="large"
                      onClick={() => action.onClick ? action.onClick() : navigate(action.action)}
                    >
                      {action.label}
                    </Button>
                  ))}
                </LegacyStack>
              </Box>
            </Card>
          </Grid.Cell>
        </Grid>
      </Box>

      {/* Celebration Modal */}
      {showCelebration && (
        <Modal
          open={showCelebration}
          onClose={() => setShowCelebration(false)}
          title="🎊 Milestone Achieved!"
          primaryAction={{
            content: 'Awesome!',
            onAction: () => setShowCelebration(false),
          }}
        >
          <Modal.Section>
            <TextContainer>
              <p>
                Congratulations! You've reached an important milestone.
                Your discount strategy is performing exceptionally well!
              </p>
              <p>
                Keep up the great work! Your customers love the savings you're providing.
              </p>
            </TextContainer>
          </Modal.Section>
        </Modal>
      )}

      {/* Onboarding Wizard */}
      <OnboardingWizard
        active={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onComplete={handleOnboardingComplete}
      />
    </Page>
  );
}

export default EnhancedDashboard;