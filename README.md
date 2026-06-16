# Kamus Digital Bahasa Manggarai – Bahasa Indonesia

Platform kamus dua arah Bahasa Manggarai ↔ Bahasa Indonesia dengan sistem kontribusi komunitas.

## Stack Teknologi

- **Backend**: Go 1.23+ (Fiber v3, pgx)
- **Frontend**: React 19 + TypeScript + Vite 6 + Tailwind CSS v3
- **Database**: PostgreSQL 16
- **Cache**: Redis 7
- **Search**: PostgreSQL full-text/trigram search
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

# 4. Import data kamus awal
docker-compose exec backend ./import_kbim -file /data/kamus_indonesia_manggarai.json
```

Akses:
- Frontend: http://localhost:8088
- Backend API: http://localhost:8088/api/v1

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
