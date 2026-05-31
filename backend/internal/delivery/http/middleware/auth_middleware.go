package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
	"github.com/kamus-manggarai/backend/internal/usecase"
	"github.com/kamus-manggarai/backend/pkg/apperror"
	"github.com/kamus-manggarai/backend/pkg/response"
)

const (
	CtxKeyUserID = "user_id"
	CtxKeyEmail  = "user_email"
	CtxKeyRole   = "user_role"
)

func AuthRequired(authUC *usecase.AuthUseCase) fiber.Handler {
	return func(c fiber.Ctx) error {
		header := c.Get("Authorization")
		if header == "" {
			return response.Error(c, apperror.ErrUnauthorized)
		}

		parts := strings.SplitN(header, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			return response.Error(c, apperror.ErrUnauthorized.WithMessage("format Authorization header tidak valid"))
		}

		claims, err := authUC.ParseAccessToken(parts[1])
		if err != nil {
			return response.Error(c, err)
		}

		uid, err := uuid.Parse(claims.UserID)
		if err != nil {
			return response.Error(c, apperror.ErrUnauthorized)
		}

		c.Locals(CtxKeyUserID, uid)
		c.Locals(CtxKeyEmail, claims.Email)
		c.Locals(CtxKeyRole, claims.Role)
		return c.Next()
	}
}

func AuthOptional(authUC *usecase.AuthUseCase) fiber.Handler {
	return func(c fiber.Ctx) error {
		header := c.Get("Authorization")
		if header == "" {
			return c.Next()
		}
		parts := strings.SplitN(header, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			return c.Next()
		}
		claims, err := authUC.ParseAccessToken(parts[1])
		if err != nil {
			return c.Next()
		}
		uid, err := uuid.Parse(claims.UserID)
		if err != nil {
			return c.Next()
		}
		c.Locals(CtxKeyUserID, uid)
		c.Locals(CtxKeyEmail, claims.Email)
		c.Locals(CtxKeyRole, claims.Role)
		return c.Next()
	}
}

func GetUserID(c fiber.Ctx) (uuid.UUID, bool) {
	v := c.Locals(CtxKeyUserID)
	if v == nil {
		return uuid.Nil, false
	}
	uid, ok := v.(uuid.UUID)
	return uid, ok
}

func GetRole(c fiber.Ctx) string {
	v := c.Locals(CtxKeyRole)
	if v == nil {
		return ""
	}
	if s, ok := v.(string); ok {
		return s
	}
	return ""
}
