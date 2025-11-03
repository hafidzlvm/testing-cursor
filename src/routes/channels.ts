import { Hono } from 'hono';
import { channelRepository } from '../models';
import { channelManager } from '../services/channel-manager';
import { validator } from '../middleware/validator';
import { z } from 'zod';

const channels = new Hono();

// Get all channels
channels.get('/', async (c) => {
  const allChannels = await channelRepository.getAll();
  return c.json({ success: true, data: allChannels });
});

// Get channel by ID
channels.get('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  const channel = await channelRepository.getById(id);
  
  if (!channel) {
    return c.json({ success: false, error: 'Channel not found' }, 404);
  }
  
  return c.json({ success: true, data: channel });
});

// Create channel
channels.post('/', validator(z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  config: z.record(z.any()).optional(),
  isActive: z.boolean().optional(),
})), async (c) => {
  const validated = c.get('validated');
  const channel = await channelRepository.create(validated);
  return c.json({ success: true, data: channel }, 201);
});

// Update channel
channels.patch('/:id', validator(z.object({
  config: z.record(z.any()).optional(),
  isActive: z.boolean().optional(),
})), async (c) => {
  const id = parseInt(c.req.param('id'));
  const validated = c.get('validated');
  
  await channelRepository.update(id, validated);
  const updated = await channelRepository.getById(id);
  
  return c.json({ success: true, data: updated });
});

// Initialize channel
channels.post('/:id/initialize', async (c) => {
  const id = parseInt(c.req.param('id'));
  
  try {
    await channelManager.initializeChannel(id);
    return c.json({ success: true, message: 'Channel initialized successfully' });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 400);
  }
});

// Send message via channel
channels.post('/:id/send', validator(z.object({
  to: z.string().min(1),
  message: z.string().min(1),
  type: z.enum(['text', 'image', 'video', 'audio', 'document']).optional(),
  mediaUrl: z.string().url().optional(),
  caption: z.string().optional(),
})), async (c) => {
  const channelId = parseInt(c.req.param('id'));
  const validated = c.get('validated');
  
  const adapter = channelManager.getAdapter(channelId);
  if (!adapter) {
    return c.json({ success: false, error: 'Channel not initialized' }, 400);
  }

  try {
    let messageId: string;
    
    if (validated.mediaUrl) {
      messageId = await adapter.sendMedia(
        validated.to,
        validated.mediaUrl,
        validated.caption,
        validated.type || 'image'
      );
    } else {
      messageId = await adapter.sendMessage(validated.to, validated.message);
    }

    return c.json({ success: true, data: { messageId } });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default channels;

