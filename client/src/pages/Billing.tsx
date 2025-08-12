import React, { useState, useEffect, useCallback } from 'react';
import {
  Page,
  Card,
  Grid,
  Text,
  Button,
  Badge,
  Banner,
  LegacyStack,
  Icon,
  Box,
  Modal,
  TextContainer,
  ProgressBar,
  List,
  ButtonGroup,
  Divider,
} from '@shopify/polaris';
import {
  CheckCircleIcon,
  XCircleIcon,
  StarFilledIcon,
  AlertDiamondIcon,
  CashDollarIcon,
  TrophyIcon,
  RocketIcon,
  HeartIcon,
  ChartLineIcon,
  PersonIcon,
} from '@shopify/polaris-icons';
import { useNavigate } from 'react-router-dom';
import { useAppBridge } from '@shopify/app-bridge-react';
import { Redirect } from '@shopify/app-bridge/actions';
import api from '../services/api';
import confetti from 'canvas-confetti';

interface Plan {
  id: string;
  name: string;
  price: number;
  interval: string;
  popular?: boolean;
  icon: any;
  color: string;
  features: {
    text: string;
    included: boolean;
  }[];
  limits: {
    maxDiscounts: number | null;
    aiRecommendations: boolean;
    advancedAnalytics: boolean;
    prioritySupport: boolean;
    apiAccess?: boolean;
    customReports?: boolean;
  };
}

function Billing() {
  const navigate = useNavigate();
  const app = useAppBridge();
  const redirect = Redirect.create(app);
  
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [trialDaysRemaining, setTrialDaysRemaining] = useState<number | null>(null);
  const [billingStatus, setBillingStatus] = useState<any>(null);

  const plans: Plan[] = [
    {
      id: 'starter',
      name: 'Starter',
      price: 29,
      interval: 'month',
      icon: RocketMajor,
      color: '#00A8E8',
      features: [
        { text: 'Up to 10 active discounts', included: true },
        { text: 'Basic analytics dashboard', included: true },
        { text: 'Email support', included: true },
        { text: 'Decimal percentage discounts', included: true },
        { text: 'Subscription management', included: true },
        { text: 'AI-powered recommendations', included: false },
        { text: 'Advanced analytics', included: false },
        { text: 'Priority support', included: false },
        { text: 'API access', included: false },
      ],
      limits: {
        maxDiscounts: 10,
        aiRecommendations: false,
        advancedAnalytics: false,
        prioritySupport: false,
      },
    },
    {
      id: 'growth',
      name: 'Growth',
      price: 79,
      interval: 'month',
      popular: true,
      icon: TrophyMajor,
      color: '#50B83C',
      features: [
        { text: 'Unlimited active discounts', included: true },
        { text: 'Advanced analytics & reports', included: true },
        { text: 'AI-powered recommendations', included: true },
        { text: 'Revenue impact calculator', included: true },
        { text: 'Priority email support', included: true },
        { text: 'Bulk import/export', included: true },
        { text: 'Customer segmentation', included: true },
        { text: 'A/B testing tools', included: true },
        { text: 'API access', included: false },
      ],
      limits: {
        maxDiscounts: null,
        aiRecommendations: true,
        advancedAnalytics: true,
        prioritySupport: false,
      },
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 199,
      interval: 'month',
      icon: AlertDiamondIcon,
      color: '#9C6ADE',
      features: [
        { text: 'Everything in Growth', included: true },
        { text: 'Dedicated account manager', included: true },
        { text: '24/7 priority support', included: true },
        { text: 'Custom integrations', included: true },
        { text: 'Full API access', included: true },
        { text: 'White-label options', included: true },
        { text: 'Custom reporting', included: true },
        { text: 'Training sessions', included: true },
        { text: 'SLA guarantee', included: true },
      ],
      limits: {
        maxDiscounts: null,
        aiRecommendations: true,
        advancedAnalytics: true,
        prioritySupport: true,
        apiAccess: true,
        customReports: true,
      },
    },
  ];

  useEffect(() => {
    fetchBillingStatus();
  }, []);

  const fetchBillingStatus = async () => {
    try {
      setLoading(true);
      const response = await api.get('/billing/status');
      
      if (response.data) {
        setBillingStatus(response.data);
        
        if (response.data.hasActiveSubscription) {
          setCurrentPlan(response.data.subscription.plan);
          
          if (response.data.subscription.isInTrial && response.data.subscription.trialEndsAt) {
            const trialEnd = new Date(response.data.subscription.trialEndsAt);
            const now = new Date();
            const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            setTrialDaysRemaining(daysRemaining > 0 ? daysRemaining : 0);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching billing status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlanSelection = useCallback((plan: Plan) => {
    setSelectedPlan(plan);
    setUpgradeModalOpen(true);
  }, []);

  const handleUpgrade = async () => {
    if (!selectedPlan) return;
    
    setProcessingPayment(true);
    
    try {
      const response = await api.post('/billing/create-charge', {
        plan: selectedPlan.id,
      });
      
      if (response.data?.confirmationUrl) {
        // Redirect to Shopify billing confirmation page
        redirect.dispatch(Redirect.Action.REMOTE, response.data.confirmationUrl);
      }
    } catch (error) {
      console.error('Error creating billing charge:', error);
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      await api.post('/billing/cancel');
      fetchBillingStatus();
    } catch (error) {
      console.error('Error cancelling subscription:', error);
    }
  };

  const triggerUpgradeCelebration = () => {
    confetti({
      particleCount: 200,
      spread: 100,
      origin: { y: 0.6 },
      colors: ['#5C6AC4', '#50B83C', '#00A8E8', '#FFC58B'],
    });
  };

  if (loading) {
    return (
      <Page title="Billing & Plans">
        <Card sectioned>
          <LegacyStack vertical>
            <Text variant="headingMd" as="h3">
              Loading billing information...
            </Text>
            <ProgressBar progress={75} size="small" />
          </LegacyStack>
        </Card>
      </Page>
    );
  }

  return (
    <Page
      title="Billing & Plans"
      subtitle="Choose the perfect plan for your business"
      breadcrumbs={[{ content: 'Settings', url: '/settings' }]}
    >
      {/* Trial Banner */}
      {trialDaysRemaining !== null && trialDaysRemaining > 0 && (
        <Box paddingBlockEnd="400">
          <Banner
            title={`Free trial: ${trialDaysRemaining} days remaining`}
            status="info"
            action={{ content: 'Upgrade Now', onAction: () => handlePlanSelection(plans[1]) }}
          >
            <p>
              You're currently on a free trial. Upgrade now to ensure uninterrupted service and unlock all features.
            </p>
          </Banner>
        </Box>
      )}

      {/* Current Plan */}
      {currentPlan && (
        <Box paddingBlockEnd="600">
          <Card>
            <Box padding="400" background="bg-subdued">
              <LegacyStack alignment="center" distribution="equalSpacing">
                <LegacyStack alignment="center" spacing="tight">
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #5C6AC4, #9C6ADE)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Icon source={CashDollarIcon} color="base" />
                  </div>
                  <LegacyStack vertical spacing="extraTight">
                    <Text variant="headingMd" as="h3">
                      Current Plan
                    </Text>
                    <LegacyStack spacing="tight">
                      <Badge status="success" size="medium">
                        {plans.find(p => p.id === currentPlan)?.name || currentPlan}
                      </Badge>
                      {trialDaysRemaining !== null && trialDaysRemaining > 0 && (
                        <Badge status="info">Trial</Badge>
                      )}
                    </LegacyStack>
                  </LegacyStack>
                </LegacyStack>
                
                <ButtonGroup>
                  {currentPlan !== 'pro' && (
                    <Button primary onClick={() => handlePlanSelection(plans[2])}>
                      Upgrade Plan
                    </Button>
                  )}
                  <Button plain destructive onClick={handleCancelSubscription}>
                    Cancel Subscription
                  </Button>
                </ButtonGroup>
              </LegacyStack>
            </Box>
          </Card>
        </Box>
      )}

      {/* ROI Calculator Banner */}
      <Box paddingBlockEnd="600">
        <Card>
          <Box padding="400" background="bg-success-subdued">
            <LegacyStack alignment="center" distribution="equalSpacing">
              <LegacyStack vertical spacing="tight">
                <LegacyStack alignment="center" spacing="tight">
                  <Icon source={ChartLineIcon} color="success" />
                  <Text variant="headingMd" as="h3">
                    Average ROI with our app
                  </Text>
                </LegacyStack>
                <Text variant="bodyLg" as="p">
                  Our merchants see an average <strong>312% ROI</strong> within the first 3 months
                </Text>
              </LegacyStack>
              <Button onClick={() => navigate('/analytics')}>
                Calculate Your ROI
              </Button>
            </LegacyStack>
          </Box>
        </Card>
      </Box>

      {/* Plans Grid */}
      <Grid>
        {plans.map((plan) => (
          <Grid.Cell key={plan.id} columnSpan={{ xs: 12, sm: 12, md: 4, lg: 4, xl: 4 }}>
            <Card>
              {plan.popular && (
                <Box padding="200" background="bg-warning-subdued">
                  <LegacyStack alignment="center" distribution="center" spacing="tight">
                    <Icon source={StarFilledIcon} color="warning" />
                    <Text variant="bodySm" as="p" fontWeight="bold">
                      MOST POPULAR
                    </Text>
                  </LegacyStack>
                </Box>
              )}
              
              <Box padding="400">
                <LegacyStack vertical spacing="loose">
                  <LegacyStack alignment="center" distribution="center">
                    <div style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '12px',
                      background: `linear-gradient(135deg, ${plan.color}22, ${plan.color}44)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Icon source={plan.icon} color="base" />
                    </div>
                  </LegacyStack>
                  
                  <LegacyStack vertical spacing="tight" alignment="center">
                    <Text variant="headingLg" as="h3">
                      {plan.name}
                    </Text>
                    <LegacyStack alignment="baseline" spacing="tight">
                      <Text variant="heading3xl" as="p" fontWeight="bold">
                        ${plan.price}
                      </Text>
                      <Text variant="bodyMd" as="p" color="subdued">
                        per {plan.interval}
                      </Text>
                    </LegacyStack>
                  </LegacyStack>
                  
                  <Divider />
                  
                  <List>
                    {plan.features.map((feature, index) => (
                      <List.Item key={index}>
                        <LegacyStack spacing="tight">
                          <Icon
                            source={feature.included ? CheckCircleIcon : CircleDisableMinor}
                            color={feature.included ? 'success' : 'subdued'}
                          />
                          <Text
                            variant="bodyMd"
                            as="span"
                            color={feature.included ? undefined : 'subdued'}
                          >
                            {feature.text}
                          </Text>
                        </LegacyStack>
                      </List.Item>
                    ))}
                  </List>
                  
                  <Box paddingBlockStart="400">
                    <Button
                      fullWidth
                      primary={plan.popular}
                      onClick={() => handlePlanSelection(plan)}
                      disabled={currentPlan === plan.id}
                    >
                      {currentPlan === plan.id ? 'Current Plan' : `Choose ${plan.name}`}
                    </Button>
                  </Box>
                </LegacyStack>
              </Box>
            </Card>
          </Grid.Cell>
        ))}
      </Grid>

      {/* Features Comparison */}
      <Box paddingBlockStart="800">
        <Card title="Why merchants love our app" sectioned>
          <Grid>
            <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 3, lg: 3, xl: 3 }}>
              <LegacyStack vertical spacing="tight" alignment="center">
                <Icon source={HeartMajor} color="critical" />
                <Text variant="headingSm" as="h4">
                  Save Time
                </Text>
                <Text variant="bodySm" as="p" color="subdued" alignment="center">
                  Automate discount management and save 10+ hours per week
                </Text>
              </LegacyStack>
            </Grid.Cell>
            
            <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 3, lg: 3, xl: 3 }}>
              <LegacyStack vertical spacing="tight" alignment="center">
                <Icon source={ChartLineIcon} color="success" />
                <Text variant="headingSm" as="h4">
                  Increase Sales
                </Text>
                <Text variant="bodySm" as="p" color="subdued" alignment="center">
                  Average 23% increase in conversion rates
                </Text>
              </LegacyStack>
            </Grid.Cell>
            
            <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 3, lg: 3, xl: 3 }}>
              <LegacyStack vertical spacing="tight" alignment="center">
                <Icon source={PersonIcon} color="interactive" />
                <Text variant="headingSm" as="h4">
                  Happy Customers
                </Text>
                <Text variant="bodySm" as="p" color="subdued" alignment="center">
                  Personalized discounts improve satisfaction
                </Text>
              </LegacyStack>
            </Grid.Cell>
            
            <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 3, lg: 3, xl: 3 }}>
              <LegacyStack vertical spacing="tight" alignment="center">
                <Icon source={RocketMajor} color="warning" />
                <Text variant="headingSm" as="h4">
                  Quick Setup
                </Text>
                <Text variant="bodySm" as="p" color="subdued" alignment="center">
                  Get started in under 3 minutes
                </Text>
              </LegacyStack>
            </Grid.Cell>
          </Grid>
        </Card>
      </Box>

      {/* FAQ Section */}
      <Box paddingBlockStart="400">
        <Card title="Frequently Asked Questions" sectioned>
          <LegacyStack vertical spacing="loose">
            <Box>
              <Text variant="headingSm" as="h4">
                Can I change plans at any time?
              </Text>
              <Text variant="bodyMd" as="p" color="subdued">
                Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.
              </Text>
            </Box>
            
            <Box>
              <Text variant="headingSm" as="h4">
                Is there a free trial?
              </Text>
              <Text variant="bodyMd" as="p" color="subdued">
                Yes, all plans come with a 14-day free trial. No credit card required to start.
              </Text>
            </Box>
            
            <Box>
              <Text variant="headingSm" as="h4">
                What happens to my data if I cancel?
              </Text>
              <Text variant="bodyMd" as="p" color="subdued">
                Your data is retained for 30 days after cancellation. You can export it at any time.
              </Text>
            </Box>
          </LegacyStack>
        </Card>
      </Box>

      {/* Upgrade Modal */}
      <Modal
        open={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        title={`Upgrade to ${selectedPlan?.name}`}
        primaryAction={{
          content: processingPayment ? 'Processing...' : 'Continue to Payment',
          onAction: handleUpgrade,
          loading: processingPayment,
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => setUpgradeModalOpen(false),
          },
        ]}
      >
        <Modal.Section>
          <TextContainer>
            <p>
              You're about to upgrade to the <strong>{selectedPlan?.name}</strong> plan 
              for <strong>${selectedPlan?.price}/month</strong>.
            </p>
            {trialDaysRemaining !== null && trialDaysRemaining > 0 && (
              <Banner status="info">
                Your free trial will continue until it expires. You'll be charged after the trial ends.
              </Banner>
            )}
            <p>
              This plan includes:
            </p>
            <List type="bullet">
              {selectedPlan?.features
                .filter(f => f.included)
                .slice(0, 5)
                .map((feature, index) => (
                  <List.Item key={index}>{feature.text}</List.Item>
                ))}
            </List>
          </TextContainer>
        </Modal.Section>
      </Modal>
    </Page>
  );
}

export default Billing;