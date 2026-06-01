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

type GoetHandler struct {
	uc *usecase.GoetUseCase
}

func NewGoetHandler(uc *usecase.GoetUseCase) *GoetHandler {
	return &GoetHandler{uc: uc}
}

func (h *GoetHandler) List(c fiber.Ctx) error {
	p := pagination.FromQuery(c)
	items, total, err := h.uc.List(c.Context(), c.Query("q"), p.Page, p.Limit)
	if err != nil {
		return response.Error(c, err)
	}
	return response.Paginated(c, items, p.Page, p.Limit, total)
}

func (h *GoetHandler) GetByID(c fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.Error(c, apperror.ErrBadRequest)
	}
	item, err := h.uc.GetByID(c.Context(), id)
	if err != nil {
		return response.Error(c, err)
	}
	return response.Success(c, item)
}

func (h *GoetHandler) Create(c fiber.Ctx) error {
	var req usecase.GoetInput
	if err := c.Bind().Body(&req); err != nil {
		return response.Error(c, apperror.ErrBadRequest.WithCause(err))
	}
	var creatorID *uuid.UUID
	if uid, ok := middleware.GetUserID(c); ok {
		creatorID = &uid
	}
	item, err := h.uc.Create(c.Context(), req, creatorID)
	if err != nil {
		return response.Error(c, err)
	}
	return response.Created(c, item)
}

func (h *GoetHandler) Update(c fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.Error(c, apperror.ErrBadRequest)
	}
	var req usecase.GoetInput
	if err := c.Bind().Body(&req); err != nil {
		return response.Error(c, apperror.ErrBadRequest.WithCause(err))
	}
	item, err := h.uc.Update(c.Context(), id, req)
	if err != nil {
		return response.Error(c, err)
	}
	return response.Success(c, item)
}

func (h *GoetHandler) Delete(c fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.Error(c, apperror.ErrBadRequest)
	}
	if err := h.uc.Delete(c.Context(), id); err != nil {
		return response.Error(c, err)
	}
	return response.Success(c, fiber.Map{"message": "goet dihapus"})
}
