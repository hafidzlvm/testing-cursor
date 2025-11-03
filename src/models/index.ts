import { db } from '../config/database';
import { channels, conversations, messages, type Channel, type Conversation, type Message } from './schema';
import { eq, desc, and } from 'drizzle-orm';

// Channel operations
export const channelRepository = {
  async getAll(): Promise<Channel[]> {
    return db.select().from(channels);
  },

  async getById(id: number): Promise<Channel | undefined> {
    const result = await db.select().from(channels).where(eq(channels.id, id)).limit(1);
    return result[0];
  },

  async getByName(name: string): Promise<Channel | undefined> {
    const result = await db.select().from(channels).where(eq(channels.name, name)).limit(1);
    return result[0];
  },

  async create(data: { name: string; type: string; config?: any; isActive?: boolean }): Promise<Channel> {
    const result = await db.insert(channels).values({
      name: data.name,
      type: data.type,
      config: data.config ? JSON.stringify(data.config) : null,
      isActive: data.isActive ?? true,
    }).returning();
    return result[0];
  },

  async update(id: number, data: Partial<{ config: any; isActive: boolean }>): Promise<void> {
    await db.update(channels)
      .set({
        ...data,
        config: data.config ? JSON.stringify(data.config) : undefined,
        updatedAt: new Date(),
      })
      .where(eq(channels.id, id));
  },
};

// Conversation operations
export const conversationRepository = {
  async getById(id: number): Promise<Conversation | undefined> {
    const result = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1);
    return result[0];
  },

  async getByExternalId(channelId: number, externalId: string): Promise<Conversation | undefined> {
    const result = await db.select()
      .from(conversations)
      .where(and(eq(conversations.channelId, channelId), eq(conversations.externalId, externalId)))
      .limit(1);
    return result[0];
  },

  async getAll(limit = 50, offset = 0): Promise<Conversation[]> {
    return db.select()
      .from(conversations)
      .orderBy(desc(conversations.lastMessageAt))
      .limit(limit)
      .offset(offset);
  },

  async create(data: {
    channelId: number;
    externalId: string;
    contactName?: string;
    contactInfo?: any;
    metadata?: any;
  }): Promise<Conversation> {
    const result = await db.insert(conversations).values({
      channelId: data.channelId,
      externalId: data.externalId,
      contactName: data.contactName,
      contactInfo: data.contactInfo ? JSON.stringify(data.contactInfo) : null,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
    }).returning();
    return result[0];
  },

  async update(id: number, data: Partial<{
    status: string;
    contactName: string;
    contactInfo: any;
    metadata: any;
    lastMessageAt: Date;
    assignedTo?: string;
    assignedToName?: string;
  }>): Promise<void> {
    // For SQLite compatibility, we need to handle assigned_to separately
    const updateData: any = {
      ...data,
      contactInfo: data.contactInfo ? JSON.stringify(data.contactInfo) : undefined,
      metadata: data.metadata ? JSON.stringify(data.metadata) : undefined,
      updatedAt: new Date(),
    };

    // If assignedTo is being updated, add it to metadata for SQLite
    if (data.assignedTo !== undefined || data.assignedToName !== undefined) {
      const current = await this.getById(id);
      const currentMetadata = current?.metadata || {};
      if (typeof currentMetadata === 'string') {
        updateData.metadata = JSON.stringify({
          ...JSON.parse(currentMetadata),
          assigned_to: data.assignedTo,
          assigned_to_name: data.assignedToName,
        });
      } else {
        updateData.metadata = JSON.stringify({
          ...currentMetadata,
          assigned_to: data.assignedTo,
          assigned_to_name: data.assignedToName,
        });
      }
    }

    await db.update(conversations)
      .set(updateData)
      .where(eq(conversations.id, id));
  },

  async getByStatus(status: string, limit = 50, offset = 0): Promise<Conversation[]> {
    return db.select()
      .from(conversations)
      .where(eq(conversations.status, status))
      .orderBy(desc(conversations.lastMessageAt))
      .limit(limit)
      .offset(offset);
  },

  async getByAssignedTo(assignedTo: string, limit = 50, offset = 0): Promise<Conversation[]> {
    // For SQLite, assigned_to is in metadata JSON
    // This is a simplified version - for PostgreSQL, use proper column
    const all = await this.getAll(limit * 2, offset);
    return all.filter((conv) => {
      const metadata = typeof conv.metadata === 'string' 
        ? JSON.parse(conv.metadata) 
        : conv.metadata;
      return metadata?.assigned_to === assignedTo;
    }).slice(0, limit);
  },
};

// Message operations
export const messageRepository = {
  async getById(id: number): Promise<Message | undefined> {
    const result = await db.select().from(messages).where(eq(messages.id, id)).limit(1);
    return result[0];
  },

  async getByConversation(conversationId: number, limit = 50, offset = 0): Promise<Message[]> {
    return db.select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.createdAt))
      .limit(limit)
      .offset(offset);
  },

  async create(data: {
    conversationId: number;
    channelId: number;
    externalMessageId?: string;
    direction: 'inbound' | 'outbound';
    type: string;
    content: string;
    mediaUrl?: string;
    status?: string;
    metadata?: any;
  }): Promise<Message> {
    const result = await db.insert(messages).values({
      conversationId: data.conversationId,
      channelId: data.channelId,
      externalMessageId: data.externalMessageId,
      direction: data.direction,
      type: data.type,
      content: data.content,
      mediaUrl: data.mediaUrl,
      status: data.status || 'sent',
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
    }).returning();
    return result[0];
  },

  async updateStatus(id: number, status: string): Promise<void> {
    await db.update(messages)
      .set({ status, updatedAt: new Date() })
      .where(eq(messages.id, id));
  },
};

