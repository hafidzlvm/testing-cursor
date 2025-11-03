import type { IChannelAdapter, IncomingMessage, StatusUpdate } from '../types/channel';
import { logger } from '../config/logger';
import { messageRepository, conversationRepository } from '../models';

export abstract class BaseChannelAdapter implements IChannelAdapter {
  protected channelId: number;
  protected channelName: string;
  protected messageHandlers: Array<(message: IncomingMessage) => Promise<void>> = [];
  protected statusHandlers: Array<(update: StatusUpdate) => Promise<void>> = [];

  constructor(channelId: number, channelName: string) {
    this.channelId = channelId;
    this.channelName = channelName;
  }

  abstract initialize(): Promise<void>;
  abstract sendMessage(to: string, message: string, options?: any): Promise<string>;
  abstract sendMedia(to: string, mediaUrl: string, caption?: string, type?: string): Promise<string>;
  abstract disconnect(): Promise<void>;
  abstract isConnected(): boolean;

  onMessage(callback: (message: IncomingMessage) => Promise<void>): void {
    this.messageHandlers.push(callback);
    this.setupMessageListener(callback);
  }

  onStatusUpdate(callback: (update: StatusUpdate) => Promise<void>): void {
    this.statusHandlers.push(callback);
    this.setupStatusListener(callback);
  }

  protected abstract setupMessageListener(callback: (message: IncomingMessage) => Promise<void>): void;
  protected abstract setupStatusListener(callback: (update: StatusUpdate) => Promise<void>): void;

  protected async handleIncomingMessage(message: IncomingMessage): Promise<void> {
    try {
      logger.info(`[${this.channelName}] Incoming message from ${message.from}`, { messageId: message.id });

      // Find or create conversation
      let conversation = await conversationRepository.getByExternalId(this.channelId, message.from);
      
      if (!conversation) {
        conversation = await conversationRepository.create({
          channelId: this.channelId,
          externalId: message.from,
          contactName: message.from,
          metadata: message.metadata,
        });
      }

      // Save message to database
      await messageRepository.create({
        conversationId: conversation.id,
        channelId: this.channelId,
        externalMessageId: message.id,
        direction: 'inbound',
        type: message.type,
        content: message.content,
        mediaUrl: message.mediaUrl,
        metadata: message.metadata,
        status: 'delivered',
      });

      // Update conversation last message time
      await conversationRepository.update(conversation.id, {
        lastMessageAt: message.timestamp,
      });

      // Call registered handlers
      for (const handler of this.messageHandlers) {
        await handler(message);
      }
    } catch (error) {
      logger.error(`[${this.channelName}] Error handling incoming message:`, error);
    }
  }

  protected async handleStatusUpdate(update: StatusUpdate): Promise<void> {
    try {
      logger.debug(`[${this.channelName}] Status update: ${update.messageId} -> ${update.status}`);

      // Update message status in database if we have the message
      // Note: This assumes externalMessageId matches what we stored
      // In production, you might want a mapping table

      // Call registered handlers
      for (const handler of this.statusHandlers) {
        await handler(update);
      }
    } catch (error) {
      logger.error(`[${this.channelName}] Error handling status update:`, error);
    }
  }
}

