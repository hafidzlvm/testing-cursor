import { Hono } from 'hono';
import { noteRepository } from '../models/notes';
import { validator } from '../middleware/validator';
import { z } from 'zod';

const notes = new Hono();

// Get notes for a conversation
notes.get('/conversation/:conversationId', async (c) => {
  const conversationId = parseInt(c.req.param('conversationId'));
  const limit = parseInt(c.req.query('limit') || '50');
  const offset = parseInt(c.req.query('offset') || '0');
  
  const conversationNotes = await noteRepository.getByConversation(conversationId, limit, offset);
  return c.json({ success: true, data: conversationNotes });
});

// Get note by ID
notes.get('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  const note = await noteRepository.getById(id);
  
  if (!note) {
    return c.json({ success: false, error: 'Note not found' }, 404);
  }
  
  return c.json({ success: true, data: note });
});

// Create note
notes.post('/', validator(z.object({
  conversationId: z.number().int().positive(),
  content: z.string().min(1),
  createdBy: z.string().min(1),
  createdByName: z.string().optional(),
  isInternal: z.boolean().optional(),
})), async (c) => {
  const validated = c.get('validated');
  const note = await noteRepository.create(validated);
  return c.json({ success: true, data: note }, 201);
});

// Update note
notes.patch('/:id', validator(z.object({
  content: z.string().min(1).optional(),
  isInternal: z.boolean().optional(),
})), async (c) => {
  const id = parseInt(c.req.param('id'));
  const validated = c.get('validated');
  
  await noteRepository.update(id, validated);
  const updated = await noteRepository.getById(id);
  
  return c.json({ success: true, data: updated });
});

// Delete note
notes.delete('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  
  await noteRepository.delete(id);
  return c.json({ success: true, message: 'Note deleted' });
});

export default notes;


