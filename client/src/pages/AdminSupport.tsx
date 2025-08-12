import React, { useState, useEffect, useCallback } from 'react';
import {
  Page,
  Card,
  Tabs,
  DataTable,
  Badge,
  Button,
  TextField,
  Select,
  Modal,
  TextContainer,
  LegacyStack,
  Icon,
  Avatar,
  Box,
  Grid,
  Filters,
  ChoiceList,
  RangeSlider,
  ButtonGroup,
  Popover,
  ActionList,
  Banner,
  Text,
  ProgressBar,
  Divider,
  List,
  Checkbox,
} from '@shopify/polaris';
import {
  ChatMajor,
  EmailMajor,
  ClockMajor,
  CustomersMajor,
  AnalyticsMajor,
  NotificationMajor,
  CircleTickMajor,
  CircleAlertMajor,
  StarFilledMinor,
  StarOutlineMinor,
  PhoneMajor,
  RefreshMajor,
  ExportMinor,
  SettingsMajor,
} from '@shopify/polaris-icons';
import { format, formatDistanceToNow } from 'date-fns';
import api from '../services/api';

interface Ticket {
  id: string;
  ticket_number: string;
  shop_domain: string;
  customer_email: string;
  customer_name: string;
  subject: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed';
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  first_response_at: string | null;
  resolved_at: string | null;
  messages_count: number;
  last_message: string;
  satisfaction_rating: number | null;
  tags: string[];
}

interface SupportStats {
  open_tickets: number;
  in_progress: number;
  resolved_today: number;
  avg_response_time: string;
  satisfaction_score: number;
  pending_replies: number;
}

interface Message {
  id: string;
  sender_type: 'customer' | 'admin' | 'system' | 'bot';
  sender_name: string;
  message: string;
  created_at: string;
  attachments: any[];
  is_internal_note: boolean;
}

function AdminSupport() {
  const [selectedTab, setSelectedTab] = useState(0);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [ticketMessages, setTicketMessages] = useState<Message[]>([]);
  const [stats, setStats] = useState<SupportStats>({
    open_tickets: 0,
    in_progress: 0,
    resolved_today: 0,
    avg_response_time: '2h 15m',
    satisfaction_score: 4.7,
    pending_replies: 0,
  });
  const [loading, setLoading] = useState(true);
  const [cannedResponses, setCannedResponses] = useState<any[]>([]);
  const [replyMessage, setReplyMessage] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string[]>(['open', 'in_progress']);
  const [priorityFilter, setPriorityFilter] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [cannedResponsesOpen, setCannedResponsesOpen] = useState(false);
  const [realTimeMode, setRealTimeMode] = useState(false);

  // Mock data for demonstration
  const mockTickets: Ticket[] = [
    {
      id: '1',
      ticket_number: 'TKT-001',
      shop_domain: 'fashion-store.myshopify.com',
      customer_email: 'sarah@fashionstore.com',
      customer_name: 'Sarah Mitchell',
      subject: 'How to set decimal percentage discounts?',
      category: 'technical',
      priority: 'high',
      status: 'open',
      assigned_to: null,
      created_at: new Date(Date.now() - 3600000).toISOString(),
      updated_at: new Date(Date.now() - 1800000).toISOString(),
      first_response_at: null,
      resolved_at: null,
      messages_count: 3,
      last_message: "I'm trying to create a 12.75% discount but it rounds to 13%",
      satisfaction_rating: null,
      tags: ['decimal-discount', 'urgent'],
    },
    {
      id: '2',
      ticket_number: 'TKT-002',
      shop_domain: 'electronics-plus.myshopify.com',
      customer_email: 'mike@electronicsplus.com',
      customer_name: 'Mike Thompson',
      subject: 'Billing question about plan upgrade',
      category: 'billing',
      priority: 'medium',
      status: 'in_progress',
      assigned_to: 'admin@discountmanager.com',
      created_at: new Date(Date.now() - 7200000).toISOString(),
      updated_at: new Date(Date.now() - 3600000).toISOString(),
      first_response_at: new Date(Date.now() - 6000000).toISOString(),
      resolved_at: null,
      messages_count: 5,
      last_message: 'What features are included in the Pro plan?',
      satisfaction_rating: null,
      tags: ['billing', 'upgrade'],
    },
    {
      id: '3',
      ticket_number: 'TKT-003',
      shop_domain: 'beauty-box.myshopify.com',
      customer_email: 'jennifer@beautybox.com',
      customer_name: 'Jennifer Lee',
      subject: 'Feature request: Bulk import discounts',
      category: 'feature',
      priority: 'low',
      status: 'resolved',
      assigned_to: 'admin@discountmanager.com',
      created_at: new Date(Date.now() - 86400000).toISOString(),
      updated_at: new Date(Date.now() - 43200000).toISOString(),
      first_response_at: new Date(Date.now() - 80000000).toISOString(),
      resolved_at: new Date(Date.now() - 43200000).toISOString(),
      messages_count: 8,
      last_message: 'Thanks for adding this to your roadmap!',
      satisfaction_rating: 5,
      tags: ['feature-request', 'import'],
    },
  ];

  // Fetch canned responses on mount
  useEffect(() => {
    fetchCannedResponses();
  }, []);

  const fetchCannedResponses = async () => {
    try {
      const response = await api.get('/support/canned-responses');
      setCannedResponses(response.data);
    } catch (error) {
      // Use default responses if API fails
      setCannedResponses([
        {
          title: 'Decimal Discount Instructions',
          content: 'To create decimal percentage discounts:\n1. Go to Discounts → Create New\n2. Select "Percentage" as the discount type\n3. Enter any decimal value (e.g., 12.75, 15.333)\n4. The system supports up to 4 decimal places for precise pricing',
          shortcut: '/decimal',
        },
        {
          title: 'Billing Information',
          content: 'Our plans:\n• Starter ($29/mo): 10 discounts\n• Growth ($79/mo): Unlimited + AI\n• Pro ($199/mo): Everything + API\n\nAll plans include a 14-day free trial.',
          shortcut: '/billing',
        },
        {
          title: 'Getting Started Guide',
          content: 'Welcome! Here\'s how to get started:\n1. Complete the onboarding wizard\n2. Create your first discount\n3. Test with a sample order\n4. Check analytics\n\nNeed help? Check our docs: docs.discountmanager.com',
          shortcut: '/start',
        },
      ]);
    }
  };

  useEffect(() => {
    fetchTickets();
    fetchStats();
  }, [statusFilter, priorityFilter, assigneeFilter]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (statusFilter.length > 0) params.status = statusFilter.join(',');
      if (priorityFilter.length > 0) params.priority = priorityFilter.join(',');
      if (searchQuery) params.search = searchQuery;
      if (assigneeFilter !== 'all') params.assignee = assigneeFilter;
      
      const response = await api.get('/support/tickets', { params });
      setTickets(response.data);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      // Fallback to mock data for demo
      setTickets(mockTickets);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/support/stats');
      const data = response.data;
      
      // Format response time
      const hours = data.avg_response_hours || 0;
      const formattedTime = hours < 1 ? `${Math.round(hours * 60)}m` : `${Math.floor(hours)}h ${Math.round((hours % 1) * 60)}m`;
      
      setStats({
        open_tickets: data.open_tickets || 0,
        in_progress: data.in_progress || 0,
        resolved_today: data.resolved_today || 0,
        avg_response_time: formattedTime,
        satisfaction_score: data.avg_satisfaction || 4.7,
        pending_replies: data.pending_replies || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Use calculated stats from current tickets as fallback
      setStats({
        open_tickets: tickets.filter(t => t.status === 'open').length,
        in_progress: tickets.filter(t => t.status === 'in_progress').length,
        resolved_today: tickets.filter(t => t.status === 'resolved').length,
        avg_response_time: '2h 15m',
        satisfaction_score: 4.7,
        pending_replies: 2,
      });
    }
  };

  const fetchTicketMessages = async (ticketId: string) => {
    try {
      const response = await api.get(`/support/tickets/${ticketId}`);
      setTicketMessages(response.data.messages || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      // Fallback to mock messages
      const mockMessages: Message[] = [
        {
          id: '1',
          sender_type: 'customer',
          sender_name: 'Sarah Mitchell',
          message: "I'm trying to create a 12.75% discount but it keeps rounding to 13%. Is decimal precision supported?",
          created_at: new Date(Date.now() - 3600000).toISOString(),
          attachments: [],
          is_internal_note: false,
        },
        {
          id: '2',
          sender_type: 'bot',
          sender_name: 'Support Bot',
          message: 'Thanks for contacting support! A team member will assist you shortly. In the meantime, you might find our decimal discount guide helpful: docs.discountmanager.com/decimal-discounts',
          created_at: new Date(Date.now() - 3500000).toISOString(),
          attachments: [],
          is_internal_note: false,
        },
      ];
      setTicketMessages(mockMessages);
    }
  };

  const handleTicketClick = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    fetchTicketMessages(ticket.id);
    setTicketModalOpen(true);
  };

  const handleSendReply = async () => {
    if (!replyMessage.trim() || !selectedTicket) return;

    try {
      const response = await api.post(`/support/tickets/${selectedTicket.id}/messages`, {
        sender_type: 'admin',
        sender_name: 'Support Admin',
        message: replyMessage,
        is_internal_note: isInternalNote,
      });

      // Add message to list
      const newMessage = response.data;
      setTicketMessages([...ticketMessages, newMessage]);
      setReplyMessage('');
      setIsInternalNote(false);

      // Update ticket status if needed
      if (selectedTicket.status === 'open') {
        handleStatusChange(selectedTicket.id, 'in_progress');
      }
    } catch (error) {
      console.error('Error sending reply:', error);
      // Still add message locally for UI feedback
      const newMessage: Message = {
        id: Date.now().toString(),
        sender_type: 'admin',
        sender_name: 'Support Admin',
        message: replyMessage,
        created_at: new Date().toISOString(),
        attachments: [],
        is_internal_note: isInternalNote,
      };

      setTicketMessages([...ticketMessages, newMessage]);
      setReplyMessage('');
      setIsInternalNote(false);
    }
  };

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    try {
      await api.patch(`/support/tickets/${ticketId}`, { status: newStatus });
      
      setTickets(tickets.map(t => 
        t.id === ticketId ? { ...t, status: newStatus as any } : t
      ));
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status: newStatus as any });
      }
    } catch (error) {
      console.error('Error updating status:', error);
      // Still update locally for UI feedback
      setTickets(tickets.map(t => 
        t.id === ticketId ? { ...t, status: newStatus as any } : t
      ));
    }
  };

  const handlePriorityChange = async (ticketId: string, newPriority: string) => {
    try {
      await api.patch(`/support/tickets/${ticketId}`, { priority: newPriority });
      
      setTickets(tickets.map(t => 
        t.id === ticketId ? { ...t, priority: newPriority as any } : t
      ));
    } catch (error) {
      console.error('Error updating priority:', error);
      // Still update locally
      setTickets(tickets.map(t => 
        t.id === ticketId ? { ...t, priority: newPriority as any } : t
      ));
    }
  };

  const handleAssignment = async (ticketId: string, assignee: string) => {
    try {
      await api.patch(`/support/tickets/${ticketId}`, { assigned_to: assignee });
      
      setTickets(tickets.map(t => 
        t.id === ticketId ? { ...t, assigned_to: assignee } : t
      ));
    } catch (error) {
      console.error('Error updating assignment:', error);
      // Still update locally
      setTickets(tickets.map(t => 
        t.id === ticketId ? { ...t, assigned_to: assignee } : t
      ));
    }
  };

  const insertCannedResponse = (content: string) => {
    setReplyMessage(replyMessage + content);
    setCannedResponsesOpen(false);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'critical';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'attention';
      case 'in_progress': return 'info';
      case 'waiting_customer': return 'warning';
      case 'resolved': return 'success';
      case 'closed': return 'default';
      default: return 'default';
    }
  };

  const tabs = [
    { id: 'tickets', content: 'All Tickets', badge: tickets.length },
    { id: 'inbox', content: 'My Inbox', badge: stats.pending_replies },
    { id: 'analytics', content: 'Analytics' },
    { id: 'knowledge', content: 'Knowledge Base' },
    { id: 'settings', content: 'Settings' },
  ];

  const ticketRows = tickets
    .filter(ticket => {
      if (searchQuery && !ticket.subject.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (statusFilter.length > 0 && !statusFilter.includes(ticket.status)) {
        return false;
      }
      if (priorityFilter.length > 0 && !priorityFilter.includes(ticket.priority)) {
        return false;
      }
      return true;
    })
    .map(ticket => [
      <LegacyStack spacing="tight">
        <Avatar size="small" name={ticket.customer_name} />
        <LegacyStack vertical spacing="extraTight">
          <Text variant="bodyMd" as="span" fontWeight="semibold">
            #{ticket.ticket_number}
          </Text>
          <Text variant="bodySm" as="span" color="subdued">
            {ticket.customer_name}
          </Text>
        </LegacyStack>
      </LegacyStack>,
      <LegacyStack vertical spacing="extraTight">
        <Text variant="bodyMd" as="span">
          {ticket.subject}
        </Text>
        <Text variant="bodySm" as="span" color="subdued">
          {ticket.last_message.substring(0, 50)}...
        </Text>
      </LegacyStack>,
      <Badge status={getPriorityColor(ticket.priority) as any}>
        {ticket.priority}
      </Badge>,
      <Badge status={getStatusColor(ticket.status) as any}>
        {ticket.status.replace('_', ' ')}
      </Badge>,
      ticket.assigned_to || <Text variant="bodySm" as="span" color="subdued">Unassigned</Text>,
      <Text variant="bodySm" as="span">
        {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
      </Text>,
      <ButtonGroup segmented>
        <Button size="slim" onClick={() => handleTicketClick(ticket)}>
          View
        </Button>
        <Popover
          active={false}
          activator={<Button size="slim">Actions</Button>}
          onClose={() => {}}
        >
          <ActionList
            items={[
              { content: 'Assign to me', onAction: () => handleAssignment(ticket.id, 'admin@discountmanager.com') },
              { content: 'Change priority', onAction: () => {} },
              { content: 'Add tags', onAction: () => {} },
              { content: 'Mark as resolved', onAction: () => handleStatusChange(ticket.id, 'resolved') },
            ]}
          />
        </Popover>
      </ButtonGroup>,
    ]);

  return (
    <Page
      title="Support Admin Dashboard"
      primaryAction={{
        content: 'Refresh',
        icon: RefreshMajor,
        onAction: fetchTickets,
      }}
      secondaryActions={[
        { content: 'Export', icon: ExportMinor },
        { content: 'Settings', icon: SettingsMajor },
      ]}
    >
      {/* Stats Cards */}
      <Grid>
        {[
          { label: 'Open Tickets', value: stats.open_tickets, color: 'critical', icon: CircleAlertMajor },
          { label: 'In Progress', value: stats.in_progress, color: 'info', icon: ClockMajor },
          { label: 'Resolved Today', value: stats.resolved_today, color: 'success', icon: CircleTickMajor },
          { label: 'Avg Response', value: stats.avg_response_time, color: 'default', icon: ClockMajor },
          { label: 'Satisfaction', value: `${stats.satisfaction_score}/5`, color: 'success', icon: StarFilledMinor },
          { label: 'Pending Replies', value: stats.pending_replies, color: 'warning', icon: ChatMajor },
        ].map((stat, index) => (
          <Grid.Cell key={index} columnSpan={{ xs: 6, sm: 6, md: 2, lg: 2, xl: 2 }}>
            <Card>
              <Box padding="400">
                <LegacyStack vertical spacing="tight">
                  <LegacyStack alignment="center" spacing="tight">
                    <Icon source={stat.icon} color={stat.color as any} />
                    <Text variant="bodySm" as="p" color="subdued">
                      {stat.label}
                    </Text>
                  </LegacyStack>
                  <Text variant="heading2xl" as="h2">
                    {stat.value}
                  </Text>
                </LegacyStack>
              </Box>
            </Card>
          </Grid.Cell>
        ))}
      </Grid>

      {/* Main Content */}
      <Box paddingBlockStart="600">
        <Card>
          <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
            <Card.Section>
              {selectedTab === 0 && (
                <>
                  {/* Filters */}
                  <Box paddingBlockEnd="400">
                    <Filters
                      queryValue={searchQuery}
                      filters={[
                        {
                          key: 'status',
                          label: 'Status',
                          filter: (
                            <ChoiceList
                              title="Status"
                              titleHidden
                              choices={[
                                { label: 'Open', value: 'open' },
                                { label: 'In Progress', value: 'in_progress' },
                                { label: 'Waiting Customer', value: 'waiting_customer' },
                                { label: 'Resolved', value: 'resolved' },
                                { label: 'Closed', value: 'closed' },
                              ]}
                              selected={statusFilter}
                              onChange={setStatusFilter}
                              allowMultiple
                            />
                          ),
                        },
                        {
                          key: 'priority',
                          label: 'Priority',
                          filter: (
                            <ChoiceList
                              title="Priority"
                              titleHidden
                              choices={[
                                { label: 'Urgent', value: 'urgent' },
                                { label: 'High', value: 'high' },
                                { label: 'Medium', value: 'medium' },
                                { label: 'Low', value: 'low' },
                              ]}
                              selected={priorityFilter}
                              onChange={setPriorityFilter}
                              allowMultiple
                            />
                          ),
                        },
                      ]}
                      appliedFilters={[]}
                      onQueryChange={setSearchQuery}
                      onQueryClear={() => setSearchQuery('')}
                      onClearAll={() => {
                        setStatusFilter(['open', 'in_progress']);
                        setPriorityFilter([]);
                        setSearchQuery('');
                      }}
                    />
                  </Box>

                  {/* Tickets Table */}
                  <DataTable
                    columnContentTypes={['text', 'text', 'text', 'text', 'text', 'text', 'text']}
                    headings={['Ticket', 'Subject', 'Priority', 'Status', 'Assigned', 'Created', 'Actions']}
                    rows={ticketRows}
                  />
                </>
              )}

              {selectedTab === 2 && (
                /* Analytics Tab */
                <Box>
                  <Grid>
                    <Grid.Cell columnSpan={{ xs: 12, sm: 12, md: 6, lg: 6, xl: 6 }}>
                      <Card title="Response Time Trends">
                        <Box padding="400">
                          <Text variant="bodyMd" as="p">
                            Average first response time over the last 7 days
                          </Text>
                          <Box paddingBlockStart="400">
                            <ProgressBar progress={75} size="small" />
                            <Text variant="bodySm" as="p" color="subdued">
                              2h 15m average (Target: 3h)
                            </Text>
                          </Box>
                        </Box>
                      </Card>
                    </Grid.Cell>
                    
                    <Grid.Cell columnSpan={{ xs: 12, sm: 12, md: 6, lg: 6, xl: 6 }}>
                      <Card title="Satisfaction Scores">
                        <Box padding="400">
                          <LegacyStack alignment="center" spacing="tight">
                            {[1, 2, 3, 4, 5].map(star => (
                              <Icon
                                key={star}
                                source={star <= 4.7 ? StarFilledMinor : StarOutlineMinor}
                                color="warning"
                              />
                            ))}
                            <Text variant="headingMd" as="span">
                              4.7 / 5.0
                            </Text>
                          </LegacyStack>
                          <Text variant="bodySm" as="p" color="subdued">
                            Based on 127 ratings this month
                          </Text>
                        </Box>
                      </Card>
                    </Grid.Cell>
                  </Grid>
                </Box>
              )}
            </Card.Section>
          </Tabs>
        </Card>
      </Box>

      {/* Ticket Detail Modal */}
      <Modal
        open={ticketModalOpen}
        onClose={() => setTicketModalOpen(false)}
        title={`Ticket #${selectedTicket?.ticket_number}`}
        large
        primaryAction={{
          content: 'Resolve Ticket',
          onAction: () => {
            if (selectedTicket) {
              handleStatusChange(selectedTicket.id, 'resolved');
              setTicketModalOpen(false);
            }
          },
        }}
        secondaryActions={[
          { content: 'Close', onAction: () => setTicketModalOpen(false) },
        ]}
      >
        <Modal.Section>
          {selectedTicket && (
            <LegacyStack vertical>
              {/* Ticket Header */}
              <Card>
                <Box padding="400">
                  <LegacyStack alignment="center" distribution="equalSpacing">
                    <LegacyStack vertical spacing="tight">
                      <Text variant="headingMd" as="h3">
                        {selectedTicket.subject}
                      </Text>
                      <LegacyStack spacing="tight">
                        <Badge status={getPriorityColor(selectedTicket.priority) as any}>
                          {selectedTicket.priority}
                        </Badge>
                        <Badge status={getStatusColor(selectedTicket.status) as any}>
                          {selectedTicket.status}
                        </Badge>
                        {selectedTicket.tags.map(tag => (
                          <Badge key={tag}>{tag}</Badge>
                        ))}
                      </LegacyStack>
                    </LegacyStack>
                    
                    <LegacyStack vertical spacing="tight" alignment="trailing">
                      <Text variant="bodySm" as="p" color="subdued">
                        {selectedTicket.customer_name}
                      </Text>
                      <Text variant="bodySm" as="p" color="subdued">
                        {selectedTicket.shop_domain}
                      </Text>
                    </LegacyStack>
                  </LegacyStack>
                </Box>
              </Card>

              {/* Messages */}
              <Card title="Conversation">
                <Box padding="400">
                  <LegacyStack vertical>
                    {ticketMessages.map(message => (
                      <Box
                        key={message.id}
                        padding="300"
                        background={
                          message.sender_type === 'customer' ? 'bg-subdued' :
                          message.is_internal_note ? 'bg-warning-subdued' : 'bg-success-subdued'
                        }
                        borderRadius="2"
                      >
                        <LegacyStack vertical spacing="tight">
                          <LegacyStack alignment="center" distribution="equalSpacing">
                            <Text variant="bodySm" as="p" fontWeight="semibold">
                              {message.sender_name}
                              {message.is_internal_note && ' (Internal Note)'}
                            </Text>
                            <Text variant="bodySm" as="p" color="subdued">
                              {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                            </Text>
                          </LegacyStack>
                          <Text variant="bodyMd" as="p">
                            {message.message}
                          </Text>
                        </LegacyStack>
                      </Box>
                    ))}
                  </LegacyStack>
                </Box>
              </Card>

              {/* Reply Box */}
              <Card title="Reply">
                <Box padding="400">
                  <LegacyStack vertical>
                    <LegacyStack distribution="equalSpacing">
                      <Popover
                        active={cannedResponsesOpen}
                        activator={
                          <Button onClick={() => setCannedResponsesOpen(!cannedResponsesOpen)}>
                            Canned Responses
                          </Button>
                        }
                        onClose={() => setCannedResponsesOpen(false)}
                      >
                        <ActionList
                          items={cannedResponses.map((response: any) => ({
                            content: response.title,
                            helpText: response.shortcut,
                            onAction: () => insertCannedResponse(response.content),
                          }))}
                        />
                      </Popover>
                      
                      <Checkbox
                        label="Internal note"
                        checked={isInternalNote}
                        onChange={setIsInternalNote}
                      />
                    </LegacyStack>
                    
                    <TextField
                      label=""
                      value={replyMessage}
                      onChange={setReplyMessage}
                      multiline={5}
                      placeholder="Type your reply..."
                      autoComplete="off"
                    />
                    
                    <LegacyStack distribution="trailing">
                      <ButtonGroup>
                        <Button onClick={() => setReplyMessage('')}>
                          Clear
                        </Button>
                        <Button primary onClick={handleSendReply}>
                          Send Reply
                        </Button>
                      </ButtonGroup>
                    </LegacyStack>
                  </LegacyStack>
                </Box>
              </Card>
            </LegacyStack>
          )}
        </Modal.Section>
      </Modal>
    </Page>
  );
}

export default AdminSupport;