# Direktori SSL — Kamus Manggarai

Sertifikat SSL menggunakan **Cloudflare Origin CA** dengan mode **Full (Strict)**.

## Prasyarat

- Domain `kamus.florescyber.tech` sudah di-manage di Cloudflare
- DNS A record mengarah ke IP VPS dengan **Proxy status: Proxied** (☁️ orange cloud)
- SSL/TLS mode di Cloudflare dashboard di-set ke **Full (Strict)**

## File yang Dibutuhkan

| File | Deskripsi |
|------|-----------|
| `fullchain.pem` | Origin Certificate dari Cloudflare |
| `privkey.pem`   | Private Key dari Cloudflare |

## Cara Mendapatkan Sertifikat

### 1. Buka Cloudflare Dashboard

Masuk ke: **SSL/TLS → Origin Server → Create Certificate**

### 2. Generate Certificate

- **Private key type**: RSA (2048)
- **Hostnames**: `*.florescyber.tech, florescyber.tech`
- **Certificate Validity**: 15 years
- Klik **Create**

### 3. Salin Sertifikat

Setelah certificate dibuat, Cloudflare akan menampilkan dua blok teks:

**Origin Certificate** → simpan sebagai `fullchain.pem`:

```bash
nano ./nginx/ssl/fullchain.pem
# Paste isi "Origin Certificate" dari Cloudflare, lalu save
```

**Private Key** → simpan sebagai `privkey.pem`:

```bash
nano ./nginx/ssl/privkey.pem
# Paste isi "Private Key" dari Cloudflare, lalu save
```

### 4. Set Permission

```bash
chmod 644 ./nginx/ssl/fullchain.pem
chmod 600 ./nginx/ssl/privkey.pem
```

### 5. Restart Nginx

```bash
docker compose restart nginx
```

## Setting Cloudflare Dashboard

Pastikan konfigurasi berikut di Cloudflare Dashboard:

| Setting | Nilai |
|---------|-------|
| **SSL/TLS Mode** | Full (Strict) |
| **Always Use HTTPS** | On |
| **Minimum TLS Version** | 1.2 |
| **Automatic HTTPS Rewrites** | On |
| **DNS Proxy Status** | Proxied (☁️) |

## Catatan Penting

- ⚠️ **JANGAN share private key** — file `privkey.pem` sudah ada di `.gitignore`
- 🔒 Sertifikat Origin CA **hanya valid** jika traffic melewati Cloudflare proxy.
  Jika proxy dimatikan (grey cloud), browser akan menampilkan SSL warning.
- 🕐 Sertifikat berlaku **15 tahun** — tidak perlu renewal otomatis seperti Let's Encrypt
- 📋 Simpan backup sertifikat di tempat aman. Cloudflare tidak menyimpan private key setelah halaman ditutup.
