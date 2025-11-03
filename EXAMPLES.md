# Examples - Cara Menggunakan API

## 1. Setup WhatsApp Channel

### Step 1: Initialize WhatsApp Channel

```bash
# Pastikan channel WhatsApp sudah ada (otomatis dibuat saat pertama run)
GET http://localhost:3000/api/channels

# Initialize WhatsApp channel (akan muncul QR code di console)
POST http://localhost:3000/api/channels/1/initialize
```

**Catatan:** Scan QR code yang muncul di console dengan WhatsApp di smartphone Anda.

### Step 2: Verify Channel Status

```bash
GET http://localhost:3000/api/health
```

Response:
```json
{
  "success": true,
  "status": "healthy",
  "channels": [
    {
      "id": 1,
      "name": "whatsapp",
      "isConnected": true
    }
  ]
}
```

## 2. Mengirim Pesan

### Mengirim Pesan Teks

```bash
POST http://localhost:3000/api/channels/1/send
Content-Type: application/json

{
  "to": "6281234567890",
  "message": "Halo! Ini pesan dari Omnichannel Backend",
  "type": "text"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "messageId": "true_6281234567890@c.us_3EB0..."
  }
}
```

### Mengirim Gambar dengan Caption

```bash
POST http://localhost:3000/api/channels/1/send
Content-Type: application/json

{
  "to": "6281234567890",
  "mediaUrl": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD...",
  "caption": "Ini adalah gambar",
  "type": "image"
}
```

## 3. Melihat Conversations

### List Semua Conversations

```bash
GET http://localhost:3000/api/conversations?limit=20&offset=0
```

### Detail Conversation

```bash
GET http://localhost:3000/api/conversations/1
```

### Lihat Messages dalam Conversation

```bash
GET http://localhost:3000/api/conversations/1/messages?limit=50
```

## 4. Menggunakan cURL

```bash
# Send text message
curl -X POST http://localhost:3000/api/channels/1/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "6281234567890",
    "message": "Hello from API",
    "type": "text"
  }'

# Get all conversations
curl http://localhost:3000/api/conversations

# Get health status
curl http://localhost:3000/api/health
```

## 5. Menggunakan JavaScript/TypeScript

```typescript
// Send message
async function sendMessage(channelId: number, to: string, message: string) {
  const response = await fetch(`http://localhost:3000/api/channels/${channelId}/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to,
      message,
      type: 'text',
    }),
  });
  
  const data = await response.json();
  return data;
}

// Get conversations
async function getConversations(limit = 50, offset = 0) {
  const response = await fetch(
    `http://localhost:3000/api/conversations?limit=${limit}&offset=${offset}`
  );
  const data = await response.json();
  return data;
}

// Usage
sendMessage(1, '6281234567890', 'Hello!')
  .then(result => console.log('Message sent:', result))
  .catch(error => console.error('Error:', error));
```

## 6. Webhook Integration (Future)

Untuk production, Anda bisa setup webhook untuk menerima notifikasi saat ada pesan masuk:

1. Setup webhook URL di environment variable
2. Implement webhook handler di channel adapter
3. POST ke webhook URL saat ada event baru

## 7. Format Nomor WhatsApp

- Format: `6281234567890` (tanpa tanda +, @c.us, atau spasi)
- Atau: `6281234567890@c.us` (full format)
- Untuk group: `120363123456789012@g.us`

## 8. Troubleshooting

### WhatsApp tidak connect
1. Pastikan QR code sudah di-scan
2. Cek status dengan `GET /api/health`
3. Cek logs di `./logs/app.log`

### Message tidak terkirim
1. Pastikan nomor format benar
2. Pastikan WhatsApp client sudah ready (check health endpoint)
3. Pastikan nomor sudah ada di contact WhatsApp

### Database error
1. Pastikan folder `./data` bisa ditulis
2. Cek permission folder
3. Restart aplikasi

