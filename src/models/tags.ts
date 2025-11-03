import { db } from '../config/database';
import { sql } from 'drizzle-orm';
import Database from 'better-sqlite3';

// Get raw database connection for SQL queries
const getRawDb = () => {
  const dbPath = process.env.DATABASE_PATH || './data/omnichannel.db';
  return new Database(dbPath);
};

export interface Tag {
  id: number;
  name: string;
  color?: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationTag {
  id: number;
  conversationId: number;
  tagId: number;
  createdAt: Date;
}

export const tagRepository = {
  async getAll(activeOnly: boolean = false): Promise<Tag[]> {
    const rawDb = getRawDb();
    const query = activeOnly
      ? rawDb.prepare('SELECT * FROM tags WHERE is_active = 1 ORDER BY name ASC')
      : rawDb.prepare('SELECT * FROM tags ORDER BY name ASC');
    
    const result = query.all() as any[];
    rawDb.close();
    return result.map(this.mapRowToTag);
  },

  async getById(id: number): Promise<Tag | undefined> {
    const rawDb = getRawDb();
    const result = rawDb.prepare('SELECT * FROM tags WHERE id = ?').get(id) as any;
    rawDb.close();
    return result ? this.mapRowToTag(result) : undefined;
  },

  async getByName(name: string): Promise<Tag | undefined> {
    const rawDb = getRawDb();
    const result = rawDb.prepare('SELECT * FROM tags WHERE name = ?').get(name) as any;
    rawDb.close();
    return result ? this.mapRowToTag(result) : undefined;
  },

  async create(data: {
    name: string;
    color?: string;
    description?: string;
    isActive?: boolean;
  }): Promise<Tag> {
    const rawDb = getRawDb();
    const stmt = rawDb.prepare(`
      INSERT INTO tags (name, color, description, is_active, created_at, updated_at) 
      VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
    `);
    
    const result = stmt.run(
      data.name,
      data.color || null,
      data.description || null,
      data.isActive !== false ? 1 : 0
    );
    
    rawDb.close();
    const tag = await this.getById(Number(result.lastInsertRowid));
    if (!tag) throw new Error('Failed to create tag');
    return tag;
  },

  async update(id: number, data: Partial<{
    name: string;
    color: string;
    description: string;
    isActive: boolean;
  }>): Promise<void> {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.color !== undefined) {
      updates.push('color = ?');
      values.push(data.color);
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      values.push(data.description);
    }
    if (data.isActive !== undefined) {
      updates.push('is_active = ?');
      values.push(data.isActive ? 1 : 0);
    }

    if (updates.length === 0) return;

    updates.push("updated_at = datetime('now')");
    values.push(id);

    const rawDb = getRawDb();
    const stmt = rawDb.prepare(`UPDATE tags SET ${updates.join(', ')} WHERE id = ?`);
    stmt.run(...values);
    rawDb.close();
  },

  async delete(id: number): Promise<void> {
    const rawDb = getRawDb();
    rawDb.prepare('DELETE FROM tags WHERE id = ?').run(id);
    rawDb.close();
  },

  async addToConversation(conversationId: number, tagId: number): Promise<void> {
    const rawDb = getRawDb();
    rawDb.prepare(`
      INSERT OR IGNORE INTO conversation_tags (conversation_id, tag_id, created_at) 
      VALUES (?, ?, datetime('now'))
    `).run(conversationId, tagId);
    rawDb.close();
  },

  async removeFromConversation(conversationId: number, tagId: number): Promise<void> {
    const rawDb = getRawDb();
    rawDb.prepare('DELETE FROM conversation_tags WHERE conversation_id = ? AND tag_id = ?')
      .run(conversationId, tagId);
    rawDb.close();
  },

  async getConversationTags(conversationId: number): Promise<Tag[]> {
    const rawDb = getRawDb();
    const result = rawDb.prepare(`
      SELECT t.* FROM tags t 
      INNER JOIN conversation_tags ct ON t.id = ct.tag_id 
      WHERE ct.conversation_id = ? 
      ORDER BY t.name ASC
    `).all(conversationId) as any[];
    rawDb.close();
    return result.map(this.mapRowToTag);
  },

  async getConversationsByTag(tagId: number, limit: number = 50, offset: number = 0): Promise<number[]> {
    const rawDb = getRawDb();
    const result = rawDb.prepare(`
      SELECT conversation_id FROM conversation_tags 
      WHERE tag_id = ? 
      LIMIT ? OFFSET ?
    `).all(tagId, limit, offset) as any[];
    rawDb.close();
    return result.map((row: any) => row.conversation_id);
  },

  mapRowToTag(row: any): Tag {
    return {
      id: row.id,
      name: row.name,
      color: row.color,
      description: row.description,
      isActive: row.is_active === 1 || row.is_active === true,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  },
};

