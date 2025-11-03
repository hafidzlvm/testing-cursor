-- =====================================================
-- OMNICHANNEL DATABASE INITIALIZATION SCRIPT
-- =====================================================
-- This script creates all necessary tables and indexes
-- for the Omnichannel Backend application
-- =====================================================

-- Enable UUID extension (optional, if needed in future)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLE: channels
-- =====================================================
-- Stores information about different messaging channels
-- (WhatsApp, Telegram, etc.)
CREATE TABLE IF NOT EXISTS channels (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    type VARCHAR(100) NOT NULL,
    config JSONB,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABLE: conversations
-- =====================================================
-- Stores conversation threads with contacts/users
CREATE TABLE IF NOT EXISTS conversations (
    id SERIAL PRIMARY KEY,
    channel_id INTEGER NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    external_id VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255),
    contact_info JSONB,
    status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'assigned', 'in_progress', 'resolved', 'closed', 'archived')),
    assigned_to VARCHAR(255), -- Agent/Developer assigned to this conversation
    assigned_to_name VARCHAR(255), -- Agent/Developer display name
    metadata JSONB,
    last_message_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(channel_id, external_id)
);

-- =====================================================
-- TABLE: messages
-- =====================================================
-- Stores all messages (inbound and outbound)
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    channel_id INTEGER NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    external_message_id VARCHAR(255),
    direction VARCHAR(20) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    type VARCHAR(50) NOT NULL DEFAULT 'text',
    content TEXT NOT NULL,
    media_url TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABLE: tags
-- =====================================================
-- Stores tags that can be assigned to conversations
CREATE TABLE IF NOT EXISTS tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    color VARCHAR(7), -- Hex color code (e.g., #FF5733)
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABLE: conversation_tags
-- =====================================================
-- Many-to-many relationship between conversations and tags
CREATE TABLE IF NOT EXISTS conversation_tags (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(conversation_id, tag_id)
);

-- =====================================================
-- TABLE: notes
-- =====================================================
-- Stores notes for conversations with created_by tracking
CREATE TABLE IF NOT EXISTS notes (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_by VARCHAR(255) NOT NULL, -- User ID or username
    created_by_name VARCHAR(255), -- User display name
    is_internal BOOLEAN NOT NULL DEFAULT false, -- Internal notes vs public notes
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABLE: tickets
-- =====================================================
-- Stores support tickets submitted by users
CREATE TABLE IF NOT EXISTS tickets (
    id SERIAL PRIMARY KEY,
    ticket_number VARCHAR(50) NOT NULL UNIQUE, -- Auto-generated ticket number
    conversation_id INTEGER REFERENCES conversations(id) ON DELETE SET NULL, -- Optional: link to conversation
    channel_id INTEGER REFERENCES channels(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'assigned', 'in_progress', 'resolved', 'closed')),
    assigned_to VARCHAR(255), -- Developer/Agent ID or username
    assigned_to_name VARCHAR(255), -- Developer/Agent display name
    created_by VARCHAR(255) NOT NULL, -- User ID who created the ticket
    created_by_name VARCHAR(255), -- User display name
    category VARCHAR(100), -- Bug, Feature Request, Question, etc.
    metadata JSONB, -- Additional ticket data
    resolved_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABLE: ticket_comments
-- =====================================================
-- Stores comments/replies on tickets
CREATE TABLE IF NOT EXISTS ticket_comments (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_by VARCHAR(255) NOT NULL,
    created_by_name VARCHAR(255),
    is_internal BOOLEAN NOT NULL DEFAULT false, -- Internal comment vs user-visible comment
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- INDEXES for Performance Optimization
-- =====================================================

-- Channels indexes
CREATE INDEX IF NOT EXISTS idx_channels_name ON channels(name);
CREATE INDEX IF NOT EXISTS idx_channels_is_active ON channels(is_active);

-- Conversations indexes
CREATE INDEX IF NOT EXISTS idx_conversations_channel_id ON conversations(channel_id);
CREATE INDEX IF NOT EXISTS idx_conversations_external_id ON conversations(external_id);
CREATE INDEX IF NOT EXISTS idx_conversations_channel_external ON conversations(channel_id, external_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_assigned_to ON conversations((metadata->>'assigned_to'));

-- Tags indexes
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
CREATE INDEX IF NOT EXISTS idx_tags_is_active ON tags(is_active);

-- Conversation tags indexes
CREATE INDEX IF NOT EXISTS idx_conversation_tags_conversation_id ON conversation_tags(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_tags_tag_id ON conversation_tags(tag_id);

-- Notes indexes
CREATE INDEX IF NOT EXISTS idx_notes_conversation_id ON notes(conversation_id);
CREATE INDEX IF NOT EXISTS idx_notes_created_by ON notes(created_by);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at DESC);

-- Tickets indexes
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_number ON tickets(ticket_number);
CREATE INDEX IF NOT EXISTS idx_tickets_conversation_id ON tickets(conversation_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_created_by ON tickets(created_by);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_category ON tickets(category);

-- Ticket comments indexes
CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket_id ON ticket_comments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_created_by ON ticket_comments(created_by);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_created_at ON ticket_comments(created_at DESC);

-- Messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_channel_id ON messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_messages_external_message_id ON messages(external_message_id);
CREATE INDEX IF NOT EXISTS idx_messages_direction ON messages(direction);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(type);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at DESC);

-- =====================================================
-- FUNCTIONS and TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to auto-update updated_at
CREATE TRIGGER update_channels_updated_at 
    BEFORE UPDATE ON channels 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at 
    BEFORE UPDATE ON conversations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at 
    BEFORE UPDATE ON messages 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tags_updated_at 
    BEFORE UPDATE ON tags 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notes_updated_at 
    BEFORE UPDATE ON notes 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tickets_updated_at 
    BEFORE UPDATE ON tickets 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ticket_comments_updated_at 
    BEFORE UPDATE ON ticket_comments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update conversation's last_message_at when new message is inserted
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations 
    SET last_message_at = NEW.created_at 
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_conversation_last_message_at
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_last_message();

-- =====================================================
-- INITIAL DATA
-- =====================================================

-- Insert default WhatsApp channel if not exists
INSERT INTO channels (name, type, is_active)
VALUES ('whatsapp', 'messaging', true)
ON CONFLICT (name) DO NOTHING;

-- Insert default tags
INSERT INTO tags (name, color, description, is_active)
VALUES 
    ('urgent', '#FF5733', 'Urgent conversations requiring immediate attention', true),
    ('follow-up', '#33C3F0', 'Conversations requiring follow-up', true),
    ('technical', '#9B59B6', 'Technical issues or questions', true),
    ('billing', '#F39C12', 'Billing or payment related', true),
    ('feature-request', '#2ECC71', 'Feature requests from users', true)
ON CONFLICT (name) DO NOTHING;

-- Function to generate ticket number
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS VARCHAR(50) AS $$
DECLARE
    new_ticket_number VARCHAR(50);
    ticket_count INTEGER;
BEGIN
    -- Get count of tickets created today
    SELECT COUNT(*) INTO ticket_count
    FROM tickets
    WHERE DATE(created_at) = CURRENT_DATE;
    
    -- Format: TICKET-YYYYMMDD-XXX (e.g., TICKET-20240115-001)
    new_ticket_number := 'TICKET-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || 
                        LPAD((ticket_count + 1)::TEXT, 3, '0');
    
    RETURN new_ticket_number;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- GRANTS (if using separate user)
-- =====================================================
-- Uncomment if you want to grant permissions to specific user
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO omnichannel_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO omnichannel_user;

-- =====================================================
-- VERIFICATION QUERIES (for testing)
-- =====================================================
-- Uncomment to verify tables are created
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
-- SELECT * FROM channels;

