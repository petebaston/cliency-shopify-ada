const express = require('express');
const router = express.Router();
const pool = require('../database/db');
const { validateSession } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// Generate ticket number
function generateTicketNumber() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `TKT-${timestamp}-${random}`.toUpperCase();
}

// Get all tickets with filters
router.get('/tickets', validateSession, async (req, res) => {
  try {
    const { status, priority, assignee, search, limit = 50, offset = 0 } = req.query;
    
    let query = `
      SELECT 
        t.*,
        COUNT(m.id) as messages_count,
        MAX(m.message) as last_message,
        MAX(m.created_at) as last_message_at
      FROM support_tickets t
      LEFT JOIN support_messages m ON t.id = m.ticket_id
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (status) {
      query += ` AND t.status = $${paramIndex++}`;
      params.push(status);
    }
    
    if (priority) {
      query += ` AND t.priority = $${paramIndex++}`;
      params.push(priority);
    }
    
    if (assignee) {
      query += ` AND t.assigned_to = $${paramIndex++}`;
      params.push(assignee);
    }
    
    if (search) {
      query += ` AND (t.subject ILIKE $${paramIndex} OR t.customer_email ILIKE $${paramIndex} OR t.customer_name ILIKE $${paramIndex++})`;
      params.push(`%${search}%`);
    }
    
    query += ` GROUP BY t.id ORDER BY t.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

// Get single ticket
router.get('/tickets/:id', validateSession, async (req, res) => {
  try {
    const { id } = req.params;
    
    const ticketResult = await pool.query(
      'SELECT * FROM support_tickets WHERE id = $1',
      [id]
    );
    
    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    const messagesResult = await pool.query(
      'SELECT * FROM support_messages WHERE ticket_id = $1 ORDER BY created_at ASC',
      [id]
    );
    
    res.json({
      ticket: ticketResult.rows[0],
      messages: messagesResult.rows
    });
  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({ error: 'Failed to fetch ticket' });
  }
});

// Create new ticket (from customer)
router.post('/tickets', async (req, res) => {
  try {
    const {
      shop_domain,
      customer_email,
      customer_name,
      subject,
      message,
      category = 'other'
    } = req.body;
    
    const ticketNumber = generateTicketNumber();
    
    // Start transaction
    await pool.query('BEGIN');
    
    // Create ticket
    const ticketResult = await pool.query(
      `INSERT INTO support_tickets 
       (ticket_number, shop_domain, customer_email, customer_name, subject, category, status, priority)
       VALUES ($1, $2, $3, $4, $5, $6, 'open', 'medium')
       RETURNING *`,
      [ticketNumber, shop_domain, customer_email, customer_name, subject, category]
    );
    
    const ticket = ticketResult.rows[0];
    
    // Add first message
    await pool.query(
      `INSERT INTO support_messages
       (ticket_id, sender_type, sender_name, message)
       VALUES ($1, 'customer', $2, $3)`,
      [ticket.id, customer_name, message]
    );
    
    // Add automated bot response
    const botResponse = generateBotResponse(category, subject);
    await pool.query(
      `INSERT INTO support_messages
       (ticket_id, sender_type, sender_name, message)
       VALUES ($1, 'bot', 'Support Bot', $2)`,
      [ticket.id, botResponse]
    );
    
    await pool.query('COMMIT');
    
    res.json({ ticket, ticketNumber });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error creating ticket:', error);
    res.status(500).json({ error: 'Failed to create ticket' });
  }
});

// Update ticket status/priority/assignment
router.patch('/tickets/:id', validateSession, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, priority, assigned_to, tags } = req.body;
    
    const updates = [];
    const params = [];
    let paramIndex = 1;
    
    if (status) {
      updates.push(`status = $${paramIndex++}`);
      params.push(status);
      
      if (status === 'resolved') {
        updates.push(`resolved_at = CURRENT_TIMESTAMP`);
      }
    }
    
    if (priority) {
      updates.push(`priority = $${paramIndex++}`);
      params.push(priority);
    }
    
    if (assigned_to !== undefined) {
      updates.push(`assigned_to = $${paramIndex++}`);
      params.push(assigned_to);
    }
    
    if (tags) {
      updates.push(`tags = $${paramIndex++}`);
      params.push(tags);
    }
    
    params.push(id);
    
    const result = await pool.query(
      `UPDATE support_tickets 
       SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramIndex}
       RETURNING *`,
      params
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating ticket:', error);
    res.status(500).json({ error: 'Failed to update ticket' });
  }
});

// Add message to ticket
router.post('/tickets/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    const { sender_type, sender_name, message, is_internal_note = false } = req.body;
    
    // If this is the first admin response, update first_response_at
    if (sender_type === 'admin') {
      await pool.query(
        `UPDATE support_tickets 
         SET first_response_at = COALESCE(first_response_at, CURRENT_TIMESTAMP)
         WHERE id = $1`,
        [id]
      );
    }
    
    const result = await pool.query(
      `INSERT INTO support_messages
       (ticket_id, sender_type, sender_name, message, is_internal_note)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, sender_type, sender_name, message, is_internal_note]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error adding message:', error);
    res.status(500).json({ error: 'Failed to add message' });
  }
});

// Get support statistics
router.get('/stats', validateSession, async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        COUNT(CASE WHEN status = 'open' THEN 1 END) as open_tickets,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
        COUNT(CASE WHEN status = 'resolved' AND DATE(resolved_at) = CURRENT_DATE THEN 1 END) as resolved_today,
        COUNT(CASE WHEN status IN ('open', 'in_progress') AND assigned_to IS NULL THEN 1 END) as unassigned,
        AVG(EXTRACT(EPOCH FROM (first_response_at - created_at))/3600)::numeric(10,2) as avg_response_hours,
        AVG(satisfaction_rating)::numeric(3,2) as avg_satisfaction
      FROM support_tickets
      WHERE created_at > CURRENT_DATE - INTERVAL '30 days'
    `);
    
    const pending = await pool.query(`
      SELECT COUNT(DISTINCT ticket_id) as count
      FROM support_messages m
      JOIN support_tickets t ON m.ticket_id = t.id
      WHERE m.sender_type = 'customer'
      AND m.created_at > (
        SELECT MAX(created_at) 
        FROM support_messages 
        WHERE ticket_id = m.ticket_id 
        AND sender_type IN ('admin', 'bot')
      )
      AND t.status NOT IN ('resolved', 'closed')
    `);
    
    res.json({
      ...stats.rows[0],
      pending_replies: pending.rows[0].count
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Get canned responses
router.get('/canned-responses', validateSession, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM canned_responses ORDER BY usage_count DESC, title ASC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching canned responses:', error);
    res.status(500).json({ error: 'Failed to fetch canned responses' });
  }
});

// Create canned response
router.post('/canned-responses', validateSession, async (req, res) => {
  try {
    const { title, content, category, shortcut } = req.body;
    
    const result = await pool.query(
      `INSERT INTO canned_responses (title, content, category, shortcut, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [title, content, category, shortcut, req.session.shop]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating canned response:', error);
    res.status(500).json({ error: 'Failed to create canned response' });
  }
});

// Use canned response (increment counter)
router.post('/canned-responses/:id/use', validateSession, async (req, res) => {
  try {
    const { id } = req.params;
    
    await pool.query(
      'UPDATE canned_responses SET usage_count = usage_count + 1 WHERE id = $1',
      [id]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating canned response usage:', error);
    res.status(500).json({ error: 'Failed to update usage' });
  }
});

// Get customer profile
router.get('/customers/:email', validateSession, async (req, res) => {
  try {
    const { email } = req.params;
    
    let profile = await pool.query(
      'SELECT * FROM customer_profiles WHERE email = $1',
      [email]
    );
    
    if (profile.rows.length === 0) {
      // Create profile if doesn't exist
      const tickets = await pool.query(
        'SELECT COUNT(*) as count FROM support_tickets WHERE customer_email = $1',
        [email]
      );
      
      profile = await pool.query(
        `INSERT INTO customer_profiles (email, total_tickets)
         VALUES ($1, $2)
         RETURNING *`,
        [email, tickets.rows[0].count]
      );
    }
    
    // Get recent tickets
    const tickets = await pool.query(
      `SELECT * FROM support_tickets 
       WHERE customer_email = $1 
       ORDER BY created_at DESC 
       LIMIT 5`,
      [email]
    );
    
    res.json({
      profile: profile.rows[0],
      recent_tickets: tickets.rows
    });
  } catch (error) {
    console.error('Error fetching customer profile:', error);
    res.status(500).json({ error: 'Failed to fetch customer profile' });
  }
});

// Update customer profile
router.patch('/customers/:email', validateSession, async (req, res) => {
  try {
    const { email } = req.params;
    const { name, tags, notes, vip_status } = req.body;
    
    const updates = [];
    const params = [];
    let paramIndex = 1;
    
    if (name) {
      updates.push(`name = $${paramIndex++}`);
      params.push(name);
    }
    
    if (tags) {
      updates.push(`tags = $${paramIndex++}`);
      params.push(tags);
    }
    
    if (notes) {
      updates.push(`notes = $${paramIndex++}`);
      params.push(notes);
    }
    
    if (vip_status !== undefined) {
      updates.push(`vip_status = $${paramIndex++}`);
      params.push(vip_status);
    }
    
    params.push(email);
    
    const result = await pool.query(
      `UPDATE customer_profiles 
       SET ${updates.join(', ')}
       WHERE email = $${paramIndex}
       RETURNING *`,
      params
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating customer profile:', error);
    res.status(500).json({ error: 'Failed to update customer profile' });
  }
});

// Helper function to generate bot responses
function generateBotResponse(category, subject) {
  const responses = {
    billing: "Thanks for contacting support! I see you have a billing question. A team member will assist you shortly. In the meantime, you can review our pricing at: https://discountmanager.com/pricing",
    technical: "Thanks for reaching out! I've logged your technical issue. Our support team will investigate and respond within 2-4 hours. Check our docs at: https://docs.discountmanager.com",
    feature: "Thank you for your feature request! We love hearing from our users. Your suggestion has been forwarded to our product team for review.",
    other: "Thanks for contacting support! Your message has been received and a team member will respond shortly. Average response time is 2-4 hours."
  };
  
  return responses[category] || responses.other;
}

module.exports = router;