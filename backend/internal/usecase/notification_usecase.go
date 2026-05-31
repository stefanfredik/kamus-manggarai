package usecase

import (
	"context"

	"github.com/google/uuid"
	"github.com/kamus-manggarai/backend/internal/domain/entity"
	"github.com/kamus-manggarai/backend/internal/domain/repository"
)

type NotificationUseCase struct {
	repo repository.NotificationRepository
}

func NewNotificationUseCase(repo repository.NotificationRepository) *NotificationUseCase {
	return &NotificationUseCase{repo: repo}
}

func (u *NotificationUseCase) NotifySubmissionApproved(ctx context.Context, userID, submissionID uuid.UUID, word, entrySlug string) error {
	return u.repo.Create(ctx, &entity.Notification{
		UserID: userID,
		Type:   entity.NotifSubmissionApproved,
		Payload: map[string]interface{}{
			"submission_id": submissionID.String(),
			"word":          word,
			"entry_slug":    entrySlug,
		},
	})
}

func (u *NotificationUseCase) NotifySubmissionRejected(ctx context.Context, userID, submissionID uuid.UUID, word, notes string) error {
	return u.repo.Create(ctx, &entity.Notification{
		UserID: userID,
		Type:   entity.NotifSubmissionRejected,
		Payload: map[string]interface{}{
			"submission_id": submissionID.String(),
			"word":          word,
			"notes":         notes,
		},
	})
}

func (u *NotificationUseCase) NotifySubmissionEditedPublished(ctx context.Context, userID, submissionID uuid.UUID, word, entrySlug string) error {
	return u.repo.Create(ctx, &entity.Notification{
		UserID: userID,
		Type:   entity.NotifSubmissionEditedPublished,
		Payload: map[string]interface{}{
			"submission_id": submissionID.String(),
			"word":          word,
			"entry_slug":    entrySlug,
		},
	})
}

func (u *NotificationUseCase) GetMyNotifications(ctx context.Context, userID uuid.UUID, page, limit int) ([]*entity.Notification, int64, error) {
	return u.repo.ListByUserID(ctx, userID, page, limit)
}

func (u *NotificationUseCase) UnreadCount(ctx context.Context, userID uuid.UUID) (int64, error) {
	return u.repo.UnreadCount(ctx, userID)
}

func (u *NotificationUseCase) MarkAsRead(ctx context.Context, id uuid.UUID, userID uuid.UUID) error {
	return u.repo.MarkAsRead(ctx, id, userID)
}

func (u *NotificationUseCase) MarkAllAsRead(ctx context.Context, userID uuid.UUID) error {
	return u.repo.MarkAllAsRead(ctx, userID)
}
