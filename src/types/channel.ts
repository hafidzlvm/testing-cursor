export interface IChannel {
  id: number;
  name: string;
  type: string;
  isActive: boolean;
}

export interface IChannelAdapter {
  initialize(): Promise<void>;
  sendMessage(to: string, message: string, options?: SendMessageOptions): Promise<string>;
  sendMedia(to: string, mediaUrl: string, caption?: string, type?: MediaType): Promise<string>;
  onMessage(callback: (message: IncomingMessage) => Promise<void>): void;
  onStatusUpdate(callback: (update: StatusUpdate) => Promise<void>): void;
  disconnect(): Promise<void>;
  isConnected(): boolean;
}

export interface SendMessageOptions {
  type?: 'text' | 'image' | 'video' | 'audio' | 'document';
  mediaUrl?: string;
  caption?: string;
  metadata?: Record<string, any>;
}

export type MediaType = 'image' | 'video' | 'audio' | 'document';

export interface IncomingMessage {
  id: string;
  from: string;
  content: string;
  type: string;
  timestamp: Date;
  mediaUrl?: string;
  metadata?: Record<string, any>;
}

export interface StatusUpdate {
  messageId: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: Date;
}

export interface ChannelConfig {
  [key: string]: any;
}

