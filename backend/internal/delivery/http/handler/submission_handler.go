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

type SubmissionHandler struct {
	uc     *usecase.SubmissionUseCase
	notif  *usecase.NotificationUseCase
}

func NewSubmissionHandler(uc *usecase.SubmissionUseCase, notif *usecase.NotificationUseCase) *SubmissionHandler {
	return &SubmissionHandler{uc: uc, notif: notif}
}

func (h *SubmissionHandler) Submit(c fiber.Ctx) error {
	uid, ok := middleware.GetUserID(c)
	if !ok {
		return response.Error(c, apperror.ErrUnauthorized)
	}
	var payload entity.SubmissionPayload
	if err := c.Bind().Body(&payload); err != nil {
		return response.Error(c, apperror.ErrBadRequest.WithCause(err))
	}
	sub, err := h.uc.Submit(c.Context(), payload, uid)
	if err != nil {
		return response.Error(c, err)
	}
	return response.Created(c, sub)
}

func (h *SubmissionHandler) ListMine(c fiber.Ctx) error {
	uid, ok := middleware.GetUserID(c)
	if !ok {
		return response.Error(c, apperror.ErrUnauthorized)
	}
	p := pagination.FromQuery(c)
	items, total, err := h.uc.GetMySubmissions(c.Context(), uid, p.Page, p.Limit)
	if err != nil {
		return response.Error(c, err)
	}
	return response.Paginated(c, items, p.Page, p.Limit, total)
}

func (h *SubmissionHandler) GetByID(c fiber.Ctx) error {
	uid, ok := middleware.GetUserID(c)
	if !ok {
		return response.Error(c, apperror.ErrUnauthorized)
	}
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.Error(c, apperror.ErrBadRequest.WithMessage("id tidak valid"))
	}
	s, err := h.uc.GetSubmissionDetail(c.Context(), id, uid)
	if err != nil {
		return response.Error(c, err)
	}
	return response.Success(c, s)
}

func (h *SubmissionHandler) Edit(c fiber.Ctx) error {
	uid, ok := middleware.GetUserID(c)
	if !ok {
		return response.Error(c, apperror.ErrUnauthorized)
	}
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.Error(c, apperror.ErrBadRequest.WithMessage("id tidak valid"))
	}
	var payload entity.SubmissionPayload
	if err := c.Bind().Body(&payload); err != nil {
		return response.Error(c, apperror.ErrBadRequest.WithCause(err))
	}
	s, err := h.uc.EditSubmission(c.Context(), id, payload, uid)
	if err != nil {
		return response.Error(c, err)
	}
	return response.Success(c, s)
}

func (h *SubmissionHandler) ListNotifications(c fiber.Ctx) error {
	uid, ok := middleware.GetUserID(c)
	if !ok {
		return response.Error(c, apperror.ErrUnauthorized)
	}
	p := pagination.FromQuery(c)
	items, total, err := h.notif.GetMyNotifications(c.Context(), uid, p.Page, p.Limit)
	if err != nil {
		return response.Error(c, err)
	}
	unread, _ := h.notif.UnreadCount(c.Context(), uid)
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"items":  items,
			"unread": unread,
		},
		"meta": fiber.Map{
			"page":  p.Page,
			"limit": p.Limit,
			"total": total,
		},
	})
}

func (h *SubmissionHandler) MarkNotificationRead(c fiber.Ctx) error {
	uid, ok := middleware.GetUserID(c)
	if !ok {
		return response.Error(c, apperror.ErrUnauthorized)
	}
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.Error(c, apperror.ErrBadRequest)
	}
	if err := h.notif.MarkAsRead(c.Context(), id, uid); err != nil {
		return response.Error(c, err)
	}
	return response.NoContent(c)
}

func (h *SubmissionHandler) MarkAllNotificationsRead(c fiber.Ctx) error {
	uid, ok := middleware.GetUserID(c)
	if !ok {
		return response.Error(c, apperror.ErrUnauthorized)
	}
	if err := h.notif.MarkAllAsRead(c.Context(), uid); err != nil {
		return response.Error(c, err)
	}
	return response.NoContent(c)
}
