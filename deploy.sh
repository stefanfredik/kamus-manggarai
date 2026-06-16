#!/usr/bin/env bash
# =============================================================================
# deploy.sh — Production Deployment Script
# Kamus Manggarai | kamus.florescyber.tech
#
# CARA PAKAI:
#   chmod +x deploy.sh
#   ./deploy.sh
# =============================================================================

set -euo pipefail

# Warna untuk output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ─── Fungsi Helper ───────────────────────────────────────────────────────────
log_info()    { echo -e "${BLUE}[INFO]${NC} $*"; }
log_success() { echo -e "${GREEN}[OK]${NC} $*"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# ─── Konfigurasi ─────────────────────────────────────────────────────────────
COMPOSE_FILE="docker-compose.yml"
BACKEND_ENV_FILE="backend/.env"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ─── Validasi Lingkungan ─────────────────────────────────────────────────────
log_info "Memeriksa prasyarat..."

command -v docker   >/dev/null 2>&1 || log_error "Docker tidak ditemukan. Install Docker terlebih dahulu."
command -v git      >/dev/null 2>&1 || log_error "Git tidak ditemukan."

# Periksa Docker Compose v2
docker compose version >/dev/null 2>&1 || log_error "Docker Compose v2 tidak ditemukan. Update Docker ke versi terbaru."

# Periksa file .env
if [ ! -f "$PROJECT_DIR/$BACKEND_ENV_FILE" ]; then
    log_error "File $BACKEND_ENV_FILE tidak ditemukan!\nJalankan: cp backend/.env.production.example backend/.env && nano backend/.env"
fi

# Periksa sertifikat SSL
if [ ! -f "$PROJECT_DIR/nginx/ssl/fullchain.pem" ] || [ ! -f "$PROJECT_DIR/nginx/ssl/privkey.pem" ]; then
    log_warn "Sertifikat SSL belum ditemukan di nginx/ssl/"
    log_warn "Lihat nginx/ssl/README.md untuk cara mendapatkan sertifikat Let's Encrypt"
    read -rp "Lanjutkan tanpa SSL? (hanya HTTP, tidak aman untuk production) [y/N] " confirm
    [[ "$confirm" =~ ^[Yy]$ ]] || exit 1
fi

log_success "Prasyarat terpenuhi"

# ─── Tarik Kode Terbaru ───────────────────────────────────────────────────────
log_info "Menarik kode terbaru dari Git..."
cd "$PROJECT_DIR"
git pull origin main
log_success "Kode terbaru sudah ditarik"

# ─── Build Image Docker ───────────────────────────────────────────────────────
log_info "Membangun image Docker (ini bisa memakan waktu beberapa menit)..."
docker compose -f "$COMPOSE_FILE" build --no-cache
log_success "Build image selesai"

# ─── Jalankan Migration Database ─────────────────────────────────────────────
log_info "Menjalankan migration database..."
docker compose -f "$COMPOSE_FILE" up -d postgres redis
log_info "Menunggu database siap..."
sleep 10

docker compose -f "$COMPOSE_FILE" run --rm migrate
log_success "Migration database selesai"

# ─── Deploy Stack Utama ───────────────────────────────────────────────────────
log_info "Menjalankan seluruh stack production..."
docker compose -f "$COMPOSE_FILE" up -d --remove-orphans
log_success "Stack production berjalan"

# ─── Health Check ─────────────────────────────────────────────────────────────
log_info "Memeriksa health check backend..."
sleep 15  # Beri waktu backend untuk startup

MAX_RETRIES=5
RETRY=0
until curl -sf http://localhost/health >/dev/null 2>&1; do
    RETRY=$((RETRY + 1))
    if [ "$RETRY" -ge "$MAX_RETRIES" ]; then
        log_error "Backend tidak merespons setelah $MAX_RETRIES percobaan.\nCek log: docker compose logs backend"
    fi
    log_warn "Backend belum siap, mencoba lagi ($RETRY/$MAX_RETRIES)..."
    sleep 10
done

log_success "Backend sehat ✓"

# ─── Tampilkan Status ─────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ DEPLOYMENT BERHASIL!${NC}"
echo -e "${GREEN}  🌐 https://kamus.florescyber.tech${NC}"
echo -e "${GREEN}════════════════════════════════════════════${NC}"
echo ""
echo "Status container:"
docker compose -f "$COMPOSE_FILE" ps
