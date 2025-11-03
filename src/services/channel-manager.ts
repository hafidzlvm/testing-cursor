import { channelRepository } from '../models';
import { WhatsAppAdapter } from '../channels/whatsapp';
import { WhatsAppCloudAdapter } from '../channels/whatsapp-cloud';
import type { IChannelAdapter } from '../types/channel';
import { logger } from '../config/logger';

class ChannelManager {
  private adapters: Map<number, IChannelAdapter> = new Map();

  async initializeChannel(channelId: number): Promise<void> {
    const channel = await channelRepository.getById(channelId);
    if (!channel) {
      throw new Error(`Channel with id ${channelId} not found`);
    }

    if (!channel.isActive) {
      throw new Error(`Channel ${channel.name} is not active`);
    }

    if (this.adapters.has(channelId)) {
      logger.warn(`Channel ${channel.name} (${channelId}) already initialized`);
      return;
    }

    let adapter: IChannelAdapter;
    const channelName = channel.name.toLowerCase();
    const channelConfig = typeof channel.config === 'string' 
      ? JSON.parse(channel.config) 
      : channel.config || {};

    switch (channelName) {
      case 'whatsapp':
        // Use WhatsApp Cloud API if configured, otherwise use whatsapp-web.js
        if (channelConfig.useCloudAPI || process.env.WHATSAPP_USE_CLOUD_API === 'true') {
          adapter = new WhatsAppCloudAdapter(channelId);
          logger.info(`Using WhatsApp Cloud API (Official) for channel ${channelId}`);
        } else {
          adapter = new WhatsAppAdapter(channelId);
          logger.info(`Using whatsapp-web.js (Unofficial) for channel ${channelId}`);
        }
        break;
      case 'whatsapp-cloud':
        adapter = new WhatsAppCloudAdapter(channelId);
        break;
      default:
        throw new Error(`Unknown channel type: ${channel.name}`);
    }

    await adapter.initialize();
    this.adapters.set(channelId, adapter);
    logger.info(`Channel ${channel.name} (${channelId}) initialized successfully`);
  }

  async initializeAllChannels(): Promise<void> {
    const channels = await channelRepository.getAll();
    const activeChannels = channels.filter(c => c.isActive);

    logger.info(`Initializing ${activeChannels.length} active channels...`);

    for (const channel of activeChannels) {
      try {
        await this.initializeChannel(channel.id);
      } catch (error) {
        logger.error(`Failed to initialize channel ${channel.name}:`, error);
      }
    }
  }

  getAdapter(channelId: number): IChannelAdapter | undefined {
    return this.adapters.get(channelId);
  }

  async removeChannel(channelId: number): Promise<void> {
    const adapter = this.adapters.get(channelId);
    if (adapter) {
      await adapter.disconnect();
      this.adapters.delete(channelId);
      logger.info(`Channel ${channelId} removed`);
    }
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down all channels...');
    const promises = Array.from(this.adapters.values()).map(adapter => adapter.disconnect());
    await Promise.all(promises);
    this.adapters.clear();
  }
}

export const channelManager = new ChannelManager();

