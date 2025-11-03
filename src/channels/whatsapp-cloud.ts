import { BaseChannelAdapter } from './base';
import type { IncomingMessage, StatusUpdate, SendMessageOptions } from '../types/channel';
import { logger } from '../config/logger';
import { messageRepository, conversationRepository } from '../models';

/**
 * WhatsApp Cloud API Adapter (Official WhatsApp Business API)
 * 
 * This adapter uses the official WhatsApp Cloud API provided by Meta.
 * Documentation: https://developers.facebook.com/docs/whatsapp/cloud-api
 * 
 * Required Environment Variables:
 * - WHATSAPP_API_TOKEN: Your WhatsApp API access token
 * - WHATSAPP_PHONE_NUMBER_ID: Your WhatsApp Business phone number ID
 * - WHATSAPP_BUSINESS_ACCOUNT_ID: Your WhatsApp Business Account ID
 * - WHATSAPP_APP_ID: Your WhatsApp App ID
 * - WHATSAPP_APP_SECRET: Your WhatsApp App Secret
 * - WHATSAPP_VERIFY_TOKEN: Webhook verification token
 * - WHATSAPP_WEBHOOK_URL: Your webhook URL for receiving messages
 */
export class WhatsAppCloudAdapter extends BaseChannelAdapter {
  private apiToken: string;
  private phoneNumberId: string;
  private businessAccountId: string;
  private apiVersion: string = 'v21.0';
  private baseUrl: string = 'https://graph.facebook.com';
  private webhookUrl?: string;
  private verifyToken: string;

  constructor(channelId: number) {
    super(channelId, 'whatsapp-cloud');
    
    this.apiToken = process.env.WHATSAPP_API_TOKEN || '';
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
    this.businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '';
    this.webhookUrl = process.env.WHATSAPP_WEBHOOK_URL;
    this.verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'your-webhook-verify-token';
    this.apiVersion = process.env.WHATSAPP_API_VERSION || 'v21.0';

    if (!this.apiToken || !this.phoneNumberId) {
      logger.warn('[WhatsApp Cloud] Missing required environment variables. Please set WHATSAPP_API_TOKEN and WHATSAPP_PHONE_NUMBER_ID');
    }
  }

  async initialize(): Promise<void> {
    try {
      logger.info('[WhatsApp Cloud] Initializing WhatsApp Cloud API...');

      // Verify configuration
      if (!this.apiToken || !this.phoneNumberId) {
        throw new Error('Missing required WhatsApp Cloud API credentials');
      }

      // Verify phone number
      await this.verifyPhoneNumber();

      // Setup webhook if URL is provided
      if (this.webhookUrl) {
        await this.setupWebhook();
      }

      logger.info('[WhatsApp Cloud] WhatsApp Cloud API initialized successfully');
    } catch (error: any) {
      logger.error('[WhatsApp Cloud] Initialization error:', error);
      throw error;
    }
  }

  protected setupMessageListener(callback: (message: IncomingMessage) => Promise<void>): void {
    // Webhook will handle incoming messages
    logger.info('[WhatsApp Cloud] Message listener setup - messages will be received via webhook');
  }

  protected setupStatusListener(callback: (update: StatusUpdate) => Promise<void>): void {
    // Webhook will handle status updates
    logger.info('[WhatsApp Cloud] Status listener setup - status updates will be received via webhook');
  }

  async sendMessage(to: string, message: string, options?: SendMessageOptions): Promise<string> {
    try {
      const url = `${this.baseUrl}/${this.apiVersion}/${this.phoneNumberId}/messages`;
      
      // Format phone number (remove + and ensure proper format)
      const formattedPhone = this.formatPhoneNumber(to);

      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedPhone,
        type: options?.type || 'text',
        text: {
          preview_url: false,
          body: message,
        },
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`WhatsApp API Error: ${JSON.stringify(error)}`);
      }

      const data = await response.json();
      const messageId = data.messages[0]?.id;

      logger.info(`[WhatsApp Cloud] Message sent to ${to}: ${messageId}`);
      
      // Save message to database
      await this.saveOutboundMessage(to, messageId, message, options);

      return messageId;
    } catch (error: any) {
      logger.error(`[WhatsApp Cloud] Error sending message to ${to}:`, error);
      throw error;
    }
  }

  async sendMedia(to: string, mediaUrl: string, caption?: string, type: string = 'image'): Promise<string> {
    try {
      // First, upload media to WhatsApp servers
      const mediaId = await this.uploadMedia(mediaUrl, type);

      const url = `${this.baseUrl}/${this.apiVersion}/${this.phoneNumberId}/messages`;
      const formattedPhone = this.formatPhoneNumber(to);

      const payload: any = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedPhone,
        type: type,
      };

      if (type === 'image') {
        payload.image = { id: mediaId, caption };
      } else if (type === 'video') {
        payload.video = { id: mediaId, caption };
      } else if (type === 'audio') {
        payload.audio = { id: mediaId };
      } else if (type === 'document') {
        payload.document = { id: mediaId, caption };
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`WhatsApp API Error: ${JSON.stringify(error)}`);
      }

      const data = await response.json();
      const messageId = data.messages[0]?.id;

      logger.info(`[WhatsApp Cloud] Media sent to ${to}: ${messageId}`);
      
      return messageId;
    } catch (error: any) {
      logger.error(`[WhatsApp Cloud] Error sending media to ${to}:`, error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    logger.info('[WhatsApp Cloud] Disconnecting...');
    // No persistent connection to disconnect for REST API
  }

  isConnected(): boolean {
    return !!(this.apiToken && this.phoneNumberId);
  }

  /**
   * Handle incoming webhook from WhatsApp Cloud API
   * This should be called from your webhook endpoint
   */
  async handleWebhook(body: any): Promise<void> {
    try {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      if (!value) return;

      // Handle incoming messages
      if (value.messages) {
        for (const message of value.messages) {
          await this.processIncomingMessage(message);
        }
      }

      // Handle status updates
      if (value.statuses) {
        for (const status of value.statuses) {
          await this.processStatusUpdate(status);
        }
      }
    } catch (error) {
      logger.error('[WhatsApp Cloud] Error handling webhook:', error);
      throw error;
    }
  }

  /**
   * Verify webhook (for webhook setup)
   */
  verifyWebhook(mode: string, token: string, challenge: string): string | null {
    if (mode === 'subscribe' && token === this.verifyToken) {
      return challenge;
    }
    return null;
  }

  private async processIncomingMessage(message: any): Promise<void> {
    const from = message.from;
    const messageId = message.id;
    const timestamp = new Date(parseInt(message.timestamp) * 1000);

    let content = '';
    let type = 'text';
    let mediaUrl: string | undefined;

    // Determine message type and extract content
    if (message.text) {
      content = message.text.body;
      type = 'text';
    } else if (message.image) {
      content = message.image.caption || '[Image]';
      type = 'image';
      mediaUrl = message.image.id;
    } else if (message.video) {
      content = message.video.caption || '[Video]';
      type = 'video';
      mediaUrl = message.video.id;
    } else if (message.audio) {
      content = '[Audio]';
      type = 'audio';
      mediaUrl = message.audio.id;
    } else if (message.document) {
      content = message.document.caption || '[Document]';
      type = 'document';
      mediaUrl = message.document.id;
    } else if (message.location) {
      content = `Location: ${message.location.latitude}, ${message.location.longitude}`;
      type = 'location';
    } else if (message.contacts) {
      content = '[Contact]';
      type = 'contact';
    }

    const incomingMessage: IncomingMessage = {
      id: messageId,
      from: from,
      content: content,
      type: type,
      timestamp: timestamp,
      mediaUrl: mediaUrl,
      metadata: {
        messageId: messageId,
        timestamp: message.timestamp,
      },
    };

    await this.handleIncomingMessage(incomingMessage);
  }

  private async processStatusUpdate(status: any): Promise<void> {
    const statusUpdate: StatusUpdate = {
      messageId: status.id,
      status: this.mapStatusToEnum(status.status),
      timestamp: new Date(parseInt(status.timestamp) * 1000),
    };

    await this.handleStatusUpdate(statusUpdate);
  }

  private async saveOutboundMessage(
    to: string,
    messageId: string,
    content: string,
    options?: SendMessageOptions
  ): Promise<void> {
    try {
      let conversation = await conversationRepository.getByExternalId(this.channelId, to);
      
      if (!conversation) {
        conversation = await conversationRepository.create({
          channelId: this.channelId,
          externalId: to,
          contactName: to,
        });
      }

      await messageRepository.create({
        conversationId: conversation.id,
        channelId: this.channelId,
        externalMessageId: messageId,
        direction: 'outbound',
        type: options?.type || 'text',
        content: content,
        mediaUrl: options?.mediaUrl,
        status: 'sent',
        metadata: options?.metadata,
      });
    } catch (error) {
      logger.error('[WhatsApp Cloud] Error saving outbound message:', error);
    }
  }

  private async verifyPhoneNumber(): Promise<void> {
    const url = `${this.baseUrl}/${this.apiVersion}/${this.phoneNumberId}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to verify phone number');
    }

    const data = await response.json();
    logger.info(`[WhatsApp Cloud] Phone number verified: ${data.display_phone_number}`);
  }

  private async setupWebhook(): Promise<void> {
    logger.info('[WhatsApp Cloud] Webhook setup should be done via Meta Business Manager or Graph API');
    logger.info(`[WhatsApp Cloud] Webhook URL: ${this.webhookUrl}`);
    logger.info(`[WhatsApp Cloud] Verify Token: ${this.verifyToken}`);
  }

  private async uploadMedia(mediaUrl: string, type: string): Promise<string> {
    // For URL-based media, you need to upload to WhatsApp servers first
    // This is a simplified version - in production, handle media upload properly
    
    if (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://')) {
      // Upload media URL to WhatsApp
      const url = `${this.baseUrl}/${this.apiVersion}/${this.phoneNumberId}/media`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          type: type,
          url: mediaUrl,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to upload media');
      }

      const data = await response.json();
      return data.id;
    } else {
      throw new Error('Media URL must be a valid HTTP/HTTPS URL');
    }
  }

  private formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters except +
    let cleaned = phone.replace(/[^\d+]/g, '');
    
    // Remove + if present
    cleaned = cleaned.replace(/^\+/, '');
    
    // Ensure it's a valid international format
    return cleaned;
  }

  private mapStatusToEnum(status: string): 'sent' | 'delivered' | 'read' | 'failed' {
    const statusMap: Record<string, 'sent' | 'delivered' | 'read' | 'failed'> = {
      'sent': 'sent',
      'delivered': 'delivered',
      'read': 'read',
      'failed': 'failed',
    };
    return statusMap[status] || 'sent';
  }
}

