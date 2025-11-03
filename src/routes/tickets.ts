import { Hono } from 'hono';
import { ticketRepository } from '../models/tickets';
import { validator } from '../middleware/validator';
import { z } from 'zod';
import { logger } from '../config/logger';

const tickets = new Hono();

// Get all tickets
tickets.get('/', async (c) => {
  const limit = parseInt(c.req.query('limit') || '50');
  const offset = parseInt(c.req.query('offset') || '0');
  
  const filters: any = {};
  if (c.req.query('status')) filters.status = c.req.query('status');
  if (c.req.query('priority')) filters.priority = c.req.query('priority');
  if (c.req.query('assigned_to')) filters.assignedTo = c.req.query('assigned_to');
  if (c.req.query('created_by')) filters.createdBy = c.req.query('created_by');
  if (c.req.query('category')) filters.category = c.req.query('category');

  const allTickets = await ticketRepository.getAll(Object.keys(filters).length > 0 ? filters : undefined, limit, offset);
  return c.json({ success: true, data: allTickets });
});

// Get ticket by ID
tickets.get('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  const ticket = await ticketRepository.getById(id);
  
  if (!ticket) {
    return c.json({ success: false, error: 'Ticket not found' }, 404);
  }
  
  return c.json({ success: true, data: ticket });
});

// Get ticket by ticket number
tickets.get('/number/:ticketNumber', async (c) => {
  const ticketNumber = c.req.param('ticketNumber');
  const ticket = await ticketRepository.getByTicketNumber(ticketNumber);
  
  if (!ticket) {
    return c.json({ success: false, error: 'Ticket not found' }, 404);
  }
  
  return c.json({ success: true, data: ticket });
});

// Get tickets by conversation
tickets.get('/conversation/:conversationId', async (c) => {
  const conversationId = parseInt(c.req.param('conversationId'));
  const conversationTickets = await ticketRepository.getByConversation(conversationId);
  
  return c.json({ success: true, data: conversationTickets });
});

// Create ticket
tickets.post('/', validator(z.object({
  conversationId: z.number().int().positive().optional(),
  channelId: z.number().int().positive().optional(),
  title: z.string().min(1).max(255),
  description: z.string().min(1),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  createdBy: z.string().min(1),
  createdByName: z.string().optional(),
  category: z.string().optional(),
  metadata: z.record(z.any()).optional(),
})), async (c) => {
  const validated = c.get('validated');
  
  try {
    const ticket = await ticketRepository.create(validated);
    
    // Log ticket creation for developers
    logger.info(`[Ticket] New ticket created: ${ticket.ticketNumber}`, {
      ticketId: ticket.id,
      title: ticket.title,
      priority: ticket.priority,
      createdBy: ticket.createdBy,
      category: ticket.category,
    });

    // Here you can add notification logic (email, Slack, etc.) to notify developers
    // Example: await notifyDevelopers(ticket);
    
    return c.json({ success: true, data: ticket }, 201);
  } catch (error: any) {
    logger.error('[Ticket] Error creating ticket:', error);
    return c.json({ success: false, error: error.message || 'Failed to create ticket' }, 500);
  }
});

// Update ticket
tickets.patch('/:id', validator(z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().min(1).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  status: z.enum(['open', 'assigned', 'in_progress', 'resolved', 'closed']).optional(),
  assignedTo: z.string().optional(),
  assignedToName: z.string().optional(),
  category: z.string().optional(),
  metadata: z.record(z.any()).optional(),
})), async (c) => {
  const id = parseInt(c.req.param('id'));
  const validated = c.get('validated');
  
  await ticketRepository.update(id, validated);
  const updated = await ticketRepository.getById(id);
  
  return c.json({ success: true, data: updated });
});

// Delete ticket
tickets.delete('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  
  await ticketRepository.delete(id);
  return c.json({ success: true, message: 'Ticket deleted' });
});

// Get ticket comments
tickets.get('/:id/comments', async (c) => {
  const ticketId = parseInt(c.req.param('id'));
  const limit = parseInt(c.req.query('limit') || '50');
  const offset = parseInt(c.req.query('offset') || '0');
  
  const comments = await ticketRepository.getComments(ticketId, limit, offset);
  return c.json({ success: true, data: comments });
});

// Add comment to ticket
tickets.post('/:id/comments', validator(z.object({
  content: z.string().min(1),
  createdBy: z.string().min(1),
  createdByName: z.string().optional(),
  isInternal: z.boolean().optional(),
})), async (c) => {
  const ticketId = parseInt(c.req.param('id'));
  const validated = c.get('validated');
  
  const comment = await ticketRepository.addComment({
    ticketId,
    ...validated,
  });
  
  return c.json({ success: true, data: comment }, 201);
});

export default tickets;


