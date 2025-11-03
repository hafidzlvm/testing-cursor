import { db } from '../config/database';
import { sql } from 'drizzle-orm';

export interface Ticket {
  id: number;
  ticketNumber: string;
  conversationId?: number;
  channelId?: number;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'assigned' | 'in_progress' | 'resolved' | 'closed';
  assignedTo?: string;
  assignedToName?: string;
  createdBy: string;
  createdByName?: string;
  category?: string;
  metadata?: any;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TicketComment {
  id: number;
  ticketId: number;
  content: string;
  createdBy: string;
  createdByName?: string;
  isInternal: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function generateTicketNumber(): string {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
  // For SQLite, we'll generate in application
  // For PostgreSQL, use the database function
  return `TICKET-${dateStr}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
}

export const ticketRepository = {
  async getAll(filters?: {
    status?: string;
    priority?: string;
    assignedTo?: string;
    createdBy?: string;
    category?: string;
  }, limit: number = 50, offset: number = 0): Promise<Ticket[]> {
    let query = 'SELECT * FROM tickets WHERE 1=1';
    const conditions: any[] = [];
    const values: any[] = [];

    if (filters?.status) {
      query += ' AND status = ?';
      values.push(filters.status);
    }
    if (filters?.priority) {
      query += ' AND priority = ?';
      values.push(filters.priority);
    }
    if (filters?.assignedTo) {
      query += ' AND assigned_to = ?';
      values.push(filters.assignedTo);
    }
    if (filters?.createdBy) {
      query += ' AND created_by = ?';
      values.push(filters.createdBy);
    }
    if (filters?.category) {
      query += ' AND category = ?';
      values.push(filters.category);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    values.push(limit, offset);

    const result = await db.all(sql.raw(query, values));
    return result.map(this.mapRowToTicket);
  },

  async getById(id: number): Promise<Ticket | undefined> {
    const result = await db.get(sql`SELECT * FROM tickets WHERE id = ${id}`);
    return result ? this.mapRowToTicket(result) : undefined;
  },

  async getByTicketNumber(ticketNumber: string): Promise<Ticket | undefined> {
    const result = await db.get(sql`SELECT * FROM tickets WHERE ticket_number = ${ticketNumber}`);
    return result ? this.mapRowToTicket(result) : undefined;
  },

  async getByConversation(conversationId: number): Promise<Ticket[]> {
    const result = await db.all(
      sql`SELECT * FROM tickets WHERE conversation_id = ${conversationId} ORDER BY created_at DESC`
    );
    return result.map(this.mapRowToTicket);
  },

  async create(data: {
    conversationId?: number;
    channelId?: number;
    title: string;
    description: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    status?: 'open' | 'assigned' | 'in_progress' | 'resolved' | 'closed';
    createdBy: string;
    createdByName?: string;
    category?: string;
    metadata?: any;
  }): Promise<Ticket> {
    const ticketNumber = generateTicketNumber();
    
    const result = await db.run(
      sql`INSERT INTO tickets (ticket_number, conversation_id, channel_id, title, description, 
          priority, status, created_by, created_by_name, category, metadata, created_at, updated_at) 
          VALUES (${ticketNumber}, ${data.conversationId || null}, ${data.channelId || null}, 
                  ${data.title}, ${data.description}, ${data.priority || 'medium'}, 
                  ${data.status || 'open'}, ${data.createdBy}, ${data.createdByName || null}, 
                  ${data.category || null}, ${data.metadata ? JSON.stringify(data.metadata) : null}, 
                  datetime('now'), datetime('now'))`
    );

    const ticket = await this.getById(result.lastInsertRowid as number);
    if (!ticket) throw new Error('Failed to create ticket');
    return ticket;
  },

  async update(id: number, data: Partial<{
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    status: 'open' | 'assigned' | 'in_progress' | 'resolved' | 'closed';
    assignedTo: string;
    assignedToName: string;
    category: string;
    metadata: any;
  }>): Promise<void> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(data.title);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(data.description);
    }
    if (data.priority !== undefined) {
      updates.push(`priority = $${paramIndex++}`);
      values.push(data.priority);
    }
    if (data.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(data.status);
      if (data.status === 'resolved' || data.status === 'closed') {
        updates.push(`resolved_at = datetime('now')`);
      }
    }
    if (data.assignedTo !== undefined) {
      updates.push(`assigned_to = $${paramIndex++}`);
      values.push(data.assignedTo);
    }
    if (data.assignedToName !== undefined) {
      updates.push(`assigned_to_name = $${paramIndex++}`);
      values.push(data.assignedToName);
    }
    if (data.category !== undefined) {
      updates.push(`category = $${paramIndex++}`);
      values.push(data.category);
    }
    if (data.metadata !== undefined) {
      updates.push(`metadata = $${paramIndex++}`);
      values.push(JSON.stringify(data.metadata));
    }

    if (updates.length === 0) return;

    updates.push(`updated_at = datetime('now')`);
    values.push(id);

    await db.run(
      sql.raw(`UPDATE tickets SET ${updates.join(', ')} WHERE id = $${paramIndex}`, values)
    );
  },

  async delete(id: number): Promise<void> {
    await db.run(sql`DELETE FROM tickets WHERE id = ${id}`);
  },

  async getComments(ticketId: number, limit: number = 50, offset: number = 0): Promise<TicketComment[]> {
    const result = await db.all(
      sql`SELECT * FROM ticket_comments 
          WHERE ticket_id = ${ticketId} 
          ORDER BY created_at ASC 
          LIMIT ${limit} OFFSET ${offset}`
    );
    return result.map(this.mapRowToComment);
  },

  async addComment(data: {
    ticketId: number;
    content: string;
    createdBy: string;
    createdByName?: string;
    isInternal?: boolean;
  }): Promise<TicketComment> {
    const result = await db.run(
      sql`INSERT INTO ticket_comments (ticket_id, content, created_by, created_by_name, is_internal, created_at, updated_at) 
          VALUES (${data.ticketId}, ${data.content}, ${data.createdBy}, 
                  ${data.createdByName || null}, ${data.isInternal ? 1 : 0}, 
                  datetime('now'), datetime('now'))`
    );

    const comment = await this.getById(result.lastInsertRowid as number);
    if (!comment) throw new Error('Failed to create comment');
    return comment as any;
  },

  mapRowToTicket(row: any): Ticket {
    return {
      id: row.id,
      ticketNumber: row.ticket_number,
      conversationId: row.conversation_id,
      channelId: row.channel_id,
      title: row.title,
      description: row.description,
      priority: row.priority,
      status: row.status,
      assignedTo: row.assigned_to,
      assignedToName: row.assigned_to_name,
      createdBy: row.created_by,
      createdByName: row.created_by_name,
      category: row.category,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      resolvedAt: row.resolved_at ? new Date(row.resolved_at) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  },

  mapRowToComment(row: any): TicketComment {
    return {
      id: row.id,
      ticketId: row.ticket_id,
      content: row.content,
      createdBy: row.created_by,
      createdByName: row.created_by_name,
      isInternal: row.is_internal === 1 || row.is_internal === true,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  },
};


