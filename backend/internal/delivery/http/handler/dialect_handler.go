package handler

import (
	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
	"github.com/kamus-manggarai/backend/internal/domain/entity"
	"github.com/kamus-manggarai/backend/internal/usecase"
	"github.com/kamus-manggarai/backend/pkg/apperror"
	"github.com/kamus-manggarai/backend/pkg/response"
)

type DialectHandler struct {
	uc usecase.DialectUseCase
}

func NewDialectHandler(uc usecase.DialectUseCase) *DialectHandler {
	return &DialectHandler{uc: uc}
}

func (h *DialectHandler) FindAll(c fiber.Ctx) error {
	dialects, err := h.uc.FindAll(c.Context())
	if err != nil {
		return err
	}
	return response.Success(c, dialects)
}

func (h *DialectHandler) Create(c fiber.Ctx) error {
	var input entity.DialectInput
	if err := c.Bind().JSON(&input); err != nil {
		return apperror.ErrValidation.WithMessage("payload tidak valid")
	}

	dialect, err := h.uc.Create(c.Context(), input)
	if err != nil {
		return err
	}
	return response.Success(c, dialect)
}

func (h *DialectHandler) Update(c fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return apperror.ErrValidation.WithMessage("id tidak valid")
	}

	var input entity.DialectInput
	if err := c.Bind().JSON(&input); err != nil {
		return apperror.ErrValidation.WithMessage("payload tidak valid")
	}

	dialect, err := h.uc.Update(c.Context(), id, input)
	if err != nil {
		return err
	}
	return response.Success(c, dialect)
}

func (h *DialectHandler) Delete(c fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return apperror.ErrValidation.WithMessage("id tidak valid")
	}

	if err := h.uc.Delete(c.Context(), id); err != nil {
		return err
	}
	return response.Success(c, nil)
}
