import { db } from '../config/database';
import { sql } from 'drizzle-orm';

export interface Note {
  id: number;
  conversationId: number;
  content: string;
  createdBy: string;
  createdByName?: string;
  isInternal: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const noteRepository = {
  async getById(id: number): Promise<Note | undefined> {
    const result = await db.get(sql`SELECT * FROM notes WHERE id = ${id}`);
    return result ? this.mapRowToNote(result) : undefined;
  },

  async getByConversation(conversationId: number, limit: number = 50, offset: number = 0): Promise<Note[]> {
    const result = await db.all(
      sql`SELECT * FROM notes 
          WHERE conversation_id = ${conversationId} 
          ORDER BY created_at DESC 
          LIMIT ${limit} OFFSET ${offset}`
    );
    return result.map(this.mapRowToNote);
  },

  async create(data: {
    conversationId: number;
    content: string;
    createdBy: string;
    createdByName?: string;
    isInternal?: boolean;
  }): Promise<Note> {
    const result = await db.run(
      sql`INSERT INTO notes (conversation_id, content, created_by, created_by_name, is_internal, created_at, updated_at) 
          VALUES (${data.conversationId}, ${data.content}, ${data.createdBy}, 
                  ${data.createdByName || null}, ${data.isInternal ? 1 : 0}, 
                  datetime('now'), datetime('now'))`
    );

    const note = await this.getById(result.lastInsertRowid as number);
    if (!note) throw new Error('Failed to create note');
    return note;
  },

  async update(id: number, data: Partial<{
    content: string;
    isInternal: boolean;
  }>): Promise<void> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.content !== undefined) {
      updates.push(`content = $${paramIndex++}`);
      values.push(data.content);
    }
    if (data.isInternal !== undefined) {
      updates.push(`is_internal = $${paramIndex++}`);
      values.push(data.isInternal ? 1 : 0);
    }

    if (updates.length === 0) return;

    updates.push(`updated_at = datetime('now')`);
    values.push(id);

    await db.run(
      sql.raw(`UPDATE notes SET ${updates.join(', ')} WHERE id = $${paramIndex}`, values)
    );
  },

  async delete(id: number): Promise<void> {
    await db.run(sql`DELETE FROM notes WHERE id = ${id}`);
  },

  mapRowToNote(row: any): Note {
    return {
      id: row.id,
      conversationId: row.conversation_id,
      content: row.content,
      createdBy: row.created_by,
      createdByName: row.created_by_name,
      isInternal: row.is_internal === 1 || row.is_internal === true,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  },
};


