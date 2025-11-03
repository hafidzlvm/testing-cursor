# Database Setup dengan Docker

Folder ini berisi konfigurasi Docker untuk database PostgreSQL beserta script initialization.

## 📋 Struktur File

- `docker-compose.yml` - Konfigurasi Docker Compose untuk PostgreSQL dan pgAdmin
- `init.sql` - Script SQL untuk membuat semua table, indexes, triggers, dan initial data
- `README.md` - Dokumentasi ini

## 🚀 Quick Start

### 1. Setup Environment Variables

Buat file `.env` di root project (atau copy dari `.env.example`) dan tambahkan konfigurasi database:

```env
# PostgreSQL Configuration
POSTGRES_USER=omnichannel
POSTGRES_PASSWORD=omnichannel123
POSTGRES_DB=omnichannel
POSTGRES_PORT=5432
POSTGRES_HOST=localhost

# pgAdmin Configuration (optional)
PGADMIN_EMAIL=admin@omnichannel.com
PGADMIN_PASSWORD=admin123
PGADMIN_PORT=5050
```

### 2. Start Database dengan Docker

```bash
# Masuk ke folder database
cd database

# Start PostgreSQL dan pgAdmin
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f postgres
```

### 3. Verifikasi Database

```bash
# Connect ke database menggunakan psql
docker exec -it omnichannel-postgres psql -U omnichannel -d omnichannel

# Atau test connection dari host
psql -h localhost -p 5432 -U omnichannel -d omnichannel
```

## 🗄️ Database Schema

Database memiliki 3 tabel utama:

### 1. **channels**
- Menyimpan informasi tentang channel messaging (WhatsApp, Telegram, dll)
- Fields: id, name, type, config, is_active, timestamps

### 2. **conversations**
- Menyimpan percakapan dengan kontak/user
- Fields: id, channel_id, external_id, contact_name, status, timestamps

### 3. **messages**
- Menyimpan semua pesan (inbound dan outbound)
- Fields: id, conversation_id, channel_id, content, type, status, timestamps

### Indexes

Database sudah dioptimasi dengan indexes untuk:
- Query berdasarkan channel dan external_id
- Query messages berdasarkan conversation
- Sorting berdasarkan timestamp
- Filter berdasarkan status dan type

### Triggers

1. **Auto-update `updated_at`** - Otomatis update timestamp saat record di-update
2. **Auto-update `last_message_at`** - Otomatis update last message timestamp di conversation saat ada message baru

## 🔧 Management Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose stop

# Stop and remove containers
docker-compose down

# Stop and remove containers + volumes (HAPUS DATA!)
docker-compose down -v

# View logs
docker-compose logs -f

# Restart services
docker-compose restart

# Backup database
docker exec omnichannel-postgres pg_dump -U omnichannel omnichannel > backup.sql

# Restore database
docker exec -i omnichannel-postgres psql -U omnichannel omnichannel < backup.sql
```

## 🌐 pgAdmin Access

pgAdmin tersedia di: `http://localhost:5050`

Login dengan:
- Email: `admin@omnichannel.com` (atau sesuai `.env`)
- Password: `admin123` (atau sesuai `.env`)

Untuk connect ke database di pgAdmin:
- Host: `postgres` (nama service di docker-compose)
- Port: `5432`
- Database: `omnichannel`
- Username: `omnichannel`
- Password: `omnichannel123`

## 📊 Database Connection String

Format connection string untuk aplikasi:

```
postgresql://omnichannel:omnichannel123@localhost:5432/omnichannel
```

Atau dengan format lengkap:

```
postgresql://[user]:[password]@[host]:[port]/[database]
```

## 🔐 Security Notes

1. **Ganti password default** untuk production
2. Jangan expose PostgreSQL port ke internet langsung
3. Gunakan firewall/security groups
4. Enable SSL untuk production
5. Backup database secara rutin

## 🐛 Troubleshooting

### Port sudah digunakan

Jika port 5432 sudah digunakan:

```bash
# Edit docker-compose.yml atau .env
POSTGRES_PORT=5433
```

### Permission denied

```bash
# Fix permissions untuk volumes
sudo chown -R $USER:$USER ./database
```

### Database tidak initialize

```bash
# Hapus volume dan restart
docker-compose down -v
docker-compose up -d
```

### Reset database

```bash
# Hapus semua dan mulai dari awal
docker-compose down -v
docker-compose up -d
```

## 📝 Migration Notes

Jika ingin migrate dari SQLite ke PostgreSQL:

1. Export data dari SQLite
2. Import ke PostgreSQL menggunakan psql atau migration tool
3. Update aplikasi untuk menggunakan PostgreSQL driver

## 🔄 Update Schema

Jika perlu update schema:

1. Edit `init.sql`
2. Stop containers: `docker-compose down`
3. Hapus volumes: `docker-compose down -v`
4. Start lagi: `docker-compose up -d`

**Catatan:** Hapus volume akan menghapus semua data. Backup terlebih dahulu!

## 🚀 Production Setup

Untuk production:

1. Gunakan managed PostgreSQL service (AWS RDS, Google Cloud SQL, dll)
2. Setup replication dan backups
3. Enable monitoring dan alerts
4. Setup connection pooling (PgBouncer)
5. Tune PostgreSQL configuration untuk workload

