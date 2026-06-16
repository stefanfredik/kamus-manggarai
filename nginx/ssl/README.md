# Direktori SSL — Kamus Manggarai

Letakkan file sertifikat SSL Let's Encrypt di direktori ini.

## File yang Dibutuhkan

| File | Deskripsi |
|------|-----------|
| `fullchain.pem` | Sertifikat lengkap (cert + chain) dari Let's Encrypt |
| `privkey.pem`   | Private key dari Let's Encrypt |

## Cara Mendapatkan Sertifikat (Let's Encrypt + Certbot)

### 1. Install Certbot di VPS

```bash
sudo apt update
sudo apt install -y certbot
```

### 2. Jalankan stack DULU tanpa SSL (HTTP saja)

Sebelum menjalankan certbot, pastikan nginx sudah berjalan untuk path ACME challenge:

```bash
docker compose up -d nginx
```

### 3. Dapatkan sertifikat via certbot webroot

```bash
sudo certbot certonly \
  --webroot \
  --webroot-path=/var/lib/docker/volumes/kamus-manggarai_certbot_webroot/_data \
  -d kamus.florescyber.tech \
  --email admin@florescyber.tech \
  --agree-tos \
  --non-interactive
```

### 4. Salin sertifikat ke direktori ini

```bash
sudo cp /etc/letsencrypt/live/kamus.florescyber.tech/fullchain.pem ./nginx/ssl/fullchain.pem
sudo cp /etc/letsencrypt/live/kamus.florescyber.tech/privkey.pem ./nginx/ssl/privkey.pem
sudo chmod 644 ./nginx/ssl/fullchain.pem
sudo chmod 600 ./nginx/ssl/privkey.pem
```

### 5. Restart nginx dengan konfigurasi HTTPS

```bash
docker compose restart nginx
```

## Perpanjangan Otomatis

Tambahkan cron job di VPS untuk perpanjangan otomatis setiap 60 hari:

```bash
# Edit crontab
crontab -e

# Tambahkan baris ini:
0 3 1 */2 * certbot renew --quiet && \
  cp /etc/letsencrypt/live/kamus.florescyber.tech/fullchain.pem /path/to/kamus-manggarai/nginx/ssl/fullchain.pem && \
  cp /etc/letsencrypt/live/kamus.florescyber.tech/privkey.pem /path/to/kamus-manggarai/nginx/ssl/privkey.pem && \
  docker compose -f /path/to/kamus-manggarai/docker-compose.yml exec nginx nginx -s reload
```
