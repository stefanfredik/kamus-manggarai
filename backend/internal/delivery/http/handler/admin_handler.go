package handler

import (
	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
	"github.com/kamus-manggarai/backend/internal/delivery/http/middleware"
	"github.com/kamus-manggarai/backend/internal/usecase"
	"github.com/kamus-manggarai/backend/pkg/apperror"
	"github.com/kamus-manggarai/backend/pkg/pagination"
	"github.com/kamus-manggarai/backend/pkg/response"
)

type AdminHandler struct {
	uc       *usecase.AdminUseCase
	wordUC   *usecase.WordUseCase
	analytic usecase.AnalyticsDB
}

func NewAdminHandler(uc *usecase.AdminUseCase, wordUC *usecase.WordUseCase, analytic usecase.AnalyticsDB) *AdminHandler {
	return &AdminHandler{uc: uc, wordUC: wordUC, analytic: analytic}
}

func (h *AdminHandler) ListUsers(c fiber.Ctx) error {
	p := pagination.FromQuery(c)
	users, total, err := h.uc.ListUsers(c.Context(), p.Page, p.Limit)
	if err != nil {
		return response.Error(c, err)
	}
	return response.Paginated(c, users, p.Page, p.Limit, total)
}

type createUserRequest struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
	Role     string `json:"role"`
}

func (h *AdminHandler) CreateUser(c fiber.Ctx) error {
	var req createUserRequest
	if err := c.Bind().Body(&req); err != nil {
		return response.Error(c, apperror.ErrBadRequest.WithCause(err))
	}
	user, err := h.uc.CreateUser(c.Context(), usecase.CreateUserInput{
		Name:     req.Name,
		Email:    req.Email,
		Password: req.Password,
		Role:     req.Role,
	})
	if err != nil {
		return response.Error(c, err)
	}
	return response.Created(c, user)
}

type updateUserRequest struct {
	Name  string `json:"name"`
	Email string `json:"email"`
	Role  string `json:"role"`
}

func (h *AdminHandler) UpdateUser(c fiber.Ctx) error {
	requesterID, ok := middleware.GetUserID(c)
	if !ok {
		return response.Error(c, apperror.ErrUnauthorized)
	}
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.Error(c, apperror.ErrBadRequest)
	}
	var req updateUserRequest
	if err := c.Bind().Body(&req); err != nil {
		return response.Error(c, apperror.ErrBadRequest.WithCause(err))
	}
	user, err := h.uc.UpdateUser(c.Context(), id, requesterID, usecase.UpdateUserInput{
		Name:  req.Name,
		Email: req.Email,
		Role:  req.Role,
	})
	if err != nil {
		return response.Error(c, err)
	}
	return response.Success(c, user)
}

type resetPasswordRequest struct {
	Password string `json:"password"`
}

func (h *AdminHandler) ResetPassword(c fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.Error(c, apperror.ErrBadRequest)
	}
	var req resetPasswordRequest
	if err := c.Bind().Body(&req); err != nil {
		return response.Error(c, apperror.ErrBadRequest.WithCause(err))
	}
	if err := h.uc.ResetPassword(c.Context(), id, req.Password); err != nil {
		return response.Error(c, err)
	}
	return response.Success(c, fiber.Map{"message": "password diperbarui"})
}

func (h *AdminHandler) DeleteUser(c fiber.Ctx) error {
	requesterID, ok := middleware.GetUserID(c)
	if !ok {
		return response.Error(c, apperror.ErrUnauthorized)
	}
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.Error(c, apperror.ErrBadRequest)
	}
	if err := h.uc.DeleteUser(c.Context(), id, requesterID); err != nil {
		return response.Error(c, err)
	}
	return response.Success(c, fiber.Map{"message": "pengguna dihapus"})
}

func (h *AdminHandler) ToggleValidator(c fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.Error(c, apperror.ErrBadRequest)
	}
	user, err := h.uc.ToggleValidator(c.Context(), id)
	if err != nil {
		return response.Error(c, err)
	}
	return response.Success(c, user)
}

func (h *AdminHandler) ToggleSuspend(c fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.Error(c, apperror.ErrBadRequest)
	}
	user, err := h.uc.ToggleSuspend(c.Context(), id)
	if err != nil {
		return response.Error(c, err)
	}
	return response.Success(c, user)
}

func (h *AdminHandler) ListReports(c fiber.Ctx) error {
	p := pagination.FromQuery(c)
	reports, total, err := h.uc.ListReports(c.Context(), p.Page, p.Limit)
	if err != nil {
		return response.Error(c, err)
	}
	return response.Paginated(c, reports, p.Page, p.Limit, total)
}

type handleReportRequest struct {
	Action string `json:"action"`
}

func (h *AdminHandler) HandleReport(c fiber.Ctx) error {
	uid, ok := middleware.GetUserID(c)
	if !ok {
		return response.Error(c, apperror.ErrUnauthorized)
	}
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.Error(c, apperror.ErrBadRequest)
	}
	var req handleReportRequest
	if err := c.Bind().Body(&req); err != nil {
		return response.Error(c, apperror.ErrBadRequest.WithCause(err))
	}
	if err := h.uc.HandleReport(c.Context(), id, req.Action, uid); err != nil {
		return response.Error(c, err)
	}
	return response.Success(c, fiber.Map{"message": "laporan diperbarui"})
}

func (h *AdminHandler) Analytics(c fiber.Ctx) error {
	out, err := h.uc.GetAnalytics(c.Context(), h.analytic)
	if err != nil {
		return response.Error(c, err)
	}
	return response.Success(c, out)
}

func (h *AdminHandler) UpdateWord(c fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.Error(c, apperror.ErrBadRequest)
	}
	var req usecase.UpdateWordInput
	if err := c.Bind().Body(&req); err != nil {
		return response.Error(c, apperror.ErrBadRequest.WithCause(err))
	}
	word, err := h.wordUC.UpdateWord(c.Context(), id, req)
	if err != nil {
		return response.Error(c, err)
	}
	return response.Success(c, word)
}

func (h *AdminHandler) DeleteWord(c fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.Error(c, apperror.ErrBadRequest)
	}
	if err := h.wordUC.DeleteWord(c.Context(), id); err != nil {
		return response.Error(c, err)
	}
	return response.Success(c, fiber.Map{"message": "kosakata dihapus"})
}
