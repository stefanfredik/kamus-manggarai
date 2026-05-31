package middleware

import (
	"context"
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

func clientIP(c fiber.Ctx) string {
	if xff := c.Get("X-Forwarded-For"); xff != "" {
		parts := strings.Split(xff, ",")
		return strings.TrimSpace(parts[0])
	}
	if xri := c.Get("X-Real-IP"); xri != "" {
		return xri
	}
	return c.IP()
}
