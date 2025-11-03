import { Client, LocalAuth, Message, MessageTypes } from 'whatsapp-web.js';
import * as qrcode from 'qrcode-terminal';
import { BaseChannelAdapter } from './base';
import type { IncomingMessage, StatusUpdate, SendMessageOptions } from '../types/channel';
import { logger } from '../config/logger';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

export class WhatsAppAdapter extends BaseChannelAdapter {
  private client: Client | null = null;
  private sessionPath: string;
  private messageListener?: (message: Message) => void;
  private statusListener?: (message: Message) => void;

  constructor(channelId: number) {
    super(channelId, 'whatsapp');
    const sessionDir = process.env.WHATSAPP_SESSION_PATH || './data/whatsapp-sessions';
    if (!existsSync(sessionDir)) {
      mkdirSync(sessionDir, { recursive: true });
    }
    this.sessionPath = sessionDir;
  }

  async initialize(): Promise<void> {
    try {
      logger.info('[WhatsApp] Initializing WhatsApp client...');

      this.client = new Client({
        authStrategy: new LocalAuth({
          dataPath: this.sessionPath,
        }),
        puppeteer: {
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
          ],
        },
      });

      this.client.on('qr', (qr) => {
        logger.info('[WhatsApp] QR Code generated. Please scan with your phone.');
        console.log('\n');
        qrcode.generate(qr, { small: true });
        console.log('\n');
      });

      this.client.on('ready', () => {
        logger.info('[WhatsApp] Client is ready!');
      });

      this.client.on('authenticated', () => {
        logger.info('[WhatsApp] Authenticated successfully');
      });

      this.client.on('auth_failure', (msg) => {
        logger.error('[WhatsApp] Authentication failed:', msg);
      });

      this.client.on('disconnected', (reason) => {
        logger.warn('[WhatsApp] Client disconnected:', reason);
      });

      // Setup message listener
      this.setupMessageListener(() => {});
      this.setupStatusListener(() => {});

      await this.client.initialize();
    } catch (error) {
      logger.error('[WhatsApp] Initialization error:', error);
      throw error;
    }
  }

  protected setupMessageListener(callback: (message: IncomingMessage) => Promise<void>): void {
    if (!this.client) return;

    // Remove existing listener if any
    if (this.messageListener) {
      this.client.removeListener('message', this.messageListener);
    }

    this.messageListener = async (message: Message) => {
      // Ignore own messages
      if (message.fromMe) return;

      try {
        const contact = await message.getContact();
        const chat = await message.getChat();

        const incomingMessage: IncomingMessage = {
          id: message.id._serialized,
          from: message.from,
          content: message.body,
          type: this.mapMessageType(message.type),
          timestamp: new Date(message.timestamp * 1000),
          metadata: {
            contactName: contact.pushname || contact.name,
            chatId: chat.id._serialized,
            isGroup: chat.isGroup,
          },
        };

        // Handle media messages
        if (message.hasMedia) {
          try {
            const media = await message.downloadMedia();
            // In production, you'd want to save this to a file storage service
            // For now, we'll store the media data in metadata
            incomingMessage.mediaUrl = `data:${media.mimetype};base64,${media.data}`;
            incomingMessage.content = message.caption || message.body || '[Media]';
          } catch (error) {
            logger.error('[WhatsApp] Error downloading media:', error);
          }
        }

        await this.handleIncomingMessage(incomingMessage);
        await callback(incomingMessage);
      } catch (error) {
        logger.error('[WhatsApp] Error processing message:', error);
      }
    };

    this.client.on('message', this.messageListener);
  }

  protected setupStatusListener(callback: (update: StatusUpdate) => Promise<void>): void {
    if (!this.client) return;

    // Remove existing listener if any
    if (this.statusListener) {
      this.client.removeListener('message_ack', this.statusListener);
    }

    this.statusListener = async (message: Message, ack: any) => {
      if (!message.fromMe) return;

      try {
        const statusUpdate: StatusUpdate = {
          messageId: message.id._serialized,
          status: this.mapAckToStatus(ack),
          timestamp: new Date(),
        };

        await this.handleStatusUpdate(statusUpdate);
        await callback(statusUpdate);
      } catch (error) {
        logger.error('[WhatsApp] Error processing status update:', error);
      }
    };

    this.client.on('message_ack', this.statusListener);
  }

  async sendMessage(to: string, message: string, options?: SendMessageOptions): Promise<string> {
    if (!this.client || !this.isConnected()) {
      throw new Error('WhatsApp client is not connected');
    }

    try {
      const chatId = to.includes('@c.us') || to.includes('@g.us') ? to : `${to}@c.us`;
      const sentMessage = await this.client.sendMessage(chatId, message);
      
      logger.info(`[WhatsApp] Message sent to ${to}: ${sentMessage.id._serialized}`);
      return sentMessage.id._serialized;
    } catch (error) {
      logger.error(`[WhatsApp] Error sending message to ${to}:`, error);
      throw error;
    }
  }

  async sendMedia(to: string, mediaUrl: string, caption?: string, type: string = 'image'): Promise<string> {
    if (!this.client || !this.isConnected()) {
      throw new Error('WhatsApp client is not connected');
    }

    try {
      const chatId = to.includes('@c.us') || to.includes('@g.us') ? to : `${to}@c.us`;
      
      let sentMessage;
      
      // Handle data URLs
      if (mediaUrl.startsWith('data:')) {
        const base64Data = mediaUrl.split(',')[1];
        const mimeType = mediaUrl.split(';')[0].split(':')[1];

        const { MessageMedia } = await import('whatsapp-web.js');
        const mediaObj = new MessageMedia(mimeType, base64Data);

        sentMessage = await this.client.sendMessage(chatId, mediaObj, { caption });
      } else {
        // Handle URLs - would need to download first
        throw new Error('URL-based media not yet implemented. Use data URLs.');
      }

      logger.info(`[WhatsApp] Media sent to ${to}: ${sentMessage.id._serialized}`);
      return sentMessage.id._serialized;
    } catch (error) {
      logger.error(`[WhatsApp] Error sending media to ${to}:`, error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      if (this.messageListener) {
        this.client.removeListener('message', this.messageListener);
      }
      if (this.statusListener) {
        this.client.removeListener('message_ack', this.statusListener);
      }
      await this.client.destroy();
      this.client = null;
      logger.info('[WhatsApp] Client disconnected');
    }
  }

  isConnected(): boolean {
    return this.client?.info !== undefined;
  }

  private mapMessageType(type: MessageTypes): string {
    const typeMap: Record<string, string> = {
      'text': 'text',
      'image': 'image',
      'video': 'video',
      'audio': 'audio',
      'document': 'document',
      'sticker': 'image',
      'location': 'location',
      'vcard': 'contact',
    };
    return typeMap[type] || 'text';
  }

  private mapAckToStatus(ack: any): 'sent' | 'delivered' | 'read' | 'failed' {
    switch (ack) {
      case 1: return 'sent';
      case 2: return 'delivered';
      case 3: return 'read';
      default: return 'sent';
    }
  }
}

