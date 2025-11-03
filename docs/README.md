# 📚 Documentation

Folder ini berisi dokumentasi lengkap untuk Omnichannel Backend API.

## 📄 Files

- **`API_DOCUMENTATION.md`** - Dokumentasi API lengkap dengan contoh penggunaan
- **`openapi.yaml`** - OpenAPI 3.0 specification untuk API

## 🚀 Quick Start

### View API Documentation

1. **Markdown Documentation:**
   - Buka `API_DOCUMENTATION.md` untuk dokumentasi lengkap

2. **OpenAPI Specification:**
   - Gunakan `openapi.yaml` dengan tools seperti:
     - [Swagger Editor](https://editor.swagger.io/)
     - [Postman](https://www.postman.com/) (import OpenAPI)
     - [Redoc](https://redocly.com/docs/redoc/) (generate HTML docs)

### Generate HTML Documentation

```bash
# Install redoc-cli (optional)
npm install -g redoc-cli

# Generate HTML documentation
redoc-cli bundle docs/openapi.yaml -o docs/api.html
```

### Import to Postman

1. Buka Postman
2. Click Import
3. Pilih file `docs/openapi.yaml`
4. Semua endpoints akan ter-import otomatis

## 📖 API Endpoints Overview

- **Health:** `/api/health` - Check API status
- **Channels:** `/api/channels` - Manage messaging channels
- **Conversations:** `/api/conversations` - Manage conversations
- **Messages:** `/api/channels/:id/send` - Send messages
- **Webhooks:** `/api/webhooks/whatsapp` - Receive WhatsApp webhooks

Lihat `API_DOCUMENTATION.md` untuk detail lengkap setiap endpoint.

## 🔧 WhatsApp API Options

Aplikasi mendukung 2 metode untuk WhatsApp:

1. **WhatsApp Cloud API (Official)** ✅
   - Official API dari Meta
   - Lebih stabil dan reliable
   - Cocok untuk production
   - Setup di: `API_DOCUMENTATION.md` section "WhatsApp Cloud API Setup"

2. **whatsapp-web.js (Unofficial)**
   - Library untuk Web WhatsApp
   - Mudah setup, tidak perlu approval Meta
   - Cocok untuk development/testing
   - Menggunakan QR code scan

Untuk menggunakan Official API, set environment variable:
```env
WHATSAPP_USE_CLOUD_API=true
```

Lihat dokumentasi lengkap di `API_DOCUMENTATION.md`.

