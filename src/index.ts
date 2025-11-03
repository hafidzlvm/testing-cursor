import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { logger } from './config/logger';
import { db } from './config/database';
import { channelManager } from './services/channel-manager';
import { channelRepository } from './models';
import { errorHandler } from './middleware/error-handler';
import channels from './routes/channels';
import conversations from './routes/conversations';
import health from './routes/health';
import webhooks from './routes/webhooks';
import tags from './routes/tags';
import notes from './routes/notes';
import tickets from './routes/tickets';

// Initialize database schema
async function initializeDatabase() {
  try {
    const Database = (await import('better-sqlite3')).default;
    const dbPath = process.env.DATABASE_PATH || './data/omnichannel.db';
    const sqlite = new Database(dbPath);
    
    // Create tables if they don't exist
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS channels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL,
        config TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      );

      CREATE TABLE IF NOT EXISTS conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        channel_id INTEGER NOT NULL REFERENCES channels(id),
        external_id TEXT NOT NULL,
        contact_name TEXT,
        contact_info TEXT,
        status TEXT NOT NULL DEFAULT 'open',
        metadata TEXT,
        last_message_at INTEGER,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
        UNIQUE(channel_id, external_id)
      );

      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id INTEGER NOT NULL REFERENCES conversations(id),
        channel_id INTEGER NOT NULL REFERENCES channels(id),
        external_message_id TEXT,
        direction TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'text',
        content TEXT NOT NULL,
        media_url TEXT,
        status TEXT NOT NULL DEFAULT 'sent',
        metadata TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      );

      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        color TEXT,
        description TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      );

      CREATE TABLE IF NOT EXISTS conversation_tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id INTEGER NOT NULL REFERENCES conversations(id),
        tag_id INTEGER NOT NULL REFERENCES tags(id),
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        UNIQUE(conversation_id, tag_id)
      );

      CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id INTEGER NOT NULL REFERENCES conversations(id),
        content TEXT NOT NULL,
        created_by TEXT NOT NULL,
        created_by_name TEXT,
        is_internal INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      );

      CREATE TABLE IF NOT EXISTS tickets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_number TEXT NOT NULL UNIQUE,
        conversation_id INTEGER REFERENCES conversations(id),
        channel_id INTEGER REFERENCES channels(id),
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        priority TEXT NOT NULL DEFAULT 'medium',
        status TEXT NOT NULL DEFAULT 'open',
        assigned_to TEXT,
        assigned_to_name TEXT,
        created_by TEXT NOT NULL,
        created_by_name TEXT,
        category TEXT,
        metadata TEXT,
        resolved_at INTEGER,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      );

      CREATE TABLE IF NOT EXISTS ticket_comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_id INTEGER NOT NULL REFERENCES tickets(id),
        content TEXT NOT NULL,
        created_by TEXT NOT NULL,
        created_by_name TEXT,
        is_internal INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      );

      CREATE INDEX IF NOT EXISTS idx_conversations_channel_external 
      ON conversations(channel_id, external_id);
      CREATE INDEX IF NOT EXISTS idx_conversations_status 
      ON conversations(status);
      CREATE INDEX IF NOT EXISTS idx_messages_conversation 
      ON messages(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_messages_channel 
      ON messages(channel_id);
      CREATE INDEX IF NOT EXISTS idx_tags_name 
      ON tags(name);
      CREATE INDEX IF NOT EXISTS idx_conversation_tags_conversation_id 
      ON conversation_tags(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_conversation_tags_tag_id 
      ON conversation_tags(tag_id);
      CREATE INDEX IF NOT EXISTS idx_notes_conversation_id 
      ON notes(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_tickets_ticket_number 
      ON tickets(ticket_number);
      CREATE INDEX IF NOT EXISTS idx_tickets_status 
      ON tickets(status);
      CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to 
      ON tickets(assigned_to);
    `);

    sqlite.close();

    // Create default WhatsApp channel if it doesn't exist
    const existingWhatsApp = await channelRepository.getByName('whatsapp');
    if (!existingWhatsApp) {
      await channelRepository.create({
        name: 'whatsapp',
        type: 'messaging',
        isActive: true,
      });
      logger.info('Created default WhatsApp channel');
    }

    logger.info('Database initialized successfully');
  } catch (error) {
    logger.error('Database initialization error:', error);
    throw error;
  }
}

// Setup application
const app = new Hono();

// Middleware
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

app.onError(errorHandler);

// Routes
app.route('/api/channels', channels);
app.route('/api/conversations', conversations);
app.route('/api/health', health);
app.route('/api/webhooks', webhooks);
app.route('/api/tags', tags);
app.route('/api/notes', notes);
app.route('/api/tickets', tickets);

// Root route
app.get('/', (c) => {
  return c.json({
    success: true,
    message: 'Omnichannel Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      channels: '/api/channels',
      conversations: '/api/conversations',
      webhooks: '/api/webhooks',
      tags: '/api/tags',
      notes: '/api/notes',
      tickets: '/api/tickets',
      docs: '/api/docs',
    },
  });
});

// Start server
const port = parseInt(process.env.PORT || '3000');

async function start() {
  try {
    // Initialize database
    await initializeDatabase();

    // Initialize channels
    await channelManager.initializeAllChannels();

    // Start server
    serve({
      fetch: app.fetch,
      port,
    }, (info) => {
      logger.info(`🚀 Server running on http://localhost:${info.port}`);
      logger.info('Omnichannel Backend is ready!');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('Shutting down gracefully...');
      await channelManager.shutdown();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('Shutting down gracefully...');
      await channelManager.shutdown();
      process.exit(0);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

