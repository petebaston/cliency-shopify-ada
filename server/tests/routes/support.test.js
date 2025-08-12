const request = require('supertest');
const express = require('express');
const supportRoutes = require('../../routes/support');

// Mock database
jest.mock('../../database/db', () => ({
  query: jest.fn(),
}));

const pool = require('../../database/db');

// Mock auth middleware
jest.mock('../../middleware/auth', () => ({
  validateSession: (req, res, next) => {
    req.session = { shop: 'test-shop.myshopify.com' };
    next();
  },
}));

const app = express();
app.use(express.json());
app.use('/api/support', supportRoutes);

describe('Support Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/support/tickets', () => {
    it('should create a new support ticket', async () => {
      const ticketData = {
        shop_domain: 'test-shop.myshopify.com',
        customer_email: 'customer@test.com',
        customer_name: 'Test Customer',
        subject: 'How to use decimal discounts?',
        message: 'I need help setting up 12.75% discount',
        category: 'technical'
      };

      pool.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ // Insert ticket
          rows: [{
            id: 'ticket-123',
            ticket_number: 'TKT-001',
            ...ticketData,
            status: 'open',
            priority: 'medium',
            created_at: new Date()
          }]
        })
        .mockResolvedValueOnce({}) // Insert customer message
        .mockResolvedValueOnce({}) // Insert bot message
        .mockResolvedValueOnce({}); // COMMIT

      const response = await request(app)
        .post('/api/support/tickets')
        .send(ticketData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('ticket');
      expect(response.body).toHaveProperty('ticketNumber');
      expect(response.body.ticket.status).toBe('open');
    });
  });

  describe('GET /api/support/tickets', () => {
    it('should fetch tickets with filters', async () => {
      const mockTickets = [
        {
          id: '1',
          ticket_number: 'TKT-001',
          subject: 'Test ticket',
          status: 'open',
          priority: 'high',
          messages_count: 3,
          last_message: 'Latest message'
        }
      ];

      pool.query.mockResolvedValueOnce({ rows: mockTickets });

      const response = await request(app)
        .get('/api/support/tickets')
        .query({ status: 'open', priority: 'high' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('status'),
        expect.arrayContaining(['open', 'high'])
      );
    });
  });

  describe('PATCH /api/support/tickets/:id', () => {
    it('should update ticket status', async () => {
      const ticketId = 'ticket-123';
      const updates = {
        status: 'in_progress',
        priority: 'urgent',
        assigned_to: 'admin@test.com'
      };

      pool.query.mockResolvedValueOnce({
        rows: [{
          id: ticketId,
          ...updates,
          updated_at: new Date()
        }]
      });

      const response = await request(app)
        .patch(`/api/support/tickets/${ticketId}`)
        .send(updates);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('in_progress');
      expect(response.body.priority).toBe('urgent');
    });
  });

  describe('POST /api/support/tickets/:id/messages', () => {
    it('should add message to ticket', async () => {
      const ticketId = 'ticket-123';
      const message = {
        sender_type: 'admin',
        sender_name: 'Support Admin',
        message: 'To create decimal discounts, go to Discounts > Create New...',
        is_internal_note: false
      };

      pool.query
        .mockResolvedValueOnce({}) // Update first_response_at
        .mockResolvedValueOnce({ // Insert message
          rows: [{
            id: 'msg-456',
            ticket_id: ticketId,
            ...message,
            created_at: new Date()
          }]
        });

      const response = await request(app)
        .post(`/api/support/tickets/${ticketId}/messages`)
        .send(message);

      expect(response.status).toBe(200);
      expect(response.body.sender_type).toBe('admin');
      expect(response.body.message).toContain('decimal discounts');
    });
  });

  describe('GET /api/support/stats', () => {
    it('should return support statistics', async () => {
      const mockStats = {
        open_tickets: 5,
        in_progress: 3,
        resolved_today: 2,
        unassigned: 1,
        avg_response_hours: 2.5,
        avg_satisfaction: 4.7
      };

      pool.query
        .mockResolvedValueOnce({ rows: [mockStats] })
        .mockResolvedValueOnce({ rows: [{ count: 2 }] }); // pending replies

      const response = await request(app)
        .get('/api/support/stats');

      expect(response.status).toBe(200);
      expect(response.body.open_tickets).toBe(5);
      expect(response.body.pending_replies).toBe(2);
      expect(response.body.avg_satisfaction).toBe(4.7);
    });
  });

  describe('GET /api/support/canned-responses', () => {
    it('should fetch canned responses', async () => {
      const mockResponses = [
        {
          id: '1',
          title: 'Decimal Discount Instructions',
          content: 'To create decimal discounts...',
          shortcut: '/decimal',
          usage_count: 15
        }
      ];

      pool.query.mockResolvedValueOnce({ rows: mockResponses });

      const response = await request(app)
        .get('/api/support/canned-responses');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].title).toBe('Decimal Discount Instructions');
    });
  });

  describe('POST /api/support/canned-responses', () => {
    it('should create new canned response', async () => {
      const newResponse = {
        title: 'Billing Help',
        content: 'Our billing plans...',
        category: 'billing',
        shortcut: '/billing'
      };

      pool.query.mockResolvedValueOnce({
        rows: [{
          id: 'canned-123',
          ...newResponse,
          created_by: 'test-shop.myshopify.com',
          created_at: new Date()
        }]
      });

      const response = await request(app)
        .post('/api/support/canned-responses')
        .send(newResponse);

      expect(response.status).toBe(200);
      expect(response.body.title).toBe('Billing Help');
      expect(response.body.shortcut).toBe('/billing');
    });
  });

  describe('GET /api/support/customers/:email', () => {
    it('should fetch customer profile with tickets', async () => {
      const email = 'customer@test.com';
      
      pool.query
        .mockResolvedValueOnce({ // Get profile
          rows: [{
            email,
            name: 'Test Customer',
            total_tickets: 5,
            vip_status: false
          }]
        })
        .mockResolvedValueOnce({ // Get recent tickets
          rows: [
            { id: '1', subject: 'Recent ticket 1' },
            { id: '2', subject: 'Recent ticket 2' }
          ]
        });

      const response = await request(app)
        .get(`/api/support/customers/${email}`);

      expect(response.status).toBe(200);
      expect(response.body.profile.email).toBe(email);
      expect(response.body.recent_tickets).toHaveLength(2);
    });

    it('should create profile if not exists', async () => {
      const email = 'new@test.com';
      
      pool.query
        .mockResolvedValueOnce({ rows: [] }) // No existing profile
        .mockResolvedValueOnce({ rows: [{ count: 0 }] }) // Ticket count
        .mockResolvedValueOnce({ // Create profile
          rows: [{
            email,
            total_tickets: 0
          }]
        })
        .mockResolvedValueOnce({ rows: [] }); // No recent tickets

      const response = await request(app)
        .get(`/api/support/customers/${email}`);

      expect(response.status).toBe(200);
      expect(response.body.profile.email).toBe(email);
      expect(response.body.profile.total_tickets).toBe(0);
    });
  });
});