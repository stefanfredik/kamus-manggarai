package handler

import (
	"strconv"
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
	// State sekarang di-generate server-side dan disimpan di cache untuk mencegah CSRF
	url, err := h.authUC.GoogleAuthURL(c.Context())
	if err != nil {
		return response.Error(c, err)
	}
	return c.Redirect().Status(fiber.StatusFound).To(url)
}

func (h *AuthHandler) GoogleCallback(c fiber.Ctx) error {
	code := c.Query("code")
	if code == "" {
		return response.Error(c, apperror.ErrBadRequest.WithMessage("code dibutuhkan"))
	}
	state := c.Query("state", "")
	if state == "" {
		return response.Error(c, apperror.ErrBadRequest.WithMessage("state dibutuhkan"))
	}

	result, err := h.authUC.GoogleCallback(c.Context(), state, code)
	if err != nil {
		return response.Error(c, err)
	}

	h.setRefreshCookie(c, result.RefreshToken, time.Now().Add(7*24*time.Hour))

	// Token TIDAK dikirim via URL (mencegah bocor di browser history / server logs)
	// Simpan token sementara di Redis selama 60 detik, lalu frontend tukarkan via POST
	tmpCode, err := h.authUC.StoreTokenCode(c.Context(), result.AccessToken)
	if err != nil {
		// Fallback: kirim via URL jika Redis bermasalah (tidak ideal tapi tidak block login)
		redirectURL := h.frontendURL + "/auth/callback?token=" + result.AccessToken
		return c.Redirect().Status(fiber.StatusFound).To(redirectURL)
	}

	redirectURL := h.frontendURL + "/auth/callback?code=" + tmpCode
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

type tokenExchangeRequest struct {
	Code string `json:"code"`
}

// TokenExchange menukar kode sementara (dari OAuth callback URL) menjadi access token.
// Endpoint ini dipanggil via POST dari halaman callback frontend sehingga token
// tidak pernah muncul di URL, browser history, atau server access logs.
func (h *AuthHandler) TokenExchange(c fiber.Ctx) error {
	var req tokenExchangeRequest
	if err := c.Bind().Body(&req); err != nil {
		return response.Error(c, apperror.ErrBadRequest.WithCause(err))
	}
	token, err := h.authUC.ExchangeTokenCode(c.Context(), req.Code)
	if err != nil {
		return response.Error(c, err)
	}
	return response.Success(c, fiber.Map{
		"access_token": token,
	})
}

type changePasswordRequest struct {
	CurrentPassword string `json:"current_password"`
	NewPassword     string `json:"new_password"`
}

func (h *AuthHandler) ChangePassword(c fiber.Ctx) error {
	uid, ok := middleware.GetUserID(c)
	if !ok {
		return response.Error(c, apperror.ErrUnauthorized)
	}
	var req changePasswordRequest
	if err := c.Bind().Body(&req); err != nil {
		return response.Error(c, apperror.ErrBadRequest.WithCause(err))
	}
	if err := h.authUC.ChangePassword(c.Context(), uid, req.CurrentPassword, req.NewPassword); err != nil {
		return response.Error(c, err)
	}
	return response.Success(c, fiber.Map{"message": "password berhasil diubah"})
}

type updateProfileRequest struct {
	Name  string `json:"name"`
	Email string `json:"email"`
}

func (h *AuthHandler) UpdateProfile(c fiber.Ctx) error {
	uid, ok := middleware.GetUserID(c)
	if !ok {
		return response.Error(c, apperror.ErrUnauthorized)
	}
	var req updateProfileRequest
	if err := c.Bind().Body(&req); err != nil {
		return response.Error(c, apperror.ErrBadRequest.WithCause(err))
	}
	if err := h.authUC.UpdateProfile(c.Context(), uid, req.Name, req.Email); err != nil {
		return response.Error(c, err)
	}
	return response.Success(c, fiber.Map{"message": "profil berhasil diperbarui"})
}

func (h *AuthHandler) GetLeaderboard(c fiber.Ctx) error {
	limit := 50
	if l := c.Query("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 {
			limit = parsed
		}
	}
	leaderboard, err := h.authUC.GetLeaderboard(c.Context(), limit)
	if err != nil {
		return response.Error(c, err)
	}
	return response.Success(c, leaderboard)
}

