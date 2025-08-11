import React, { useState, useEffect } from 'react';
import {
  Card,
  Text,
  Button,
  Badge,
  LegacyStack,
  Icon,
  Box,
  Collapsible,
  ButtonGroup,
  ProgressBar,
  Banner,
  List,
  Thumbnail,
} from '@shopify/polaris';
import {
  LightBulbMajor,
  TrendingUpMajor,
  ClockMajor,
  CustomersMajor,
  CashDollarMajor,
  ChevronDownMinor,
  ChevronUpMinor,
  StarFilledMinor,
  DiamondAlertMajor,
  ConfettiMajor,
} from '@shopify/polaris-icons';
import api from '../services/api';

interface Recommendation {
  id: string;
  type: 'discount' | 'strategy' | 'optimization' | 'seasonal';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  estimatedRevenue: number;
  confidence: number;
  action: () => void;
  icon: any;
  details?: string[];
}

function SmartRecommendations() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [appliedRecommendations, setAppliedRecommendations] = useState<Set<string>>(new Set());

  useEffect(() => {
    generateRecommendations();
  }, []);

  const generateRecommendations = async () => {
    try {
      // Simulate AI-powered recommendations based on store data
      const mockRecommendations: Recommendation[] = [
        {
          id: 'rec-1',
          type: 'seasonal',
          priority: 'high',
          title: '🎄 Holiday Season Opportunity',
          description: 'Create a "Black Friday Early Bird" campaign with 25% off for VIP customers',
          impact: 'Expected 45% increase in weekend sales',
          estimatedRevenue: 12500,
          confidence: 92,
          icon: ConfettiMajor,
          action: () => console.log('Creating holiday campaign'),
          details: [
            'Your competitors are offering 20% average discounts',
            'Last year, early bird campaigns performed 3x better',
            'VIP customers have 2.5x higher conversion rate',
            'Recommended duration: Nov 20-27',
          ],
        },
        {
          id: 'rec-2',
          type: 'optimization',
          priority: 'high',
          title: '💡 Underperforming Discount Alert',
          description: 'Your "WELCOME10" code has 2% conversion. Industry average is 8%.',
          impact: 'Potential $3,200/month revenue recovery',
          estimatedRevenue: 3200,
          confidence: 88,
          icon: DiamondAlertMajor,
          action: () => console.log('Optimizing welcome discount'),
          details: [
            'Current discount: 10% off first purchase',
            'Recommended: 15% off + free shipping',
            'Add urgency: 48-hour expiration',
            'Include product recommendations',
          ],
        },
        {
          id: 'rec-3',
          type: 'strategy',
          priority: 'medium',
          title: '🎯 Cart Abandonment Recovery',
          description: 'Enable automatic 10% discount for carts over $100 abandoned for 2+ hours',
          impact: 'Recover 23% of abandoned carts',
          estimatedRevenue: 8900,
          confidence: 85,
          icon: CashDollarMajor,
          action: () => console.log('Setting up cart recovery'),
          details: [
            '67% of your carts are abandoned',
            'Average abandoned cart value: $125',
            'Best performing time: 2-4 hours after abandonment',
            'Include personalized product images in email',
          ],
        },
        {
          id: 'rec-4',
          type: 'discount',
          priority: 'medium',
          title: '👥 Loyalty Tier Upgrade',
          description: 'Create exclusive 20% discount for customers with 5+ purchases',
          impact: 'Increase repeat purchase rate by 35%',
          estimatedRevenue: 6700,
          confidence: 79,
          icon: CustomersMajor,
          action: () => console.log('Creating loyalty discount'),
          details: [
            '143 customers qualify for this tier',
            'Average order value for this segment: $185',
            'They typically purchase every 45 days',
            'Consider adding early access to new products',
          ],
        },
        {
          id: 'rec-5',
          type: 'seasonal',
          priority: 'low',
          title: '📈 Bundle & Save Opportunity',
          description: 'Your top 3 products are often bought together. Create a 15% bundle discount.',
          impact: 'Increase AOV by $35',
          estimatedRevenue: 4500,
          confidence: 72,
          icon: TrendingUpMajor,
          action: () => console.log('Creating bundle discount'),
          details: [
            'Products: Premium Set, Starter Kit, Accessories Pack',
            '38% of customers buy at least 2 of these',
            'Bundle price: $149 (save $26)',
            'Add gift wrapping option for +$5',
          ],
        },
      ];

      setRecommendations(mockRecommendations);
    } catch (error) {
      console.error('Error generating recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const applyRecommendation = async (rec: Recommendation) => {
    // Simulate applying recommendation
    rec.action();
    setAppliedRecommendations(new Set([...appliedRecommendations, rec.id]));
    
    // Show success feedback
    setTimeout(() => {
      // You could show a toast here
    }, 500);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'critical';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  const totalPotentialRevenue = recommendations.reduce((sum, rec) => sum + rec.estimatedRevenue, 0);

  if (loading) {
    return (
      <Card sectioned>
        <LegacyStack vertical>
          <Text variant="headingMd" as="h3">
            Analyzing your store data...
          </Text>
          <ProgressBar progress={75} size="small" />
        </LegacyStack>
      </Card>
    );
  }

  return (
    <LegacyStack vertical>
      <Card>
        <Box padding="400" background="bg-success-subdued">
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
                <Icon source={LightBulbMajor} color="base" />
              </div>
              <LegacyStack vertical spacing="extraTight">
                <Text variant="headingMd" as="h3">
                  AI-Powered Recommendations
                </Text>
                <Text variant="bodySm" as="p" color="subdued">
                  Personalized insights to maximize your revenue
                </Text>
              </LegacyStack>
            </LegacyStack>
            <LegacyStack vertical spacing="extraTight" alignment="trailing">
              <Text variant="headingLg" as="p" fontWeight="bold">
                +${totalPotentialRevenue.toLocaleString()}
              </Text>
              <Badge status="success">Potential monthly revenue</Badge>
            </LegacyStack>
          </LegacyStack>
        </Box>
      </Card>

      {recommendations.length === 0 ? (
        <Card sectioned>
          <Banner status="info">
            <Text as="p">
              Great job! Your discounts are well optimized. Check back tomorrow for new recommendations.
            </Text>
          </Banner>
        </Card>
      ) : (
        <LegacyStack vertical>
          {recommendations.map((rec) => {
            const isExpanded = expandedItems.has(rec.id);
            const isApplied = appliedRecommendations.has(rec.id);

            return (
              <Card key={rec.id} sectioned={!isExpanded}>
                <Box
                  padding={isExpanded ? "400" : "0"}
                  background={isApplied ? "bg-success-subdued" : undefined}
                >
                  <LegacyStack alignment="center" distribution="equalSpacing">
                    <LegacyStack alignment="center" spacing="loose">
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '8px',
                        background: `linear-gradient(135deg, ${
                          rec.priority === 'high' ? '#FF6B6B, #FFE66D' :
                          rec.priority === 'medium' ? '#4ECDC4, #44A08D' :
                          '#667eea, #764ba2'
                        })`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <Icon source={rec.icon} color="base" />
                      </div>
                      <LegacyStack vertical spacing="extraTight">
                        <LegacyStack alignment="center" spacing="tight">
                          <Text variant="headingMd" as="h4">
                            {rec.title}
                          </Text>
                          <Badge status={getPriorityColor(rec.priority) as any}>
                            {rec.priority} priority
                          </Badge>
                          {isApplied && (
                            <Badge status="success">Applied</Badge>
                          )}
                        </LegacyStack>
                        <Text variant="bodyMd" as="p" color="subdued">
                          {rec.description}
                        </Text>
                        <LegacyStack spacing="loose">
                          <LegacyStack spacing="extraTight">
                            <Icon source={TrendingUpMajor} color="success" />
                            <Text variant="bodySm" as="span" fontWeight="semibold">
                              {rec.impact}
                            </Text>
                          </LegacyStack>
                          <LegacyStack spacing="extraTight">
                            <Icon source={CashDollarMajor} color="success" />
                            <Text variant="bodySm" as="span" fontWeight="semibold">
                              +${rec.estimatedRevenue.toLocaleString()}/mo
                            </Text>
                          </LegacyStack>
                          <Badge>{rec.confidence}% confidence</Badge>
                        </LegacyStack>
                      </LegacyStack>
                    </LegacyStack>
                    
                    <ButtonGroup>
                      {!isApplied ? (
                        <>
                          <Button
                            primary
                            onClick={() => applyRecommendation(rec)}
                            size="slim"
                          >
                            Apply Now
                          </Button>
                          <Button
                            plain
                            onClick={() => toggleExpanded(rec.id)}
                            icon={isExpanded ? ChevronUpMinor : ChevronDownMinor}
                            ariaLabel="Toggle details"
                          />
                        </>
                      ) : (
                        <LegacyStack spacing="tight">
                          <Icon source={CircleTickMajor} color="success" />
                          <Text variant="bodySm" as="span" color="success">
                            Successfully applied!
                          </Text>
                        </LegacyStack>
                      )}
                    </ButtonGroup>
                  </LegacyStack>

                  <Collapsible
                    open={isExpanded}
                    id={`rec-details-${rec.id}`}
                    transition={{ duration: '200ms', timingFunction: 'ease-in-out' }}
                  >
                    {rec.details && (
                      <Box paddingBlockStart="400">
                        <Card.Section>
                          <LegacyStack vertical>
                            <Text variant="headingSm" as="h5">
                              Why this works:
                            </Text>
                            <List type="bullet">
                              {rec.details.map((detail, index) => (
                                <List.Item key={index}>
                                  <LegacyStack spacing="extraTight">
                                    <Icon source={StarFilledMinor} color="warning" />
                                    <Text variant="bodyMd" as="span">
                                      {detail}
                                    </Text>
                                  </LegacyStack>
                                </List.Item>
                              ))}
                            </List>
                            
                            <Box paddingBlockStart="400">
                              <LegacyStack>
                                <Button primary onClick={() => applyRecommendation(rec)}>
                                  Apply Recommendation
                                </Button>
                                <Button plain>
                                  Learn More
                                </Button>
                              </LegacyStack>
                            </Box>
                          </LegacyStack>
                        </Card.Section>
                      </Box>
                    )}
                  </Collapsible>
                </Box>
              </Card>
            );
          })}
        </LegacyStack>
      )}

      <Card sectioned>
        <Box background="bg-subdued" padding="400" borderRadius="2">
          <LegacyStack alignment="center" distribution="equalSpacing">
            <LegacyStack alignment="center" spacing="tight">
              <Icon source={ClockMajor} color="subdued" />
              <Text variant="bodySm" as="p" color="subdued">
                Recommendations update daily based on your store's performance
              </Text>
            </LegacyStack>
            <Button plain size="slim">
              Refresh
            </Button>
          </LegacyStack>
        </Box>
      </Card>
    </LegacyStack>
  );
}

export default SmartRecommendations;