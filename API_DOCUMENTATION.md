# 📚 API Documentation - Omnichannel Backend

**Version:** 1.0.0  
**Base URL:** `http://localhost:3000`  
**API Base:** `/api`

## 📋 Table of Contents

1. [Authentication](#authentication)
2. [Endpoints](#endpoints)
   - [Health Check](#health-check)
   - [Channels](#channels)
   - [Conversations](#conversations)
   - [Messages](#messages)
   - [Webhooks](#webhooks)
3. [Error Handling](#error-handling)
4. [Rate Limiting](#rate-limiting)
5. [Examples](#examples)

---

## 🔐 Authentication

Currently, the API does not require authentication. For production, implement API key authentication.

**Future:** Add API key in header:
```
Authorization: Bearer YOUR_API_KEY
```

---

## 🏥 Health Check

### GET `/api/health`

Check API health status and channel connectivity.

**Response:**
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "channels": [
    {
      "id": 1,
      "name": "whatsapp",
      "isConnected": true
    }
  ]
}
```

**Status Codes:**
- `200 OK` - Service is healthy

---

## 📢 Channels

### GET `/api/channels`

Get all registered channels.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "whatsapp",
      "type": "messaging",
      "config": null,
      "isActive": true,
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z"
    }
  ]
}
```

---

### GET `/api/channels/:id`

Get channel by ID.

**Parameters:**
- `id` (path, required) - Channel ID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "whatsapp",
    "type": "messaging",
    "config": null,
    "isActive": true,
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z"
  }
}
```

**Status Codes:**
- `200 OK` - Channel found
- `404 Not Found` - Channel not found

---

### POST `/api/channels`

Create a new channel.

**Request Body:**
```json
{
  "name": "whatsapp",
  "type": "messaging",
  "config": {
    "useCloudAPI": true
  },
  "isActive": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "whatsapp",
    "type": "messaging",
    "config": "{\"useCloudAPI\":true}",
    "isActive": true,
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z"
  }
}
```

**Status Codes:**
- `201 Created` - Channel created
- `400 Bad Request` - Validation error

---

### PATCH `/api/channels/:id`

Update channel configuration.

**Parameters:**
- `id` (path, required) - Channel ID

**Request Body:**
```json
{
  "config": {
    "useCloudAPI": true
  },
  "isActive": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "whatsapp",
    "type": "messaging",
    "config": "{\"useCloudAPI\":true}",
    "isActive": false,
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### POST `/api/channels/:id/initialize`

Initialize a channel. For WhatsApp, this will generate a QR code (for whatsapp-web.js) or verify credentials (for Cloud API).

**Parameters:**
- `id` (path, required) - Channel ID

**Response:**
```json
{
  "success": true,
  "message": "Channel initialized successfully"
}
```

**Status Codes:**
- `200 OK` - Channel initialized
- `400 Bad Request` - Initialization failed

**Notes:**
- For WhatsApp using `whatsapp-web.js`: Check console for QR code to scan
- For WhatsApp Cloud API: Ensure environment variables are set correctly

---

### POST `/api/channels/:id/send`

Send a message through the specified channel.

**Parameters:**
- `id` (path, required) - Channel ID

**Request Body (Text Message):**
```json
{
  "to": "6281234567890",
  "message": "Hello World!",
  "type": "text"
}
```

**Request Body (Media Message):**
```json
{
  "to": "6281234567890",
  "mediaUrl": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  "caption": "This is an image",
  "type": "image"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "messageId": "wamid.XXX..."
  }
}
```

**Status Codes:**
- `200 OK` - Message sent
- `400 Bad Request` - Invalid request or channel not initialized
- `500 Internal Server Error` - Sending failed

**Notes:**
- Phone number format: `6281234567890` (without +, spaces, or @c.us)
- For WhatsApp Cloud API, `mediaUrl` must be a valid HTTP/HTTPS URL

---

## 💬 Conversations

### GET `/api/conversations`

Get all conversations.

**Query Parameters:**
- `limit` (optional, default: 50, max: 100) - Number of results
- `offset` (optional, default: 0) - Pagination offset

**Example:**
```
GET /api/conversations?limit=20&offset=0
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "channelId": 1,
      "externalId": "6281234567890",
      "contactName": "John Doe",
      "contactInfo": null,
      "status": "open",
      "metadata": null,
      "lastMessageAt": "2024-01-15T10:30:00.000Z",
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

---

### GET `/api/conversations/:id`

Get conversation by ID.

**Parameters:**
- `id` (path, required) - Conversation ID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "channelId": 1,
    "externalId": "6281234567890",
    "contactName": "John Doe",
    "status": "open",
    "lastMessageAt": "2024-01-15T10:30:00.000Z",
    "createdAt": "2024-01-15T10:00:00.000Z"
  }
}
```

---

### GET `/api/conversations/:id/messages`

Get messages in a conversation.

**Parameters:**
- `id` (path, required) - Conversation ID

**Query Parameters:**
- `limit` (optional, default: 50) - Number of messages
- `offset` (optional, default: 0) - Pagination offset

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "conversationId": 1,
      "channelId": 1,
      "externalMessageId": "wamid.XXX...",
      "direction": "inbound",
      "type": "text",
      "content": "Hello!",
      "mediaUrl": null,
      "status": "delivered",
      "metadata": null,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

---

### POST `/api/conversations`

Create a new conversation.

**Request Body:**
```json
{
  "channelId": 1,
  "externalId": "6281234567890",
  "contactName": "John Doe",
  "contactInfo": {
    "email": "john@example.com"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "channelId": 1,
    "externalId": "6281234567890",
    "contactName": "John Doe",
    "status": "open",
    "createdAt": "2024-01-15T10:00:00.000Z"
  }
}
```

---

### PATCH `/api/conversations/:id`

Update conversation.

**Parameters:**
- `id` (path, required) - Conversation ID

**Request Body:**
```json
{
  "status": "closed",
  "contactName": "Jane Doe"
}
```

**Valid Status Values:**
- `open` - Conversation is active
- `closed` - Conversation is closed
- `archived` - Conversation is archived

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "status": "closed",
    "contactName": "Jane Doe",
    "updatedAt": "2024-01-15T10:35:00.000Z"
  }
}
```

---

## 🔔 Webhooks

### GET `/api/webhooks/whatsapp`

Webhook verification endpoint for WhatsApp Cloud API.

**Query Parameters:**
- `hub.mode` - Must be "subscribe"
- `hub.verify_token` - Verification token
- `hub.challenge` - Challenge string from WhatsApp

**Response:**
- Returns challenge string if verification successful
- `403 Forbidden` if verification fails

---

### POST `/api/webhooks/whatsapp`

Receive incoming messages and status updates from WhatsApp Cloud API.

**Request Body (Incoming Message):**
```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "WHATSAPP_BUSINESS_ACCOUNT_ID",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "1234567890",
              "phone_number_id": "PHONE_NUMBER_ID"
            },
            "messages": [
              {
                "from": "6281234567890",
                "id": "wamid.XXX...",
                "timestamp": "1609459200",
                "text": {
                  "body": "Hello!"
                },
                "type": "text"
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
}
```

**Request Body (Status Update):**
```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "changes": [
        {
          "value": {
            "statuses": [
              {
                "id": "wamid.XXX...",
                "status": "delivered",
                "timestamp": "1609459200",
                "recipient_id": "6281234567890"
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
}
```

**Response:**
```json
{
  "success": true
}
```

**Status Codes:**
- `200 OK` - Webhook processed
- `404 Not Found` - Adapter not found
- `500 Internal Server Error` - Processing failed

---

## ❌ Error Handling

All errors follow this format:

```json
{
  "success": false,
  "error": "Error message",
  "details": {
    // Additional error details (if available)
  }
}
```

### HTTP Status Codes

- `200 OK` - Success
- `201 Created` - Resource created
- `400 Bad Request` - Invalid request
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Access denied
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

### Example Error Response

```json
{
  "success": false,
  "error": "Validation error",
  "details": [
    {
      "path": ["to"],
      "message": "String must contain at least 1 character(s)"
    }
  ]
}
```

---

## ⚡ Rate Limiting

Currently, no rate limiting is enforced. For production, implement rate limiting:

- **Recommended:** 100 requests per minute per API key
- **Burst:** Allow up to 10 requests in 1 second

---

## 📝 Examples

### cURL Examples

#### Send Text Message
```bash
curl -X POST http://localhost:3000/api/channels/1/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "6281234567890",
    "message": "Hello from API!",
    "type": "text"
  }'
```

#### Get Conversations
```bash
curl http://localhost:3000/api/conversations?limit=10
```

#### Initialize WhatsApp Channel
```bash
curl -X POST http://localhost:3000/api/channels/1/initialize
```

### JavaScript/TypeScript Examples

```typescript
// Send message
const response = await fetch('http://localhost:3000/api/channels/1/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    to: '6281234567890',
    message: 'Hello!',
    type: 'text',
  }),
});

const data = await response.json();
console.log('Message ID:', data.data.messageId);
```

```typescript
// Get conversations with pagination
const response = await fetch(
  'http://localhost:3000/api/conversations?limit=20&offset=0'
);
const data = await response.json();
console.log('Conversations:', data.data);
```

### Python Examples

```python
import requests

# Send message
response = requests.post(
    'http://localhost:3000/api/channels/1/send',
    json={
        'to': '6281234567890',
        'message': 'Hello from Python!',
        'type': 'text'
    }
)
data = response.json()
print(f"Message ID: {data['data']['messageId']}")
```

---

## 🔧 WhatsApp Cloud API Setup

To use Official WhatsApp Cloud API:

1. **Get Access Token:**
   - Go to Meta for Developers: https://developers.facebook.com
   - Create a WhatsApp app
   - Get your access token

2. **Configure Environment Variables:**
```env
WHATSAPP_USE_CLOUD_API=true
WHATSAPP_API_TOKEN=your_access_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id
WHATSAPP_APP_ID=your_app_id
WHATSAPP_APP_SECRET=your_app_secret
WHATSAPP_VERIFY_TOKEN=your_webhook_verify_token
WHATSAPP_WEBHOOK_URL=https://yourdomain.com/api/webhooks/whatsapp
```

3. **Setup Webhook:**
   - In Meta Business Manager, configure webhook URL
   - Set verify token same as `WHATSAPP_VERIFY_TOKEN`
   - Subscribe to `messages` and `message_status` fields

4. **Update Channel Config:**
```json
{
  "useCloudAPI": true
}
```

---

## 📚 Additional Resources

- [WhatsApp Cloud API Documentation](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Meta for Developers](https://developers.facebook.com)
- [Postman Collection](https://www.postman.com/meta/whatsapp-business-platform)

---

## 🆘 Support

For issues and questions:
- Check logs in `./logs/app.log`
- Verify environment variables
- Ensure channel is initialized
- Check webhook configuration (for Cloud API)

---

**Last Updated:** January 2024  
**API Version:** 1.0.0

