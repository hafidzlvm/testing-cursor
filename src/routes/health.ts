import { Hono } from 'hono';
import { channelManager } from '../services/channel-manager';
import { channelRepository } from '../models';

const health = new Hono();

health.get('/', async (c) => {
  const channels = await channelRepository.getAll();
  const activeChannels = channels.filter(c => c.isActive);
  
  const channelStatuses = await Promise.all(
    activeChannels.map(async (channel) => {
      const adapter = channelManager.getAdapter(channel.id);
      return {
        id: channel.id,
        name: channel.name,
        isConnected: adapter ? adapter.isConnected() : false,
      };
    })
  );

  return c.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    channels: channelStatuses,
  });
});

export default health;

