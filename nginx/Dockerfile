# Nginx + Frontend Static Builder
# Multi-stage build:
#   Stage 1: Build React app
#   Stage 2: Nginx sajikan static files langsung (tanpa container frontend terpisah)

# ─── Stage 1: Build Frontend ─────────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /app

ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY frontend/package*.json ./
RUN npm ci --prefer-offline

COPY frontend/ .
RUN npm run build

# ─── Stage 2: Nginx dengan static files built-in ────────────────────────────
FROM nginx:1.25-alpine

# Install curl untuk health check
RUN apk add --no-cache curl

# Salin konfigurasi nginx
COPY nginx/nginx.conf /etc/nginx/nginx.conf

# Salin hasil build frontend dari stage 1
COPY --from=frontend-builder /app/dist /usr/share/nginx/html

# SSL directory (Cloudflare Origin CA, di-mount dari luar)
RUN mkdir -p /etc/nginx/ssl

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
