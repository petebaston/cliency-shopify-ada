import React, { useState, useEffect } from 'react';
import {
  Card,
  Text,
  TextField,
  Select,
  Button,
  Badge,
  LegacyStack,
  Box,
  ProgressBar,
  Banner,
  DataTable,
  Icon,
  RangeSlider,
  Divider,
} from '@shopify/polaris';
import {
  CashDollarIcon,
  ChartLineIcon,
  CheckCircleIcon,
  AlertDiamondIcon,
} from '@shopify/polaris-icons';
import Decimal from 'decimal.js';

interface CalculatorInputs {
  averageOrderValue: string;
  monthlyOrders: string;
  currentConversionRate: string;
  discountPercentage: number;
  customerSegment: string;
}

interface ProjectedResults {
  revenueIncrease: number;
  additionalOrders: number;
  newConversionRate: number;
  roi: number;
  breakEvenDays: number;
  yearlyImpact: number;
}

function RevenueCalculator() {
  const [inputs, setInputs] = useState<CalculatorInputs>({
    averageOrderValue: '75',
    monthlyOrders: '200',
    currentConversionRate: '2.5',
    discountPercentage: 15,
    customerSegment: 'all',
  });

  const [results, setResults] = useState<ProjectedResults | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    calculateImpact();
  }, [inputs]);

  const calculateImpact = () => {
    setCalculating(true);
    
    setTimeout(() => {
      const aov = new Decimal(inputs.averageOrderValue || 0);
      const orders = new Decimal(inputs.monthlyOrders || 0);
      const convRate = new Decimal(inputs.currentConversionRate || 0);
      const discount = new Decimal(inputs.discountPercentage);

      // Conversion rate lift based on discount percentage
      const conversionLift = discount.mul(0.03); // 3% lift per 1% discount
      const newConversionRate = convRate.plus(convRate.mul(conversionLift.div(100)));
      
      // Calculate additional orders from improved conversion
      const additionalOrdersFromConversion = orders.mul(conversionLift.div(100));
      
      // Calculate price elasticity impact
      const priceElasticity = new Decimal(1.5); // Standard retail elasticity
      const volumeIncrease = discount.mul(priceElasticity).div(100);
      const additionalOrdersFromVolume = orders.mul(volumeIncrease);
      
      const totalAdditionalOrders = additionalOrdersFromConversion.plus(additionalOrdersFromVolume);
      
      // Revenue calculations
      const currentRevenue = aov.mul(orders);
      const discountedAOV = aov.mul(Decimal.sub(1, discount.div(100)));
      const newTotalOrders = orders.plus(totalAdditionalOrders);
      const newRevenue = discountedAOV.mul(newTotalOrders);
      const revenueIncrease = newRevenue.minus(currentRevenue);
      
      // ROI calculation
      const discountCost = aov.mul(discount.div(100)).mul(newTotalOrders);
      const profit = revenueIncrease.minus(discountCost.mul(0.3)); // Assuming 30% margin
      const roi = profit.div(discountCost).mul(100);
      
      // Break-even calculation
      const dailyRevenue = newRevenue.div(30);
      const breakEvenDays = discountCost.div(dailyRevenue);

      setResults({
        revenueIncrease: revenueIncrease.toNumber(),
        additionalOrders: totalAdditionalOrders.toNumber(),
        newConversionRate: newConversionRate.toNumber(),
        roi: roi.toNumber(),
        breakEvenDays: Math.ceil(breakEvenDays.toNumber()),
        yearlyImpact: revenueIncrease.mul(12).toNumber(),
      });
      
      setCalculating(false);
    }, 500);
  };

  const handleInputChange = (field: keyof CalculatorInputs, value: any) => {
    setInputs(prev => ({ ...prev, [field]: value }));
  };

  const getImpactLevel = (value: number) => {
    if (value > 30) return { status: 'success', label: 'Excellent' };
    if (value > 15) return { status: 'warning', label: 'Good' };
    if (value > 0) return { status: 'info', label: 'Moderate' };
    return { status: 'critical', label: 'Low' };
  };

  const competitorBenchmarks = [
    ['Your Store', `${inputs.discountPercentage}%`, results ? `+${results.revenueIncrease.toFixed(0)}` : '-', results ? `${results.roi.toFixed(1)}%` : '-'],
    ['Industry Average', '12%', '+$4,250', '142%'],
    ['Top Performer', '18%', '+$8,900', '215%'],
    ['Conservative', '8%', '+$2,100', '98%'],
  ];

  return (
    <LegacyStack vertical>
      <Card>
        <Box padding="400" background="bg-subdued">
          <LegacyStack alignment="center" distribution="equalSpacing">
            <LegacyStack alignment="center" spacing="tight">
              <div style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '8px',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Icon source={CashDollarIcon} color="base" />
              </div>
              <LegacyStack vertical spacing="extraTight">
                <Text variant="headingMd" as="h3">
                  Revenue Impact Calculator
                </Text>
                <Text variant="bodySm" as="p" color="subdued">
                  See how discounts affect your bottom line
                </Text>
              </LegacyStack>
            </LegacyStack>
            {results && (
              <LegacyStack vertical spacing="extraTight" alignment="trailing">
                <Text variant="heading2xl" as="p" fontWeight="bold" color={results.revenueIncrease > 0 ? 'success' : 'critical'}>
                  {results.revenueIncrease > 0 ? '+' : ''}${Math.abs(results.revenueIncrease).toLocaleString()}
                </Text>
                <Badge status={results.revenueIncrease > 0 ? 'success' : 'critical'}>
                  Monthly impact
                </Badge>
              </LegacyStack>
            )}
          </LegacyStack>
        </Box>
      </Card>

      <Card sectioned title="Your Store Metrics">
        <LegacyStack vertical>
          <LegacyStack distribution="fill">
            <TextField
              label="Average Order Value"
              type="number"
              value={inputs.averageOrderValue}
              onChange={(value) => handleInputChange('averageOrderValue', value)}
              prefix="$"
              autoComplete="off"
            />
            <TextField
              label="Monthly Orders"
              type="number"
              value={inputs.monthlyOrders}
              onChange={(value) => handleInputChange('monthlyOrders', value)}
              autoComplete="off"
            />
            <TextField
              label="Current Conversion Rate"
              type="number"
              value={inputs.currentConversionRate}
              onChange={(value) => handleInputChange('currentConversionRate', value)}
              suffix="%"
              autoComplete="off"
            />
          </LegacyStack>

          <Box paddingBlockStart="400">
            <Text variant="headingSm" as="h4">
              Discount Percentage: {inputs.discountPercentage}%
            </Text>
            <Box paddingBlockStart="200">
              <RangeSlider
                value={inputs.discountPercentage}
                onChange={(value) => handleInputChange('discountPercentage', value)}
                min={0}
                max={50}
                step={1}
                output
              />
            </Box>
          </Box>

          <Select
            label="Target Customer Segment"
            options={[
              { label: 'All Customers', value: 'all' },
              { label: 'New Customers Only', value: 'new' },
              { label: 'VIP Customers', value: 'vip' },
              { label: 'Returning Customers', value: 'returning' },
            ]}
            value={inputs.customerSegment}
            onChange={(value) => handleInputChange('customerSegment', value)}
          />
        </LegacyStack>
      </Card>

      {calculating ? (
        <Card sectioned>
          <LegacyStack vertical>
            <Text variant="headingSm" as="h4">
              Calculating impact...
            </Text>
            <ProgressBar progress={75} size="small" />
          </LegacyStack>
        </Card>
      ) : results && (
        <>
          <Card>
            <Box padding="400">
              <Text variant="headingMd" as="h3">
                Projected Results
              </Text>
            </Box>
            <Box padding="0">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <Box padding="400" borderInlineEndWidth="1" borderColor="border-subdued">
                  <LegacyStack vertical spacing="tight">
                    <LegacyStack alignment="center" spacing="tight">
                      <Icon source={ChartLineIcon} color="success" />
                      <Text variant="headingSm" as="h4" color="subdued">
                        Revenue Increase
                      </Text>
                    </LegacyStack>
                    <Text variant="heading2xl" as="p" fontWeight="bold">
                      ${results.revenueIncrease.toLocaleString()}
                    </Text>
                    <Badge status={getImpactLevel(results.revenueIncrease / 1000).status as any}>
                      {getImpactLevel(results.revenueIncrease / 1000).label} impact
                    </Badge>
                  </LegacyStack>
                </Box>

                <Box padding="400" borderInlineEndWidth="1" borderColor="border-subdued">
                  <LegacyStack vertical spacing="tight">
                    <LegacyStack alignment="center" spacing="tight">
                      <Icon source={ChartLineIcon} color="success" />
                      <Text variant="headingSm" as="h4" color="subdued">
                        Additional Orders
                      </Text>
                    </LegacyStack>
                    <Text variant="heading2xl" as="p" fontWeight="bold">
                      +{Math.round(results.additionalOrders)}
                    </Text>
                    <Text variant="bodySm" as="p" color="subdued">
                      Per month
                    </Text>
                  </LegacyStack>
                </Box>

                <Box padding="400">
                  <LegacyStack vertical spacing="tight">
                    <LegacyStack alignment="center" spacing="tight">
                      <Icon source={CashDollarIcon} color="success" />
                      <Text variant="headingSm" as="h4" color="subdued">
                        ROI
                      </Text>
                    </LegacyStack>
                    <Text variant="heading2xl" as="p" fontWeight="bold">
                      {results.roi.toFixed(1)}%
                    </Text>
                    <Text variant="bodySm" as="p" color="subdued">
                      Return on investment
                    </Text>
                  </LegacyStack>
                </Box>
              </div>
            </Box>

            <Box padding="400" background="bg-success-subdued">
              <LegacyStack distribution="equalSpacing" alignment="center">
                <LegacyStack vertical spacing="extraTight">
                  <Text variant="headingSm" as="h4">
                    🎯 New Conversion Rate
                  </Text>
                  <LegacyStack spacing="tight">
                    <Text variant="bodyMd" as="p" color="subdued">
                      {inputs.currentConversionRate}%
                    </Text>
                    <Text variant="bodyMd" as="p">→</Text>
                    <Text variant="bodyMd" as="p" fontWeight="bold" color="success">
                      {results.newConversionRate.toFixed(2)}%
                    </Text>
                  </LegacyStack>
                </LegacyStack>

                <Divider />

                <LegacyStack vertical spacing="extraTight">
                  <Text variant="headingSm" as="h4">
                    📅 Break-even
                  </Text>
                  <Text variant="bodyMd" as="p" fontWeight="bold">
                    {results.breakEvenDays} days
                  </Text>
                </LegacyStack>

                <Divider />

                <LegacyStack vertical spacing="extraTight">
                  <Text variant="headingSm" as="h4">
                    📈 Yearly Impact
                  </Text>
                  <Text variant="bodyMd" as="p" fontWeight="bold" color="success">
                    +${results.yearlyImpact.toLocaleString()}
                  </Text>
                </LegacyStack>
              </LegacyStack>
            </Box>
          </Card>

          <Card sectioned title="Competitive Benchmark">
            <DataTable
              columnContentTypes={['text', 'text', 'numeric', 'numeric']}
              headings={['Strategy', 'Discount', 'Revenue Impact', 'ROI']}
              rows={competitorBenchmarks}
              defaultSortDirection="descending"
              initialSortColumnIndex={3}
            />
          </Card>

          <Card sectioned>
            <Banner 
              status={results.revenueIncrease > 5000 ? 'success' : results.revenueIncrease > 0 ? 'info' : 'warning'}
              title="Recommendation"
              action={results.revenueIncrease > 0 ? { content: 'Apply This Strategy', onAction: () => {} } : undefined}
            >
              <p>
                {results.revenueIncrease > 5000 
                  ? `This discount strategy shows excellent potential! You could see a ${(results.roi).toFixed(0)}% return on investment with ${Math.round(results.additionalOrders)} additional orders per month.`
                  : results.revenueIncrease > 0
                  ? `This strategy shows moderate potential. Consider testing with a smaller customer segment first to validate results.`
                  : `This discount may reduce overall revenue. Consider a lower discount percentage or targeting a specific high-value customer segment.`
                }
              </p>
            </Banner>
          </Card>

          <Card sectioned>
            <LegacyStack distribution="equalSpacing" alignment="center">
              <Button primary size="large">
                Create This Discount Campaign
              </Button>
              <Button plain>
                Save Calculation
              </Button>
              <Button plain>
                Export Report
              </Button>
            </LegacyStack>
          </Card>
        </>
      )}
    </LegacyStack>
  );
}

export default RevenueCalculator;