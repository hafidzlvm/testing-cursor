# 🎯 Fitur Baru - Tags, Notes, Status, dan Tickets

## 📋 Overview

Aplikasi sekarang memiliki fitur lengkap untuk manajemen conversations dengan:
- ✅ **Tags System** - Tag conversations untuk organisasi yang lebih baik
- ✅ **Status Management** - Track status conversations (assigned, resolved, dll)
- ✅ **Notes System** - Catatan dengan tracking `created_by`
- ✅ **Tickets System** - User dapat submit tickets ke developer
- ✅ **Conversation History** - History lengkap semua pesan

---

## 🏷️ Tags System

### Endpoints

#### Get All Tags
```
GET /api/tags?active_only=true
```

#### Create Tag
```
POST /api/tags
{
  "name": "urgent",
  "color": "#FF5733",
  "description": "Urgent conversations",
  "isActive": true
}
```

#### Add Tag to Conversation
```
POST /api/tags/conversation/:conversationId/:tagId
```

#### Remove Tag from Conversation
```
DELETE /api/tags/conversation/:conversationId/:tagId
```

#### Get Tags for Conversation
```
GET /api/tags/conversation/:conversationId
```

### Default Tags
Sistem sudah include default tags:
- `urgent` - Urgent conversations
- `follow-up` - Requires follow-up
- `technical` - Technical issues
- `billing` - Billing related
- `feature-request` - Feature requests

---

## 📝 Notes System

### Fitur
- ✅ Notes untuk setiap conversation
- ✅ Track `created_by` dan `created_by_name`
- ✅ Support internal notes (tidak visible untuk user)
- ✅ Full CRUD operations

### Endpoints

#### Create Note
```
POST /api/notes
{
  "conversationId": 1,
  "content": "Customer needs urgent response",
  "createdBy": "user123",
  "createdByName": "John Doe",
  "isInternal": false
}
```

#### Get Notes for Conversation
```
GET /api/notes/conversation/:conversationId?limit=50&offset=0
```

#### Update Note
```
PATCH /api/notes/:id
{
  "content": "Updated note",
  "isInternal": true
}
```

#### Delete Note
```
DELETE /api/notes/:id
```

---

## 🎫 Tickets System

### Fitur
- ✅ Auto-generate ticket number (format: `TICKET-YYYYMMDD-XXX`)
- ✅ Link ke conversation (optional)
- ✅ Priority levels: low, medium, high, urgent
- ✅ Status tracking: open, assigned, in_progress, resolved, closed
- ✅ Assignment ke developer/agent
- ✅ Category system
- ✅ Comments/replies pada tickets
- ✅ Auto-log untuk developer notification

### Endpoints

#### Create Ticket
```
POST /api/tickets
{
  "conversationId": 1,
  "channelId": 1,
  "title": "Bug: Payment not working",
  "description": "Users cannot complete payment",
  "priority": "urgent",
  "createdBy": "user123",
  "createdByName": "John Doe",
  "category": "Bug"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "ticketNumber": "TICKET-20240115-001",
    "title": "Bug: Payment not working",
    "status": "open",
    "priority": "urgent",
    ...
  }
}
```

#### Get All Tickets (with filters)
```
GET /api/tickets?status=open&priority=urgent&assigned_to=dev123&limit=50&offset=0
```

#### Get Ticket by Number
```
GET /api/tickets/number/:ticketNumber
```

#### Update Ticket
```
PATCH /api/tickets/:id
{
  "status": "assigned",
  "assignedTo": "dev123",
  "assignedToName": "Developer Name",
  "priority": "high"
}
```

#### Add Comment to Ticket
```
POST /api/tickets/:id/comments
{
  "content": "Investigating the issue",
  "createdBy": "dev123",
  "createdByName": "Developer Name",
  "isInternal": false
}
```

#### Get Ticket Comments
```
GET /api/tickets/:id/comments?limit=50&offset=0
```

### Ticket Status Flow
```
open → assigned → in_progress → resolved → closed
```

### Developer Notification
Saat ticket dibuat, sistem akan:
1. Log ticket ke logger (lihat `logs/app.log`)
2. Generate ticket number unik
3. **Future:** Bisa ditambahkan notification ke email/Slack

---

## 📊 Conversation Status & Assignment

### Status Values
- `open` - Conversation baru, belum di-handle
- `assigned` - Sudah di-assign ke agent
- `in_progress` - Sedang di-handle
- `resolved` - Sudah diselesaikan
- `closed` - Conversation ditutup
- `archived` - Di-archive

### Endpoints

#### Update Conversation Status
```
PATCH /api/conversations/:id
{
  "status": "assigned",
  "assignedTo": "agent123",
  "assignedToName": "Agent Name"
}
```

#### Get Conversations by Status
```
GET /api/conversations?status=assigned&limit=50&offset=0
```

#### Get Conversations by Assigned To
```
GET /api/conversations?assigned_to=agent123&limit=50&offset=0
```

#### Get Conversation (with Tags)
```
GET /api/conversations/:id
```

**Response includes tags:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "status": "assigned",
    "assignedTo": "agent123",
    "tags": [
      {
        "id": 1,
        "name": "urgent",
        "color": "#FF5733"
      }
    ]
  }
}
```

---

## 🔄 Conversation History

History sudah otomatis tersimpan untuk setiap pesan:

```
GET /api/conversations/:id/messages?limit=50&offset=0
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "direction": "inbound",
      "content": "Hello",
      "type": "text",
      "status": "delivered",
      "createdAt": "2024-01-15T10:00:00.000Z"
    }
  ]
}
```

---

## 📚 Contoh Workflow Lengkap

### 1. User membuat conversation (otomatis via WhatsApp)

### 2. Agent assign conversation
```bash
PATCH /api/conversations/1
{
  "status": "assigned",
  "assignedTo": "agent123",
  "assignedToName": "Agent Name"
}
```

### 3. Agent add tags
```bash
POST /api/tags/conversation/1/1  # Add "urgent" tag
```

### 4. Agent add note
```bash
POST /api/notes
{
  "conversationId": 1,
  "content": "Customer needs urgent response about payment issue",
  "createdBy": "agent123",
  "createdByName": "Agent Name"
}
```

### 5. Jika perlu, buat ticket untuk developer
```bash
POST /api/tickets
{
  "conversationId": 1,
  "title": "Payment issue needs investigation",
  "description": "Customer cannot complete payment",
  "priority": "high",
  "createdBy": "agent123",
  "createdByName": "Agent Name",
  "category": "Bug"
}
```

### 6. Developer resolve ticket
```bash
PATCH /api/tickets/1
{
  "status": "resolved",
  "assignedTo": "dev123"
}
```

### 7. Agent update conversation status
```bash
PATCH /api/conversations/1
{
  "status": "resolved"
}
```

---

## 🗄️ Database Schema

### New Tables

1. **tags** - Tag definitions
2. **conversation_tags** - Many-to-many relationship
3. **notes** - Notes dengan created_by tracking
4. **tickets** - Support tickets
5. **ticket_comments** - Comments pada tickets

### Updated Tables

- **conversations** - Added status values (assigned, in_progress, resolved) dan assigned_to support

Lihat `database/init.sql` untuk schema lengkap.

---

## 🚀 Quick Start

1. **Setup Database:**
   ```bash
   cd database
   docker-compose up -d
   ```

2. **Start Application:**
   ```bash
   bun run dev
   ```

3. **Create First Tag:**
   ```bash
   curl -X POST http://localhost:3000/api/tags \
     -H "Content-Type: application/json" \
     -d '{"name": "vip", "color": "#FFD700"}'
   ```

4. **Create Note:**
   ```bash
   curl -X POST http://localhost:3000/api/notes \
     -H "Content-Type: application/json" \
     -d '{
       "conversationId": 1,
       "content": "Important note",
       "createdBy": "user123",
       "createdByName": "John Doe"
     }'
   ```

5. **Create Ticket:**
   ```bash
   curl -X POST http://localhost:3000/api/tickets \
     -H "Content-Type: application/json" \
     -d '{
       "title": "Bug Report",
       "description": "Payment not working",
       "priority": "high",
       "createdBy": "user123"
     }'
   ```

---

## 📖 API Documentation

Lihat `API_DOCUMENTATION.md` untuk dokumentasi lengkap semua endpoints.

---

**Semua fitur sudah robust dengan:**
- ✅ Input validation (Zod)
- ✅ Error handling
- ✅ Logging
- ✅ Database indexes untuk performance
- ✅ Proper relationships (foreign keys)
- ✅ Auto-timestamps


