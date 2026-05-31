package handler

import (
	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
	"github.com/kamus-manggarai/backend/internal/delivery/http/middleware"
	"github.com/kamus-manggarai/backend/internal/domain/entity"
	"github.com/kamus-manggarai/backend/internal/usecase"
	"github.com/kamus-manggarai/backend/pkg/apperror"
	"github.com/kamus-manggarai/backend/pkg/pagination"
	"github.com/kamus-manggarai/backend/pkg/response"
)

type ReviewHandler struct {
	uc *usecase.ReviewUseCase
}

func NewReviewHandler(uc *usecase.ReviewUseCase) *ReviewHandler {
	return &ReviewHandler{uc: uc}
}

func (h *ReviewHandler) Queue(c fiber.Ctx) error {
	p := pagination.FromQuery(c)
	items, total, err := h.uc.GetReviewQueue(c.Context(), p.Page, p.Limit)
	if err != nil {
		return response.Error(c, err)
	}
	return response.Paginated(c, items, p.Page, p.Limit, total)
}

type rejectRequest struct {
	Notes string `json:"notes"`
}

func (h *ReviewHandler) Approve(c fiber.Ctx) error {
	uid, ok := middleware.GetUserID(c)
	if !ok {
		return response.Error(c, apperror.ErrUnauthorized)
	}
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.Error(c, apperror.ErrBadRequest)
	}
	s, err := h.uc.ApproveSubmission(c.Context(), id, uid)
	if err != nil {
		return response.Error(c, err)
	}
	return response.Success(c, s)
}

func (h *ReviewHandler) Reject(c fiber.Ctx) error {
	uid, ok := middleware.GetUserID(c)
	if !ok {
		return response.Error(c, apperror.ErrUnauthorized)
	}
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.Error(c, apperror.ErrBadRequest)
	}
	var req rejectRequest
	if err := c.Bind().Body(&req); err != nil {
		return response.Error(c, apperror.ErrBadRequest.WithCause(err))
	}
	s, err := h.uc.RejectSubmission(c.Context(), id, uid, req.Notes)
	if err != nil {
		return response.Error(c, err)
	}
	return response.Success(c, s)
}

type reviseRequest struct {
	Payload entity.SubmissionPayload `json:"payload"`
	Notes   *string                  `json:"notes"`
}

func (h *ReviewHandler) Revise(c fiber.Ctx) error {
	uid, ok := middleware.GetUserID(c)
	if !ok {
		return response.Error(c, apperror.ErrUnauthorized)
	}
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.Error(c, apperror.ErrBadRequest)
	}
	var req reviseRequest
	if err := c.Bind().Body(&req); err != nil {
		return response.Error(c, apperror.ErrBadRequest.WithCause(err))
	}
	s, err := h.uc.ReviseAndPublish(c.Context(), id, uid, req.Payload, req.Notes)
	if err != nil {
		return response.Error(c, err)
	}
	return response.Success(c, s)
}
