# Omnichannel Backend API

Aplikasi backend robust untuk sistem omnichannel yang mendukung integrasi dengan WhatsApp dan channel lainnya. Dibangun dengan **Bun**, **TypeScript**, dan **Hono**.

## 🚀 Fitur

- ✅ **Omnichannel Architecture** - Sistem abstraksi untuk mendukung multiple messaging channels
- ✅ **WhatsApp Integration** - Integrasi penuh dengan WhatsApp menggunakan whatsapp-web.js
- ✅ **Database** - SQLite dengan Drizzle ORM untuk manajemen data
- ✅ **RESTful API** - API endpoints lengkap untuk channels, conversations, dan messages
- ✅ **Error Handling** - Error handling dan logging yang comprehensive
- ✅ **Validation** - Input validation menggunakan Zod
- ✅ **Type Safety** - Full TypeScript support
- ✅ **Logging** - Winston logger dengan file dan console output

## 📋 Prerequisites

- [Bun](https://bun.sh) (latest version)
- Node.js 18+ (untuk dependensi native)

## 🛠️ Installation

1. Clone repository atau buat project baru
2. Install dependencies:

```bash
bun install
```

3. Copy environment file:

```bash
cp .env.example .env
```

4. Edit `.env` file sesuai kebutuhan:

```env
PORT=3000
NODE_ENV=development
DATABASE_PATH=./data/omnichannel.db
WHATSAPP_SESSION_PATH=./data/whatsapp-sessions
LOG_LEVEL=info
```

## 🏃 Running

```bash
# Development mode
bun run dev

# Production mode
bun run start
```

Server akan berjalan di `http://localhost:3000`

## 📡 API Endpoints

### Health Check

```
GET /api/health
```

### Channels

#### Get all channels
```
GET /api/channels
```

#### Get channel by ID
```
GET /api/channels/:id
```

#### Create channel
```
POST /api/channels
Content-Type: application/json

{
  "name": "whatsapp",
  "type": "messaging",
  "isActive": true
}
```

#### Initialize channel (WhatsApp)
```
POST /api/channels/:id/initialize
```

**Catatan:** Untuk WhatsApp, scan QR code yang muncul di console setelah initialize.

#### Send message via channel
```
POST /api/channels/:id/send
Content-Type: application/json

{
  "to": "6281234567890",
  "message": "Hello World!",
  "type": "text"
}
```

#### Send media via channel
```
POST /api/channels/:id/send
Content-Type: application/json

{
  "to": "6281234567890",
  "mediaUrl": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  "caption": "Photo caption",
  "type": "image"
}
```

### Conversations

#### Get all conversations
```
GET /api/conversations?limit=50&offset=0
```

#### Get conversation by ID
```
GET /api/conversations/:id
```

#### Get messages in conversation
```
GET /api/conversations/:id/messages?limit=50&offset=0
```

#### Create conversation
```
POST /api/conversations
Content-Type: application/json

{
  "channelId": 1,
  "externalId": "6281234567890",
  "contactName": "John Doe"
}
```

#### Update conversation
```
PATCH /api/conversations/:id
Content-Type: application/json

{
  "status": "closed"
}
```

## 🔧 Architecture

### Project Structure

```
src/
├── channels/          # Channel adapters (WhatsApp, Telegram, etc.)
│   ├── base.ts       # Base adapter class
│   └── whatsapp.ts   # WhatsApp implementation
├── config/           # Configuration files
│   ├── database.ts   # Database setup
│   └── logger.ts     # Logger setup
├── models/           # Database models
│   ├── schema.ts     # Database schema
│   └── index.ts      # Repository functions
├── routes/           # API routes
│   ├── channels.ts
│   ├── conversations.ts
│   └── health.ts
├── services/         # Business logic
│   └── channel-manager.ts
├── middleware/       # Middleware
│   ├── error-handler.ts
│   └── validator.ts
├── types/           # TypeScript types
│   └── channel.ts
├── utils/           # Utility functions
│   └── validation.ts
└── index.ts         # Main entry point
```

### Channel Abstraction

Sistem menggunakan pattern adapter untuk memungkinkan penambahan channel baru dengan mudah:

1. **IChannelAdapter** - Interface yang harus diimplementasikan oleh semua channel adapters
2. **BaseChannelAdapter** - Base class dengan fungsi umum (handling messages, status updates)
3. **Channel-specific adapters** - Implementasi spesifik untuk setiap channel (WhatsApp, Telegram, etc.)

### Menambahkan Channel Baru

1. Buat adapter baru di `src/channels/` yang extends `BaseChannelAdapter`
2. Implementasikan semua abstract methods
3. Daftarkan channel baru di `ChannelManager.initializeChannel()`

## 🔐 Security

- Gunakan environment variables untuk sensitive data
- Setup API key authentication untuk production
- Enable CORS hanya untuk domain yang diizinkan
- Setup rate limiting untuk production

## 📝 Logging

Logs tersimpan di:
- Console (development)
- `./logs/app.log` (all logs)
- `./logs/error.log` (errors only)

## 🗄️ Database

Database menggunakan SQLite dengan Drizzle ORM. Schema akan otomatis dibuat saat pertama kali run.

### Tables

- **channels** - Daftar channel yang terdaftar
- **conversations** - Percakapan dengan kontak
- **messages** - Pesan yang dikirim/diterima

## 🚧 Development

```bash
# Run in development
bun run dev

# Build
bun run build

# Test
bun test
```

## 📦 Production Deployment

1. Set `NODE_ENV=production` di `.env`
2. Setup proper database path
3. Configure logging
4. Setup reverse proxy (nginx/caddy)
5. Enable HTTPS
6. Setup monitoring

## 🤝 Contributing

Untuk menambahkan channel baru atau fitur, silakan ikuti arsitektur yang sudah ada dan pastikan semua tests pass.

## 📄 License

MIT

## ⚠️ Notes

- WhatsApp integration menggunakan whatsapp-web.js yang memerlukan browser automation
- Untuk production WhatsApp, pertimbangkan menggunakan WhatsApp Business API resmi
- Session WhatsApp disimpan di `./data/whatsapp-sessions`
- Pastikan memiliki cukup resources untuk menjalankan Puppeteer (untuk WhatsApp)

# testing-cursor
