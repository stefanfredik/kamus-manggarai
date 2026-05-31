package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v3"
)

func CORS(allowOrigin string) fiber.Handler {
	allowed := strings.Split(allowOrigin, ",")
	for i := range allowed {
		allowed[i] = strings.TrimSpace(allowed[i])
	}
	return func(c fiber.Ctx) error {
		origin := c.Get("Origin")
		if origin != "" {
			for _, a := range allowed {
				if a == "*" || a == origin {
					c.Set("Access-Control-Allow-Origin", origin)
					c.Set("Vary", "Origin")
					break
				}
			}
		}
		c.Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Set("Access-Control-Allow-Headers", "Authorization, Content-Type, Accept, X-Requested-With")
		c.Set("Access-Control-Allow-Credentials", "true")
		c.Set("Access-Control-Max-Age", "600")

		if c.Method() == fiber.MethodOptions {
			return c.SendStatus(fiber.StatusNoContent)
		}
		return c.Next()
	}
}
