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
sudo apt install -y git curl wget ufw
```

### 3. Setup Firewall

```bash
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP (redirect ke HTTPS)
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

### Step 4: Setup SSL (Cloudflare Origin CA)

> **Prasyarat:** Domain `kamus.florescyber.tech` sudah dikelola di Cloudflare
> dengan DNS A record mengarah ke IP VPS dan **Proxy status: Proxied** (☁️).

**4a. Set SSL Mode di Cloudflare Dashboard:**

- Buka **SSL/TLS → Overview** → pilih **Full (Strict)**

**4b. Generate Origin Certificate:**

1. Buka **SSL/TLS → Origin Server → Create Certificate**
2. Pilih:
   - Private key type: **RSA (2048)**
   - Hostnames: `*.florescyber.tech, florescyber.tech`
   - Validity: **15 years**
3. Klik **Create**

**4c. Simpan sertifikat ke VPS:**

```bash
# Paste Origin Certificate dari Cloudflare
nano nginx/ssl/fullchain.pem

# Paste Private Key dari Cloudflare
nano nginx/ssl/privkey.pem

# Set permission
chmod 644 nginx/ssl/fullchain.pem
chmod 600 nginx/ssl/privkey.pem
```

> ⚠️ **PENTING:** Cloudflare tidak menyimpan private key setelah halaman ditutup.
> Pastikan Anda menyimpan backup di tempat aman.

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

### Catatan SSL

Sertifikat Cloudflare Origin CA berlaku **15 tahun** — tidak perlu renewal otomatis.
Tanggal expired bisa dicek dengan:

```bash
openssl x509 -in nginx/ssl/fullchain.pem -text -noout | grep "Not After"
```

---

## Checklist Pre-Launch ✅

- [ ] `.env` production sudah diisi dengan nilai yang kuat
- [ ] `DB_PASSWORD`, `REDIS_PASSWORD` sudah diganti dari placeholder
- [ ] `JWT_ACCESS_SECRET` dan `JWT_REFRESH_SECRET` sudah di-generate (min 64 karakter)
- [ ] `GOOGLE_REDIRECT_URL` sudah diupdate ke `https://kamus.florescyber.tech/...`
- [ ] URL production sudah ditambahkan di Google Cloud Console OAuth
- [ ] Sertifikat Cloudflare Origin CA sudah diletakkan di `nginx/ssl/`
- [ ] Cloudflare SSL/TLS mode sudah di-set ke **Full (Strict)**
- [ ] Domain `kamus.florescyber.tech` sudah mengarah ke IP VPS dengan Proxy **Proxied** (☁️)
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
