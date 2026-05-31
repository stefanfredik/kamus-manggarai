package middleware

import (
	"github.com/gofiber/fiber/v3"
	"github.com/kamus-manggarai/backend/internal/domain/entity"
	"github.com/kamus-manggarai/backend/pkg/apperror"
	"github.com/kamus-manggarai/backend/pkg/response"
)

func RequireRole(roles ...string) fiber.Handler {
	allowed := make(map[string]struct{}, len(roles))
	for _, r := range roles {
		allowed[r] = struct{}{}
	}
	return func(c fiber.Ctx) error {
		role := GetRole(c)
		if role == "" {
			return response.Error(c, apperror.ErrUnauthorized)
		}
		if _, ok := allowed[role]; !ok {
			return response.Error(c, apperror.ErrForbidden)
		}
		return c.Next()
	}
}

func RequireValidatorOrAdmin() fiber.Handler {
	return RequireRole(entity.RoleValidator, entity.RoleAdmin)
}

func RequireAdmin() fiber.Handler {
	return RequireRole(entity.RoleAdmin)
}

func RequireContributor() fiber.Handler {
	return RequireRole(entity.RoleContributor, entity.RoleValidator, entity.RoleAdmin)
}
