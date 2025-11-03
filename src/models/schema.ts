import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Channels enum (WhatsApp, Telegram, etc.)
export const channels = sqliteTable('channels', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(), // whatsapp, telegram, etc.
  type: text('type').notNull(), // messaging, voice, video, etc.
  config: text('config', { mode: 'json' }), // Channel-specific configuration
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

// Conversations
export const conversations = sqliteTable('conversations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  channelId: integer('channel_id').notNull().references(() => channels.id),
  externalId: text('external_id').notNull(), // ID dari channel (phone number, user ID, etc.)
  contactName: text('contact_name'),
  contactInfo: text('contact_info', { mode: 'json' }), // Additional contact info
  status: text('status').notNull().default('open'), // open, closed, archived
  metadata: text('metadata', { mode: 'json' }), // Additional metadata
  lastMessageAt: integer('last_message_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

// Messages
export const messages = sqliteTable('messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  conversationId: integer('conversation_id').notNull().references(() => conversations.id),
  channelId: integer('channel_id').notNull().references(() => channels.id),
  externalMessageId: text('external_message_id'), // Message ID dari channel
  direction: text('direction').notNull(), // inbound, outbound
  type: text('type').notNull().default('text'), // text, image, video, audio, document, etc.
  content: text('content').notNull(),
  mediaUrl: text('media_url'), // URL untuk media files
  status: text('status').notNull().default('sent'), // sent, delivered, read, failed
  metadata: text('metadata', { mode: 'json' }), // Additional message metadata
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

// Indexes for better query performance
export type Channel = typeof channels.$inferSelect;
export type NewChannel = typeof channels.$inferInsert;
export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;

