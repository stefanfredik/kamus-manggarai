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
	analytic usecase.AnalyticsDB
}

func NewAdminHandler(uc *usecase.AdminUseCase, analytic usecase.AnalyticsDB) *AdminHandler {
	return &AdminHandler{uc: uc, analytic: analytic}
}

func (h *AdminHandler) ListUsers(c fiber.Ctx) error {
	p := pagination.FromQuery(c)
	users, total, err := h.uc.ListUsers(c.Context(), p.Page, p.Limit)
	if err != nil {
		return response.Error(c, err)
	}
	return response.Paginated(c, users, p.Page, p.Limit, total)
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

func (h *AdminHandler) ListDialects(c fiber.Ctx) error {
	dialects, err := h.uc.ListAllDialects(c.Context())
	if err != nil {
		return response.Error(c, err)
	}
	return response.Success(c, dialects)
}

func (h *AdminHandler) CreateDialect(c fiber.Ctx) error {
	var input usecase.DialectInput
	if err := c.Bind().Body(&input); err != nil {
		return response.Error(c, apperror.ErrBadRequest.WithCause(err))
	}
	d, err := h.uc.CreateDialect(c.Context(), input)
	if err != nil {
		return response.Error(c, err)
	}
	return response.Created(c, d)
}

func (h *AdminHandler) UpdateDialect(c fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.Error(c, apperror.ErrBadRequest)
	}
	var input usecase.DialectInput
	if err := c.Bind().Body(&input); err != nil {
		return response.Error(c, apperror.ErrBadRequest.WithCause(err))
	}
	d, err := h.uc.UpdateDialect(c.Context(), id, input)
	if err != nil {
		return response.Error(c, err)
	}
	return response.Success(c, d)
}

func (h *AdminHandler) ToggleDialectActive(c fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.Error(c, apperror.ErrBadRequest)
	}
	d, err := h.uc.ToggleDialectActive(c.Context(), id)
	if err != nil {
		return response.Error(c, err)
	}
	return response.Success(c, d)
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
