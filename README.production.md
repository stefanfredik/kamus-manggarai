# 🚀 Panduan Deployment Production — Kamus Manggarai

**Domain:** `kamus.florescyber.tech`  
**Stack:** Go + React + PostgreSQL + Redis + Nginx (Docker Compose)

---

## Prasyarat Server (VPS Ubuntu/Debian)

### 1. Install Docker & Docker Compose v2

```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Verifikasi
docker --version
docker compose version  # Harus v2.x
```

### 2. Install tools tambahan

```bash
sudo apt install -y git certbot curl wget ufw
```

### 3. Setup Firewall

```bash
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP (untuk Let's Encrypt)
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
sudo ufw status
```

---

## Langkah-Langkah Deployment

### Step 1: Clone Repository

```bash
cd /opt
sudo git clone https://github.com/stefanfredik/kamus-manggarai.git
sudo chown -R $USER:$USER /opt/kamus-manggarai
cd /opt/kamus-manggarai
```

### Step 2: Setup Environment Production

```bash
cp backend/.env.production.example backend/.env
nano backend/.env
```

**Variabel yang WAJIB diubah:**

| Variabel | Cara Generate |
|----------|---------------|
| `DB_PASSWORD` | `openssl rand -base64 32` |
| `REDIS_PASSWORD` | `openssl rand -base64 32` |
| `JWT_ACCESS_SECRET` | `openssl rand -base64 64` |
| `JWT_REFRESH_SECRET` | `openssl rand -base64 64` |
| `GOOGLE_CLIENT_ID` | Dari Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Dari Google Cloud Console |

### Step 3: Setup Google OAuth untuk Production

1. Buka [Google Cloud Console](https://console.cloud.google.com/)
2. Navigasi ke **APIs & Services → Credentials**
3. Klik OAuth 2.0 Client ID Anda
4. Di bagian **Authorized redirect URIs**, tambahkan:
   ```
   https://kamus.florescyber.tech/api/v1/auth/google/callback
   ```
5. Simpan perubahan

### Step 4: Dapatkan Sertifikat SSL (Let's Encrypt)

**4a. Jalankan Nginx dulu (HTTP only, sementara):**

> Edit sementara `nginx/nginx.conf` untuk menonaktifkan blok HTTPS dan hanya pakai port 80
> **ATAU** gunakan konfigurasi bootstrap berikut:

```bash
# Buat nginx config sementara hanya untuk ACME challenge
cat > /tmp/nginx-bootstrap.conf << 'EOF'
events { worker_connections 1024; }
http {
    server {
        listen 80;
        server_name kamus.florescyber.tech;
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }
        location / { return 200 "OK"; }
    }
}
EOF

docker run -d --name nginx-bootstrap \
  -p 80:80 \
  -v /tmp/nginx-bootstrap.conf:/etc/nginx/nginx.conf:ro \
  -v certbot_webroot:/var/www/certbot \
  nginx:alpine

# Dapatkan sertifikat
sudo certbot certonly \
  --webroot \
  --webroot-path=/var/lib/docker/volumes/certbot_webroot/_data \
  -d kamus.florescyber.tech \
  --email admin@florescyber.tech \
  --agree-tos \
  --non-interactive

# Salin sertifikat
sudo cp /etc/letsencrypt/live/kamus.florescyber.tech/fullchain.pem nginx/ssl/fullchain.pem
sudo cp /etc/letsencrypt/live/kamus.florescyber.tech/privkey.pem nginx/ssl/privkey.pem
sudo chmod 644 nginx/ssl/fullchain.pem
sudo chmod 600 nginx/ssl/privkey.pem

# Hentikan nginx sementara
docker stop nginx-bootstrap && docker rm nginx-bootstrap
```

### Step 5: Deploy Stack Production

```bash
chmod +x deploy.sh
./deploy.sh
```

Atau jalankan manual:

```bash
docker compose up -d --build
```

### Step 6: Verifikasi

```bash
# Cek semua container berjalan
docker compose ps

# Cek health backend
curl https://kamus.florescyber.tech/health

# Cek log jika ada masalah
docker compose logs -f backend
docker compose logs -f nginx
```

---

## Operasi Sehari-hari

### Deploy Update Terbaru

```bash
cd /opt/kamus-manggarai
./deploy.sh
```

### Lihat Log Real-time

```bash
docker compose logs -f              # semua service
docker compose logs -f backend      # backend saja
docker compose logs -f nginx        # nginx saja
```

### Restart Service Tertentu

```bash
docker compose restart backend
docker compose restart nginx
```

### Backup Database

```bash
# Buat backup
docker compose exec postgres pg_dump \
  -U kamus_user kamus_manggarai > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
cat backup.sql | docker compose exec -T postgres \
  psql -U kamus_user kamus_manggarai
```

### Perpanjangan SSL Otomatis

Tambahkan ke crontab (`crontab -e`):

```bash
0 3 1 */2 * certbot renew --quiet && \
  cp /etc/letsencrypt/live/kamus.florescyber.tech/fullchain.pem /opt/kamus-manggarai/nginx/ssl/fullchain.pem && \
  cp /etc/letsencrypt/live/kamus.florescyber.tech/privkey.pem /opt/kamus-manggarai/nginx/ssl/privkey.pem && \
  docker compose -f /opt/kamus-manggarai/docker-compose.yml exec nginx nginx -s reload
```

---

## Checklist Pre-Launch ✅

- [ ] `.env` production sudah diisi dengan nilai yang kuat
- [ ] `DB_PASSWORD`, `REDIS_PASSWORD` sudah diganti dari placeholder
- [ ] `JWT_ACCESS_SECRET` dan `JWT_REFRESH_SECRET` sudah di-generate (min 64 karakter)
- [ ] `GOOGLE_REDIRECT_URL` sudah diupdate ke `https://kamus.florescyber.tech/...`
- [ ] URL production sudah ditambahkan di Google Cloud Console OAuth
- [ ] Sertifikat SSL sudah diletakkan di `nginx/ssl/`
- [ ] Domain `kamus.florescyber.tech` sudah mengarah ke IP VPS (cek DNS A record)
- [ ] Firewall sudah dikonfigurasi (port 80, 443, 22)
- [ ] Database migration sudah berjalan sukses
- [ ] Health check `https://kamus.florescyber.tech/health` mengembalikan 200

---

## Troubleshooting Umum

### Container tidak mau start

```bash
docker compose logs [service-name]
```

### Database connection error

```bash
# Pastikan variabel DB di .env sudah benar
docker compose exec backend env | grep DB_
```

### SSL tidak berfungsi

```bash
# Verifikasi sertifikat ada
ls -la nginx/ssl/
# Verifikasi sertifikat valid
openssl x509 -in nginx/ssl/fullchain.pem -text -noout | grep -E "Not (Before|After)"
```

### Port 80/443 sudah dipakai

```bash
sudo netstat -tlnp | grep -E "80|443"
sudo systemctl stop apache2  # jika apache aktif
```
