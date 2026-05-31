package handler

import (
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/kamus-manggarai/backend/internal/delivery/http/middleware"
	"github.com/kamus-manggarai/backend/internal/usecase"
	"github.com/kamus-manggarai/backend/pkg/apperror"
	"github.com/kamus-manggarai/backend/pkg/response"
)

type AuthHandler struct {
	authUC       *usecase.AuthUseCase
	frontendURL  string
	cookieSecure bool
}

func NewAuthHandler(authUC *usecase.AuthUseCase, frontendURL string, cookieSecure bool) *AuthHandler {
	return &AuthHandler{authUC: authUC, frontendURL: frontendURL, cookieSecure: cookieSecure}
}

func (h *AuthHandler) GoogleStart(c fiber.Ctx) error {
	state := c.Query("state", "default")
	url := h.authUC.GoogleAuthURL(state)
	return c.Redirect().Status(fiber.StatusFound).To(url)
}

func (h *AuthHandler) GoogleCallback(c fiber.Ctx) error {
	code := c.Query("code")
	if code == "" {
		return response.Error(c, apperror.ErrBadRequest.WithMessage("code dibutuhkan"))
	}

	result, err := h.authUC.GoogleCallback(c.Context(), code)
	if err != nil {
		return response.Error(c, err)
	}

	h.setRefreshCookie(c, result.RefreshToken, time.Now().Add(7*24*time.Hour))

	redirectURL := h.frontendURL + "/auth/callback?token=" + result.AccessToken
	return c.Redirect().Status(fiber.StatusFound).To(redirectURL)
}

type refreshRequest struct {
	RefreshToken string `json:"refresh_token,omitempty"`
}

func (h *AuthHandler) Refresh(c fiber.Ctx) error {
	refreshToken := c.Cookies("refresh_token")
	if refreshToken == "" {
		var req refreshRequest
		_ = c.Bind().Body(&req)
		refreshToken = req.RefreshToken
	}

	result, err := h.authUC.Refresh(c.Context(), refreshToken)
	if err != nil {
		return response.Error(c, err)
	}
	h.setRefreshCookie(c, result.RefreshToken, time.Now().Add(7*24*time.Hour))

	return response.Success(c, fiber.Map{
		"access_token": result.AccessToken,
		"expires_in":   result.ExpiresIn,
		"user":         result.User,
	})
}

func (h *AuthHandler) Logout(c fiber.Ctx) error {
	refreshToken := c.Cookies("refresh_token")
	_ = h.authUC.Logout(c.Context(), refreshToken)

	c.Cookie(&fiber.Cookie{
		Name:     "refresh_token",
		Value:    "",
		Path:     "/",
		Expires:  time.Now().Add(-time.Hour),
		HTTPOnly: true,
		Secure:   h.cookieSecure,
		SameSite: "Lax",
	})

	return response.Success(c, fiber.Map{"message": "logout berhasil"})
}

func (h *AuthHandler) Me(c fiber.Ctx) error {
	uid, ok := middleware.GetUserID(c)
	if !ok {
		return response.Error(c, apperror.ErrUnauthorized)
	}
	user, err := h.authUC.GetUserByID(c.Context(), uid)
	if err != nil {
		return response.Error(c, err)
	}
	return response.Success(c, user)
}

func (h *AuthHandler) setRefreshCookie(c fiber.Ctx, token string, expires time.Time) {
	c.Cookie(&fiber.Cookie{
		Name:     "refresh_token",
		Value:    token,
		Path:     "/",
		Expires:  expires,
		HTTPOnly: true,
		Secure:   h.cookieSecure,
		SameSite: "Lax",
	})
}

type registerRequest struct {
	Email    string `json:"email"`
	Name     string `json:"name"`
	Password string `json:"password"`
}

func (h *AuthHandler) Register(c fiber.Ctx) error {
	var req registerRequest
	if err := c.Bind().Body(&req); err != nil {
		return response.Error(c, apperror.ErrBadRequest.WithCause(err))
	}
	result, err := h.authUC.Register(c.Context(), usecase.RegisterInput{
		Email:    req.Email,
		Name:     req.Name,
		Password: req.Password,
	})
	if err != nil {
		return response.Error(c, err)
	}
	h.setRefreshCookie(c, result.RefreshToken, time.Now().Add(7*24*time.Hour))
	return response.Created(c, fiber.Map{
		"access_token": result.AccessToken,
		"expires_in":   result.ExpiresIn,
		"user":         result.User,
	})
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (h *AuthHandler) Login(c fiber.Ctx) error {
	var req loginRequest
	if err := c.Bind().Body(&req); err != nil {
		return response.Error(c, apperror.ErrBadRequest.WithCause(err))
	}
	result, err := h.authUC.Login(c.Context(), req.Email, req.Password)
	if err != nil {
		return response.Error(c, err)
	}
	h.setRefreshCookie(c, result.RefreshToken, time.Now().Add(7*24*time.Hour))
	return response.Success(c, fiber.Map{
		"access_token": result.AccessToken,
		"expires_in":   result.ExpiresIn,
		"user":         result.User,
	})
}
