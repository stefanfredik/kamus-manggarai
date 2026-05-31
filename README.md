# Kamus Digital Bahasa Manggarai – Bahasa Indonesia

Platform kamus dua arah Bahasa Manggarai ↔ Bahasa Indonesia dengan dukungan multi-dialek dan sistem kontribusi komunitas.

## Stack Teknologi

- **Backend**: Go 1.23+ (Fiber v3, sqlc, pgx)
- **Frontend**: React 19 + TypeScript + Vite 6 + Tailwind CSS v4
- **Database**: PostgreSQL 16
- **Cache**: Redis 7
- **Search**: Meilisearch v1.x
- **Reverse Proxy**: Nginx
- **Containerization**: Docker + Docker Compose

## Quick Start (Development)

### Prasyarat

- Docker & Docker Compose
- Node.js 20+ (untuk pengembangan frontend tanpa container)
- Go 1.23+ (untuk pengembangan backend tanpa container)

### Setup Pertama Kali

```bash
# 1. Copy environment file
cp backend/.env.example backend/.env

# 2. Build dan jalankan semua service
docker-compose up -d --build

# 3. Jalankan migration
docker-compose exec backend ./api migrate up

# 4. Seed data awal (admin + dialek + kosakata contoh)
docker-compose exec backend ./api seed
```

Akses:
- Frontend: http://localhost
- Backend API: http://localhost/api/v1
- Swagger docs: http://localhost/api/v1/docs (development only)

### Development tanpa Docker

**Backend:**
```bash
cd backend
go mod download
go run ./cmd/api
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## Struktur Repository

```
.
├── backend/        # Go API service
├── frontend/       # React SPA
├── nginx/          # Nginx reverse proxy config
├── docs/           # SRS dan dokumentasi
└── docker-compose.yml
```

## Branch Strategy

- `main` — Production-ready code
- `develop` — Integration branch
- `feature/*` — Feature branches
- `fix/*` — Bug fix branches

## Testing

```bash
# Backend
docker-compose exec backend go test ./...

# Frontend
docker-compose exec frontend npm run test
```

## Lisensi

MIT
