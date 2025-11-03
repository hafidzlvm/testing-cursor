import { Hono } from 'hono';
import { tagRepository } from '../models/tags';
import { validator } from '../middleware/validator';
import { z } from 'zod';

const tags = new Hono();

// Get all tags
tags.get('/', async (c) => {
  const activeOnly = c.req.query('active_only') === 'true';
  const allTags = await tagRepository.getAll(activeOnly);
  return c.json({ success: true, data: allTags });
});

// Get tag by ID
tags.get('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  const tag = await tagRepository.getById(id);
  
  if (!tag) {
    return c.json({ success: false, error: 'Tag not found' }, 404);
  }
  
  return c.json({ success: true, data: tag });
});

// Create tag
tags.post('/', validator(z.object({
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
})), async (c) => {
  const validated = c.get('validated');
  const tag = await tagRepository.create(validated);
  return c.json({ success: true, data: tag }, 201);
});

// Update tag
tags.patch('/:id', validator(z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
})), async (c) => {
  const id = parseInt(c.req.param('id'));
  const validated = c.get('validated');
  
  await tagRepository.update(id, validated);
  const updated = await tagRepository.getById(id);
  
  return c.json({ success: true, data: updated });
});

// Delete tag
tags.delete('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  
  await tagRepository.delete(id);
  return c.json({ success: true, message: 'Tag deleted' });
});

// Get tags for a conversation
tags.get('/conversation/:conversationId', async (c) => {
  const conversationId = parseInt(c.req.param('conversationId'));
  const conversationTags = await tagRepository.getConversationTags(conversationId);
  
  return c.json({ success: true, data: conversationTags });
});

// Add tag to conversation
tags.post('/conversation/:conversationId/:tagId', async (c) => {
  const conversationId = parseInt(c.req.param('conversationId'));
  const tagId = parseInt(c.req.param('tagId'));
  
  await tagRepository.addToConversation(conversationId, tagId);
  return c.json({ success: true, message: 'Tag added to conversation' });
});

// Remove tag from conversation
tags.delete('/conversation/:conversationId/:tagId', async (c) => {
  const conversationId = parseInt(c.req.param('conversationId'));
  const tagId = parseInt(c.req.param('tagId'));
  
  await tagRepository.removeFromConversation(conversationId, tagId);
  return c.json({ success: true, message: 'Tag removed from conversation' });
});

export default tags;


