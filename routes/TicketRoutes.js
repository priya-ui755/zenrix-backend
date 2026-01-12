const express = require('express');
const Ticket = require('../models/Ticket');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const router = express.Router();

// ========== USER ROUTES ==========

// Get all tickets for logged-in user
router.get('/my-tickets', requireAuth, async (req, res, next) => {
  try {
    const tickets = await Ticket.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate('user', 'firstName lastName email');
    res.json({ success: true, count: tickets.length, data: tickets });
  } catch (error) {
    next(error);
  }
});

// Get single ticket (user can only view their own)
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    console.log('[Tickets] GET /:id - req.user present:', !!req.user, 'userId:', req.user && req.user._id);
    const ticket = await Ticket.findById(req.params.id).populate('user', 'firstName lastName email');
    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Ticket not found' });
    }
    // Check if user owns this ticket or is admin
    if (ticket.user._id.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    res.json({ success: true, data: ticket });
  } catch (error) {
    next(error);
  }
});

// Create new ticket (authenticated users)
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { subject, description, category, priority, source } = req.body;
    if (!subject || !description) {
      return res.status(400).json({ success: false, error: 'Subject and description are required' });
    }

    const ticket = new Ticket({
      user: req.user._id,
      subject,
      description,
      category: category || 'other',
      priority: priority || 'medium',
      source: source === 'api' ? 'api' : 'user',
      messages: [{
        sender: 'user',
        senderName: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim(),
        message: description,
        timestamp: new Date()
      }]
    });

    const saved = await ticket.save();
    await saved.populate('user', 'firstName lastName email');
    res.status(201).json({ success: true, data: saved });
  } catch (error) {
    if (error && error.name === 'ValidationError') {
      const details = {};
      Object.keys(error.errors || {}).forEach(key => { details[key] = error.errors[key].message; });
      return res.status(400).json({ success: false, error: 'Validation failed', details });
    }
    next(error);
  }
});

// Rate limiter for guest ticket creation (protect against spam)
const rateLimit = require('express-rate-limit');
const guestTicketLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 6, message: { success:false, error: 'Too many tickets created from this IP, try again later.' } });

// Create guest ticket (no auth required)
router.post('/guest', guestTicketLimiter, async (req, res, next) => {
  try {
    const { name, email, subject, description, category, priority, source, ref } = req.body;
    if (!name || !email || !subject || !description) {
      return res.status(400).json({ success: false, error: 'Name, email, subject and description are required' });
    }

    // Basic email validation (simple regex)
    const emailRe = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    if (!emailRe.test(email)) return res.status(400).json({ success:false, error: 'Invalid email format' });

    const ticket = new Ticket({
      subject,
      description,
      category: category || 'other',
      priority: priority || 'medium',
      guestName: name,
      guestEmail: email,
      source: source || (ref ? 'chatbot' : 'guest'),
      seen: false,
      messages: [{
        sender: 'user',
        senderName: name,
        message: description,
        timestamp: new Date()
      }]
    });

    const saved = await ticket.save();

    // Send confirmation email (if configured) - fire and forget
    try{ const mailer = require('../server/notifications/email'); mailer.sendTicketConfirmation(saved).catch(()=>{}); }catch(e){ /* ignore */ }

    res.status(201).json({ success: true, data: saved });
  } catch (error) {
    if (error && error.name === 'ValidationError') {
      const details = {};
      Object.keys(error.errors || {}).forEach(key => { details[key] = error.errors[key].message; });
      return res.status(400).json({ success: false, error: 'Validation failed', details });
    }
    next(error);
  }
});

// Public view for guest tickets via id + guest_email query param
router.get('/public/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    const email = (req.query.email || '').trim();
    if (!id || !email) return res.status(400).json({ success:false, error:'id and email query parameters are required' });

    const ticket = await Ticket.findById(id).lean();
    if (!ticket) return res.status(404).json({ success:false, error:'Ticket not found' });

    if (!ticket.guestEmail || ticket.guestEmail.toLowerCase() !== email.toLowerCase()){
      return res.status(403).json({ success:false, error:'Access denied' });
    }

    // Strip sensitive fields
    const safe = Object.assign({}, ticket);
    delete safe.guestEmail;
    delete safe.guestName;
    res.json({ success:true, data: safe });

  } catch (err) { next(err); }
});

// Admin: mark ticket seen/unseen
router.patch('/admin/:id/seen', requireAdmin, async (req, res, next) => {
  try {
    const { seen } = req.body;
    if (typeof seen === 'undefined') return res.status(400).json({ success:false, error:'seen field required' });
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ success:false, error:'Ticket not found' });
    ticket.seen = !!seen;
    await ticket.save();
    res.json({ success:true, data: ticket });
  } catch (e) { next(e); }
});

// Admin: unseen count
router.get('/admin/unseen-count', requireAdmin, async (req,res,next)=>{
  try{
    const count = await Ticket.countDocuments({ seen: false });
    res.json({ success:true, count });
  }catch(e){ next(e); }
});

// Add reply to ticket (user can reply to their own ticket)
router.post('/:id/reply', requireAuth, async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Ticket not found' });
    }

    // If ticket is closed, do not allow users to reply (session is closed)
    if (ticket.status === 'closed') {
      return res.status(403).json({ success: false, error: 'Ticket is closed' });
    }

    // Check if user owns this ticket
    if (ticket.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    ticket.messages.push({
      sender: 'user',
      senderName: `${req.user.firstName} ${req.user.lastName}`,
      message: message.trim(),
      timestamp: new Date()
    });

    // If ticket was solved, reopen it
    if (ticket.status === 'solved' || ticket.status === 'closed') {
      ticket.status = 'open';
      ticket.resolvedAt = undefined;
      ticket.resolvedBy = undefined;
    }

    await ticket.save();
    await ticket.populate('user', 'firstName lastName email');
    
    res.json({ success: true, data: ticket });
  } catch (error) {
    next(error);
  }
});

// Update ticket status (users can update their own ticket status)
router.patch('/:id/status', requireAuth, async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, error: 'Status is required' });
    }

    const allowed = ['open', 'in-progress', 'solved', 'closed'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status value' });
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Ticket not found' });
    }

    // Only owner or admin can change status
    if (ticket.user.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    ticket.status = status;
    if (status === 'solved' || status === 'closed') {
      ticket.resolvedAt = new Date();
      ticket.resolvedBy = req.user.firstName && req.user.lastName ? `${req.user.firstName} ${req.user.lastName}` : 'User';
    } else {
      ticket.resolvedAt = undefined;
      ticket.resolvedBy = undefined;
    }

    await ticket.save();
    await ticket.populate('user', 'firstName lastName email');
    res.json({ success: true, data: ticket });
  } catch (error) {
    next(error);
  }

});

// ========== ADMIN ROUTES ==========

// Get all tickets (admin only)
router.get('/admin/all', requireAdmin, async (req, res, next) => {
  try {
    const { status, category, priority } = req.query;
    const filter = {};
    
    if (status && status !== 'all') filter.status = status;
    if (category && category !== 'all') filter.category = category;
    if (priority && priority !== 'all') filter.priority = priority;

    const tickets = await Ticket.find(filter)
      .sort({ createdAt: -1 })
      .populate('user', 'firstName lastName email');
      
    res.json({ success: true, count: tickets.length, data: tickets });
  } catch (error) {
    next(error);
  }
});

// Admin reply to ticket
router.post('/admin/:id/reply', requireAdmin, async (req, res, next) => {
  try {
    console.log('[Tickets] ADMIN REPLY - req.admin:', !!req.admin);
    console.log('[Tickets] ADMIN REPLY - request body keys:', Object.keys(req.body || {}));
    const { message, status } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Ticket not found' });
    }

    ticket.messages.push({
      sender: 'admin',
      senderName: 'Support Team',
      message: message.trim(),
      timestamp: new Date()
    });

    // Update status if provided
    if (status) {
      ticket.status = status;
      if (status === 'solved' || status === 'closed') {
        ticket.resolvedAt = new Date();
        ticket.resolvedBy = 'Admin';
      }
    }

    await ticket.save();
    await ticket.populate('user', 'firstName lastName email');
    
    res.json({ success: true, data: ticket });
  } catch (error) {
    next(error);
  }
});

// Update ticket status (admin only)
router.patch('/admin/:id/status', requireAdmin, async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, error: 'Status is required' });
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Ticket not found' });
    }

    ticket.status = status;
    if (status === 'solved' || status === 'closed') {
      ticket.resolvedAt = new Date();
      ticket.resolvedBy = 'Admin';
    } else {
      ticket.resolvedAt = undefined;
      ticket.resolvedBy = undefined;
    }

    await ticket.save();
    await ticket.populate('user', 'firstName lastName email');
    
    res.json({ success: true, data: ticket });
  } catch (error) {
    next(error);
  }
});

// Delete ticket (admin only)
router.delete('/admin/:id', requireAdmin, async (req, res, next) => {
  try {
    const ticket = await Ticket.findByIdAndDelete(req.params.id);
    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Ticket not found' });
    }
    res.json({ success: true, message: 'Ticket deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
