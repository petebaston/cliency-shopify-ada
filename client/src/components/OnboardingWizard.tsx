import React, { useState, useCallback } from 'react';
import {
  Modal,
  TextContainer,
  ProgressBar,
  Button,
  ButtonGroup,
  TextField,
  Select,
  Banner,
  List,
  Icon,
  LegacyStack,
  Box,
  Text,
  Card,
  VideoThumbnail,
  Checkbox,
  Badge,
} from '@shopify/polaris';
import {
  CheckCircleIcon,
  InfoIcon,
  StarFilledIcon,
  LightbulbIcon,
  PlayCircleIcon,
} from '@shopify/polaris-icons';
import confetti from 'canvas-confetti';
import api from '../services/api';

interface OnboardingWizardProps {
  active: boolean;
  onClose: () => void;
  onComplete: () => void;
}

function OnboardingWizard({ active, onClose, onComplete }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [wizardData, setWizardData] = useState({
    businessGoal: '',
    averageOrderValue: '',
    monthlyOrders: '',
    primaryCustomerSegment: '',
    discountStrategy: '',
    automationPreference: true,
    emailNotifications: true,
  });

  const steps = [
    'Welcome',
    'Business Goals',
    'Store Insights',
    'Discount Strategy',
    'Quick Setup',
    'Success!',
  ];

  const progressPercentage = ((currentStep + 1) / steps.length) * 100;

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      
      // Trigger celebration on completion
      if (currentStep === steps.length - 2) {
        setTimeout(() => {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#5C6AC4', '#50B83C', '#00A8E8'],
          });
        }, 500);
      }
    } else {
      onComplete();
    }
  }, [currentStep, onComplete]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const handleDataChange = useCallback((field: string, value: any) => {
    setWizardData((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <Box>
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: '64px', marginBottom: '20px' }}>🎉</div>
              <Text variant="heading2xl" as="h1">
                Welcome to Discount Manager Pro!
              </Text>
              <Box paddingBlockStart="400">
                <Text variant="bodyLg" as="p" color="subdued">
                  Let's get your discount strategy up and running in just 3 minutes
                </Text>
              </Box>
            </div>
            
            <Box paddingBlockStart="800">
              <Card>
                <Box padding="400">
                  <Text variant="headingMd" as="h3">
                    What you'll get:
                  </Text>
                  <Box paddingBlockStart="400">
                    <List type="bullet">
                      <List.Item>
                        <LegacyStack spacing="tight">
                          <Icon source={StarFilledIcon} color="warning" />
                          <Text as="span">Personalized discount recommendations based on your store data</Text>
                        </LegacyStack>
                      </List.Item>
                      <List.Item>
                        <LegacyStack spacing="tight">
                          <Icon source={StarFilledIcon} color="warning" />
                          <Text as="span">Automated discount campaigns that boost sales</Text>
                        </LegacyStack>
                      </List.Item>
                      <List.Item>
                        <LegacyStack spacing="tight">
                          <Icon source={StarFilledIcon} color="warning" />
                          <Text as="span">Real-time analytics to track your success</Text>
                        </LegacyStack>
                      </List.Item>
                      <List.Item>
                        <LegacyStack spacing="tight">
                          <Icon source={StarFilledIcon} color="warning" />
                          <Text as="span">24/7 support and regular feature updates</Text>
                        </LegacyStack>
                      </List.Item>
                    </List>
                  </Box>
                </Box>
              </Card>
            </Box>

            <Box paddingBlockStart="400">
              <Banner status="info" icon={LightbulbIcon}>
                <Text as="p" fontWeight="semibold">
                  Pro Tip: Stores using our app see an average 23% increase in conversion rates!
                </Text>
              </Banner>
            </Box>
          </Box>
        );

      case 1:
        return (
          <Box>
            <Text variant="headingLg" as="h2">
              What's your primary business goal?
            </Text>
            <Box paddingBlockStart="400">
              <Text variant="bodyMd" as="p" color="subdued">
                We'll customize your discount strategy to help you achieve it
              </Text>
            </Box>
            
            <Box paddingBlockStart="600">
              <div style={{ display: 'grid', gap: '12px' }}>
                {[
                  { value: 'increase_sales', label: '📈 Increase Overall Sales', description: 'Drive more revenue through strategic discounting' },
                  { value: 'clear_inventory', label: '📦 Clear Inventory', description: 'Move slow-moving products quickly' },
                  { value: 'customer_loyalty', label: '❤️ Build Customer Loyalty', description: 'Reward repeat customers and increase LTV' },
                  { value: 'new_customers', label: '🎯 Acquire New Customers', description: 'Attract first-time buyers with compelling offers' },
                  { value: 'boost_aov', label: '💰 Increase Order Value', description: 'Encourage customers to spend more per order' },
                ].map((goal) => (
                  <Card
                    key={goal.value}
                    subdued={wizardData.businessGoal !== goal.value}
                    sectioned
                  >
                    <div
                      onClick={() => handleDataChange('businessGoal', goal.value)}
                      style={{ cursor: 'pointer' }}
                    >
                      <LegacyStack alignment="center">
                        <LegacyStack.Item fill>
                          <Text variant="headingMd" as="h3">
                            {goal.label}
                          </Text>
                          <Text variant="bodySm" as="p" color="subdued">
                            {goal.description}
                          </Text>
                        </LegacyStack.Item>
                        {wizardData.businessGoal === goal.value && (
                          <Icon source={CheckCircleIcon} color="success" />
                        )}
                      </LegacyStack>
                    </div>
                  </Card>
                ))}
              </div>
            </Box>
          </Box>
        );

      case 2:
        return (
          <Box>
            <Text variant="headingLg" as="h2">
              Tell us about your store
            </Text>
            <Box paddingBlockStart="400">
              <Text variant="bodyMd" as="p" color="subdued">
                This helps us create the perfect discount strategy for you
              </Text>
            </Box>
            
            <Box paddingBlockStart="600">
              <LegacyStack vertical>
                <TextField
                  label="Average Order Value"
                  type="number"
                  value={wizardData.averageOrderValue}
                  onChange={(value) => handleDataChange('averageOrderValue', value)}
                  prefix="$"
                  helpText="Your typical order amount"
                  autoComplete="off"
                />
                
                <Select
                  label="Monthly Orders"
                  options={[
                    { label: 'Just starting (0-50)', value: '0-50' },
                    { label: 'Growing (51-200)', value: '51-200' },
                    { label: 'Established (201-500)', value: '201-500' },
                    { label: 'High volume (500+)', value: '500+' },
                  ]}
                  value={wizardData.monthlyOrders}
                  onChange={(value) => handleDataChange('monthlyOrders', value)}
                />
                
                <Select
                  label="Primary Customer Segment"
                  options={[
                    { label: 'B2C - Individual consumers', value: 'b2c' },
                    { label: 'B2B - Business customers', value: 'b2b' },
                    { label: 'Mixed - Both B2C and B2B', value: 'mixed' },
                  ]}
                  value={wizardData.primaryCustomerSegment}
                  onChange={(value) => handleDataChange('primaryCustomerSegment', value)}
                />
              </LegacyStack>
            </Box>

            <Box paddingBlockStart="600">
              <Banner status="success">
                <Text as="p">
                  Based on your inputs, we estimate you could save customers <strong>${((parseFloat(wizardData.averageOrderValue) || 50) * 0.15).toFixed(2)}</strong> per order with optimized discounts!
                </Text>
              </Banner>
            </Box>
          </Box>
        );

      case 3:
        return (
          <Box>
            <Text variant="headingLg" as="h2">
              Choose your discount strategy
            </Text>
            <Box paddingBlockStart="400">
              <Text variant="bodyMd" as="p" color="subdued">
                We'll automatically create these discounts for you
              </Text>
            </Box>
            
            <Box paddingBlockStart="600">
              <div style={{ display: 'grid', gap: '12px' }}>
                {[
                  { 
                    value: 'conservative',
                    label: '🛡️ Conservative',
                    description: '5-10% discounts, protect margins',
                    recommended: wizardData.businessGoal === 'customer_loyalty'
                  },
                  { 
                    value: 'balanced',
                    label: '⚖️ Balanced',
                    description: '10-20% discounts, steady growth',
                    recommended: wizardData.businessGoal === 'increase_sales'
                  },
                  { 
                    value: 'aggressive',
                    label: '🚀 Aggressive',
                    description: '20-30% discounts, rapid growth',
                    recommended: wizardData.businessGoal === 'new_customers'
                  },
                  { 
                    value: 'custom',
                    label: '🎨 Custom',
                    description: 'I\'ll set up my own discounts',
                    recommended: false
                  },
                ].map((strategy) => (
                  <Card
                    key={strategy.value}
                    subdued={wizardData.discountStrategy !== strategy.value}
                    sectioned
                  >
                    <div
                      onClick={() => handleDataChange('discountStrategy', strategy.value)}
                      style={{ cursor: 'pointer' }}
                    >
                      <LegacyStack alignment="center">
                        <LegacyStack.Item fill>
                          <LegacyStack vertical spacing="extraTight">
                            <LegacyStack alignment="center" spacing="tight">
                              <Text variant="headingMd" as="h3">
                                {strategy.label}
                              </Text>
                              {strategy.recommended && (
                                <Badge status="success">Recommended</Badge>
                              )}
                            </LegacyStack>
                            <Text variant="bodySm" as="p" color="subdued">
                              {strategy.description}
                            </Text>
                          </LegacyStack>
                        </LegacyStack.Item>
                        {wizardData.discountStrategy === strategy.value && (
                          <Icon source={CheckCircleIcon} color="success" />
                        )}
                      </LegacyStack>
                    </div>
                  </Card>
                ))}
              </div>
            </Box>
          </Box>
        );

      case 4:
        return (
          <Box>
            <Text variant="headingLg" as="h2">
              Quick setup preferences
            </Text>
            <Box paddingBlockStart="400">
              <Text variant="bodyMd" as="p" color="subdued">
                Almost done! Just a few more preferences
              </Text>
            </Box>
            
            <Box paddingBlockStart="600">
              <Card sectioned>
                <LegacyStack vertical>
                  <Checkbox
                    label="Enable smart automation"
                    helpText="Automatically adjust discounts based on performance"
                    checked={wizardData.automationPreference}
                    onChange={(value) => handleDataChange('automationPreference', value)}
                  />
                  
                  <Checkbox
                    label="Email notifications"
                    helpText="Get weekly performance reports and alerts"
                    checked={wizardData.emailNotifications}
                    onChange={(value) => handleDataChange('emailNotifications', value)}
                  />
                </LegacyStack>
              </Card>
            </Box>

            <Box paddingBlockStart="600">
              <Card title="What happens next?" sectioned>
                <List type="number">
                  <List.Item>We'll create your initial discount campaigns</List.Item>
                  <List.Item>Your discounts will be automatically optimized</List.Item>
                  <List.Item>You'll receive weekly performance reports</List.Item>
                  <List.Item>Our AI will suggest improvements over time</List.Item>
                </List>
              </Card>
            </Box>

            <Box paddingBlockStart="400">
              <Banner status="info" icon={PlayCircleIcon}>
                <Text as="p">
                  <strong>Watch our 2-minute tutorial</strong> to see how successful merchants use our app
                </Text>
                <Box paddingBlockStart="200">
                  <Button url="https://youtube.com/watch" external>
                    Watch Tutorial
                  </Button>
                </Box>
              </Banner>
            </Box>
          </Box>
        );

      case 5:
        return (
          <Box>
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: '64px', marginBottom: '20px' }}>🎊</div>
              <Text variant="heading2xl" as="h1">
                You're all set!
              </Text>
              <Box paddingBlockStart="400">
                <Text variant="bodyLg" as="p" color="subdued">
                  Your discount strategy is now active
                </Text>
              </Box>
            </div>

            <Box paddingBlockStart="600">
              <Card>
                <Box padding="400">
                  <Text variant="headingMd" as="h3">
                    Here's what we've set up for you:
                  </Text>
                  <Box paddingBlockStart="400">
                    <List>
                      <List.Item>
                        <LegacyStack spacing="tight">
                          <Icon source={CheckCircleIcon} color="success" />
                          <Text as="span">3 active discount campaigns tailored to your goals</Text>
                        </LegacyStack>
                      </List.Item>
                      <List.Item>
                        <LegacyStack spacing="tight">
                          <Icon source={CheckCircleIcon} color="success" />
                          <Text as="span">Automated subscription discounts for loyal customers</Text>
                        </LegacyStack>
                      </List.Item>
                      <List.Item>
                        <LegacyStack spacing="tight">
                          <Icon source={CheckCircleIcon} color="success" />
                          <Text as="span">Smart analytics tracking your performance</Text>
                        </LegacyStack>
                      </List.Item>
                      <List.Item>
                        <LegacyStack spacing="tight">
                          <Icon source={CheckCircleIcon} color="success" />
                          <Text as="span">Weekly optimization recommendations</Text>
                        </LegacyStack>
                      </List.Item>
                    </List>
                  </Box>
                </Box>
              </Card>
            </Box>

            <Box paddingBlockStart="600">
              <Banner status="success" title="Pro tip">
                <Text as="p">
                  Check your dashboard daily for the first week to see how customers respond to your new discounts!
                </Text>
              </Banner>
            </Box>

            <Box paddingBlockStart="400">
              <Card sectioned>
                <LegacyStack alignment="center" distribution="equalSpacing">
                  <Text variant="headingMd" as="h3">
                    Need help?
                  </Text>
                  <ButtonGroup>
                    <Button url="mailto:support@discountmanager.com">
                      Contact Support
                    </Button>
                    <Button primary url="/dashboard">
                      View Dashboard
                    </Button>
                  </ButtonGroup>
                </LegacyStack>
              </Card>
            </Box>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Modal
      open={active}
      onClose={onClose}
      title={
        <LegacyStack vertical spacing="tight">
          <Text variant="headingLg" as="h2">
            {steps[currentStep]}
          </Text>
          <ProgressBar progress={progressPercentage} size="small" />
        </LegacyStack>
      }
      primaryAction={{
        content: currentStep === steps.length - 1 ? 'Get Started' : 'Continue',
        onAction: handleNext,
      }}
      secondaryActions={
        currentStep > 0 && currentStep < steps.length - 1
          ? [{ content: 'Back', onAction: handlePrevious }]
          : currentStep === steps.length - 1
          ? [{ content: 'Go to Dashboard', onAction: onComplete }]
          : []
      }
      large
    >
      <Modal.Section>
        {renderStepContent()}
      </Modal.Section>
    </Modal>
  );
}

export default OnboardingWizard;