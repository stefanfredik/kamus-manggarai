package middleware

import (
	"context"
	"net"
	"strings"

	"github.com/gofiber/fiber/v3"
	"github.com/kamus-manggarai/backend/internal/domain/repository"
	"github.com/kamus-manggarai/backend/pkg/apperror"
	"github.com/kamus-manggarai/backend/pkg/response"
)

type RateLimitConfig struct {
	WindowSeconds int
	Max           int
	KeyPrefix     string
	// TrustedProxies adalah CIDR yang diizinkan untuk X-Forwarded-For.
	// Jika kosong, hanya IP langsung (c.IP()) yang digunakan.
	TrustedProxies []string
}

// trustedProxyNets adalah jaringan Docker internal (nginx berada di sini).
var trustedProxyNets = parseCIDRs([]string{
	"172.16.0.0/12",  // Docker default bridge (172.17.0.0/16 dan variannya)
	"192.168.0.0/16", // LAN umum
	"10.0.0.0/8",     // Internal cloud/VPS
	"127.0.0.1/32",   // Loopback
})

func parseCIDRs(cidrs []string) []*net.IPNet {
	nets := make([]*net.IPNet, 0, len(cidrs))
	for _, c := range cidrs {
		_, ipNet, err := net.ParseCIDR(c)
		if err == nil {
			nets = append(nets, ipNet)
		}
	}
	return nets
}

func isTrustedProxy(ip string) bool {
	parsed := net.ParseIP(ip)
	if parsed == nil {
		return false
	}
	for _, n := range trustedProxyNets {
		if n.Contains(parsed) {
			return true
		}
	}
	return false
}

func RateLimit(cache repository.CacheRepository, cfg RateLimitConfig) fiber.Handler {
	return func(c fiber.Ctx) error {
		ip := clientIP(c)
		key := cfg.KeyPrefix + ":" + ip
		ctx := context.Background()
		count, err := cache.Incr(ctx, key, cfg.WindowSeconds)
		if err != nil {
			return c.Next()
		}
		if int(count) > cfg.Max {
			return response.Error(c, apperror.ErrTooManyReq)
		}
		return c.Next()
	}
}

// clientIP mengembalikan IP klien yang sesungguhnya.
// X-Forwarded-For hanya dipercaya jika request berasal dari proxy yang trusted (Nginx Docker internal).
// Ini mencegah klien jahat memalsukan IP mereka untuk bypass rate limiting.
func clientIP(c fiber.Ctx) string {
	remoteIP := c.IP()

	if isTrustedProxy(remoteIP) {
		// Proxy kita adalah trusted — ambil IP paling kiri dari X-Forwarded-For
		if xff := c.Get("X-Forwarded-For"); xff != "" {
			parts := strings.Split(xff, ",")
			clientAddr := strings.TrimSpace(parts[0])
			if net.ParseIP(clientAddr) != nil {
				return clientAddr
			}
		}
		if xri := c.Get("X-Real-IP"); xri != "" {
			if net.ParseIP(xri) != nil {
				return xri
			}
		}
	}

	// Request langsung atau dari proxy tidak trusted — gunakan IP koneksi
	return remoteIP
}

