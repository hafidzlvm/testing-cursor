import { Hono } from 'hono';
import { conversationRepository, messageRepository } from '../models';
import { tagRepository } from '../models/tags';
import { validator } from '../middleware/validator';
import { createConversationSchema, updateConversationSchema, queryParamsSchema } from '../utils/validation';

const conversations = new Hono();

// Get all conversations
conversations.get('/', validator(queryParamsSchema), async (c) => {
  const validated = c.get('validated');
  const limit = validated.limit || 50;
  const offset = validated.offset || 0;
  const status = c.req.query('status');
  const assignedTo = c.req.query('assigned_to');
  
  let allConversations;
  if (status) {
    allConversations = await conversationRepository.getByStatus(status, limit, offset);
  } else if (assignedTo) {
    allConversations = await conversationRepository.getByAssignedTo(assignedTo, limit, offset);
  } else {
    allConversations = await conversationRepository.getAll(limit, offset);
  }
  
  // Enrich with tags
  const enriched = await Promise.all(
    allConversations.map(async (conv) => {
      const tags = await tagRepository.getConversationTags(conv.id);
      return { ...conv, tags };
    })
  );
  
  return c.json({ success: true, data: enriched });
});

// Get conversation by ID (with tags)
conversations.get('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  const conversation = await conversationRepository.getById(id);
  
  if (!conversation) {
    return c.json({ success: false, error: 'Conversation not found' }, 404);
  }
  
  // Get tags for this conversation
  const tags = await tagRepository.getConversationTags(id);
  
  return c.json({ success: true, data: { ...conversation, tags } });
});

// Get messages in a conversation
conversations.get('/:id/messages', validator(queryParamsSchema), async (c) => {
  const conversationId = parseInt(c.req.param('id'));
  const validated = c.get('validated');
  const limit = validated.limit || 50;
  const offset = validated.offset || 0;
  
  const messages = await messageRepository.getByConversation(conversationId, limit, offset);
  return c.json({ success: true, data: messages });
});

// Create conversation
conversations.post('/', validator(createConversationSchema), async (c) => {
  const validated = c.get('validated');
  const conversation = await conversationRepository.create(validated);
  return c.json({ success: true, data: conversation }, 201);
});

// Update conversation
conversations.patch('/:id', validator(updateConversationSchema), async (c) => {
  const id = parseInt(c.req.param('id'));
  const validated = c.get('validated');
  
  await conversationRepository.update(id, validated);
  const updated = await conversationRepository.getById(id);
  
  return c.json({ success: true, data: updated });
});

export default conversations;

