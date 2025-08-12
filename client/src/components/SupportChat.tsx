import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Card,
  Text,
  TextField,
  Button,
  Badge,
  Avatar,
  LegacyStack,
  Icon,
  Box,
  Popover,
  ActionList,
  Spinner,
  Banner,
  ButtonGroup,
  Collapsible,
} from '@shopify/polaris';
import {
  ChatIcon,
  SendIcon,
  CheckCircleIcon,
  AttachmentIcon,
  QuestionCircleIcon,
  ClockIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  MinimizeIcon,
  MaximizeIcon,
  XIcon,
  CashDollarIcon,
  AlertDiamondIcon,
  LightbulbIcon,
} from '@shopify/polaris-icons';
import { format } from 'date-fns';
import api from '../services/api';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'support' | 'bot';
  timestamp: Date;
  status?: 'sending' | 'sent' | 'error';
  attachments?: string[];
  isTyping?: boolean;
}

interface SupportChatProps {
  shopDomain?: string;
  userEmail?: string;
  userName?: string;
}

function SupportChat({ shopDomain, userEmail, userName }: SupportChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [supportAgentTyping, setSupportAgentTyping] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'offline'>('connecting');
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [activePopover, setActivePopover] = useState(false);

  const quickActions = [
    { id: 'billing', label: 'Billing Question', icon: CashDollarIcon },
    { id: 'technical', label: 'Technical Issue', icon: AlertDiamondIcon },
    { id: 'feature', label: 'Feature Request', icon: LightbulbIcon },
    { id: 'other', label: 'Other', icon: QuestionCircleIcon },
  ];

  const commonQuestions = [
    'How do I create a decimal percentage discount?',
    'Can I schedule discounts in advance?',
    'How do I export my discount data?',
    'What\'s the difference between plans?',
    'How do I cancel my subscription?',
  ];

  useEffect(() => {
    // Initialize chat with welcome message
    if (isOpen && messages.length === 0) {
      const welcomeMessage: Message = {
        id: '1',
        text: `👋 Hi ${userName || 'there'}! I'm here to help. How can I assist you today?`,
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
      setConnectionStatus('connected');
    }
  }, [isOpen, userName, messages.length]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Mark messages as read when chat is open
    if (isOpen && unreadCount > 0) {
      setUnreadCount(0);
    }
  }, [isOpen, unreadCount]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = useCallback(async () => {
    if (!inputMessage.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date(),
      status: 'sending',
    };

    setMessages(prev => [...prev, newMessage]);
    setInputMessage('');
    setSupportAgentTyping(true);

    try {
      // Simulate API call to send message
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update message status
      setMessages(prev => 
        prev.map(msg => 
          msg.id === newMessage.id ? { ...msg, status: 'sent' } : msg
        )
      );

      // Simulate support response
      setTimeout(() => {
        const responseMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: generateBotResponse(inputMessage),
          sender: 'bot',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, responseMessage]);
        setSupportAgentTyping(false);
        
        // Add unread count if chat is minimized
        if (isMinimized) {
          setUnreadCount(prev => prev + 1);
        }
      }, 2000);
    } catch (error) {
      // Handle error
      setMessages(prev => 
        prev.map(msg => 
          msg.id === newMessage.id ? { ...msg, status: 'error' } : msg
        )
      );
      setSupportAgentTyping(false);
    }
  }, [inputMessage, isMinimized]);

  const generateBotResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('decimal') || lowerMessage.includes('percentage')) {
      return 'To create decimal percentage discounts, go to Discounts → Create New → enter any decimal value like 12.75% in the percentage field. This feature is perfect for precise pricing strategies!';
    }
    
    if (lowerMessage.includes('billing') || lowerMessage.includes('plan') || lowerMessage.includes('subscription')) {
      return 'You can manage your billing at any time from Settings → Billing. We offer three plans: Starter ($29), Growth ($79), and Pro ($199). All plans include a 14-day free trial!';
    }
    
    if (lowerMessage.includes('cancel')) {
      return 'You can cancel your subscription anytime from the Billing page. Your data will be retained for 30 days after cancellation, and you can export it at any time.';
    }
    
    if (lowerMessage.includes('help') || lowerMessage.includes('support')) {
      return 'I\'m here to help! You can also reach our support team at support@discountmanagerpro.com or check our documentation at docs.discountmanagerpro.com';
    }
    
    return 'Thanks for your message! A support agent will review this and get back to you within 24 hours. Is there anything else I can help you with in the meantime?';
  };

  const handleQuickQuestion = (question: string) => {
    setInputMessage(question);
    handleSendMessage();
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
    setIsMinimized(false);
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const chatButton = (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 999,
        cursor: 'pointer',
      }}
      onClick={toggleChat}
    >
      <div style={{
        width: '60px',
        height: '60px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #5C6AC4, #9C6ADE)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        position: 'relative',
      }}>
        <Icon source={ChatIcon} color="base" />
        {unreadCount > 0 && (
          <div style={{
            position: 'absolute',
            top: '-5px',
            right: '-5px',
            background: '#FF0000',
            color: 'white',
            borderRadius: '50%',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 'bold',
          }}>
            {unreadCount}
          </div>
        )}
      </div>
    </div>
  );

  const chatWindow = isOpen && (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        width: '380px',
        height: isMinimized ? '60px' : '600px',
        zIndex: 1000,
        transition: 'height 0.3s ease',
      }}
    >
      <Card>
        {/* Chat Header */}
        <Box
          padding="400"
          background="bg-subdued"
          borderRadiusEndStart="2"
          borderRadiusEndEnd="2"
        >
          <LegacyStack alignment="center" distribution="equalSpacing">
            <LegacyStack alignment="center" spacing="tight">
              <Avatar size="small" />
              <LegacyStack vertical spacing="extraTight">
                <Text variant="headingSm" as="h3">
                  Support Chat
                </Text>
                <LegacyStack spacing="extraTight">
                  <Badge
                    status={connectionStatus === 'connected' ? 'success' : 
                           connectionStatus === 'connecting' ? 'warning' : 'critical'}
                    size="small"
                  >
                    {connectionStatus === 'connected' ? 'Online' :
                     connectionStatus === 'connecting' ? 'Connecting...' : 'Offline'}
                  </Badge>
                  <Text variant="bodySm" as="span" color="subdued">
                    Typical reply: ~2 min
                  </Text>
                </LegacyStack>
              </LegacyStack>
            </LegacyStack>
            
            <ButtonGroup segmented>
              <Button
                plain
                icon={isMinimized ? MaximizeIcon : MinimizeIcon}
                onClick={toggleMinimize}
              />
              <Button
                plain
                icon={XIcon}
                onClick={toggleChat}
              />
            </ButtonGroup>
          </LegacyStack>
        </Box>

        <Collapsible
          open={!isMinimized}
          id="chat-content"
          transition={{ duration: '200ms', timingFunction: 'ease-in-out' }}
        >
          {/* Quick Actions */}
          {messages.length === 1 && (
            <Box padding="400" background="bg-surface-secondary">
              <LegacyStack vertical spacing="tight">
                <Text variant="headingSm" as="h4">
                  Quick Actions
                </Text>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {quickActions.map(action => (
                    <Button
                      key={action.id}
                      size="slim"
                      onClick={() => setSelectedCategory(action.id)}
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              </LegacyStack>
            </Box>
          )}

          {/* Messages Container */}
          <div
            style={{
              height: '380px',
              overflowY: 'auto',
              padding: '16px',
              background: '#FAFBFB',
            }}
          >
            {messages.map((message) => (
              <div
                key={message.id}
                style={{
                  marginBottom: '12px',
                  display: 'flex',
                  justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  style={{
                    maxWidth: '70%',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    background: message.sender === 'user' 
                      ? 'linear-gradient(135deg, #5C6AC4, #6B7DD8)'
                      : message.sender === 'support'
                      ? '#FFFFFF'
                      : '#F4F6F8',
                    color: message.sender === 'user' ? 'white' : '#202223',
                    boxShadow: message.sender !== 'user' 
                      ? '0 1px 3px rgba(0, 0, 0, 0.1)' 
                      : 'none',
                  }}
                >
                  <Text variant="bodyMd" as="p">
                    {message.text}
                  </Text>
                  <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Text variant="bodySm" as="span" color={message.sender === 'user' ? 'subdued' : 'subdued'}>
                      {format(message.timestamp, 'HH:mm')}
                    </Text>
                    {message.status === 'sent' && message.sender === 'user' && (
                      <Icon source={CheckCircleIcon} color="interactive" />
                    )}
                    {message.status === 'sending' && <Spinner size="small" />}
                  </div>
                </div>
              </div>
            ))}
            
            {supportAgentTyping && (
              <div style={{ marginBottom: '12px' }}>
                <div
                  style={{
                    display: 'inline-block',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    background: '#F4F6F8',
                  }}
                >
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                    <Text variant="bodySm" as="span" color="subdued">
                      Support is typing...
                    </Text>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Common Questions */}
          {messages.length > 1 && messages.length < 4 && (
            <Box padding="300" background="bg-surface-secondary">
              <Popover
                active={activePopover}
                activator={
                  <Button
                    size="slim"
                    disclosure
                    onClick={() => setActivePopover(!activePopover)}
                  >
                    Common Questions
                  </Button>
                }
                onClose={() => setActivePopover(false)}
              >
                <ActionList
                  items={commonQuestions.map(q => ({
                    content: q,
                    onAction: () => {
                      setInputMessage(q);
                      setActivePopover(false);
                    },
                  }))}
                />
              </Popover>
            </Box>
          )}

          {/* Input Area */}
          <Box padding="400" borderBlockStartWidth="1" borderColor="border-subdued">
            <LegacyStack spacing="tight">
              <LegacyStack.Item fill>
                <TextField
                  label=""
                  value={inputMessage}
                  onChange={setInputMessage}
                  placeholder="Type your message..."
                  autoComplete="off"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
              </LegacyStack.Item>
              <Button
                primary
                icon={SendIcon}
                onClick={handleSendMessage}
                disabled={!inputMessage.trim()}
              />
              <Button
                icon={AttachmentIcon}
                onClick={() => {}}
                accessibilityLabel="Attach file"
              />
            </LegacyStack>
          </Box>
        </Collapsible>
      </Card>
    </div>
  );

  return (
    <>
      {!isOpen && chatButton}
      {chatWindow}
      
      <style>{`
        .typing-indicator {
          display: flex;
          align-items: center;
          gap: 2px;
        }
        
        .typing-indicator span {
          height: 8px;
          width: 8px;
          background-color: #919EAB;
          border-radius: 50%;
          display: inline-block;
          animation: typing 1.4s infinite;
        }
        
        .typing-indicator span:nth-child(2) {
          animation-delay: 0.2s;
        }
        
        .typing-indicator span:nth-child(3) {
          animation-delay: 0.4s;
        }
        
        @keyframes typing {
          0%, 60%, 100% {
            transform: translateY(0);
            opacity: 0.7;
          }
          30% {
            transform: translateY(-10px);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}

export default SupportChat;