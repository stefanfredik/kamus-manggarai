package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/kamus-manggarai/backend/internal/domain/entity"
)

type SubmissionRepository interface {
	Create(ctx context.Context, submission *entity.Submission) error
	FindByID(ctx context.Context, id uuid.UUID) (*entity.Submission, error)
	FindByUserID(ctx context.Context, userID uuid.UUID, page, limit int) ([]*entity.Submission, int64, error)
	ListPending(ctx context.Context, page, limit int) ([]*entity.Submission, int64, error)
	UpdateStatus(ctx context.Context, id uuid.UUID, status string, reviewerID uuid.UUID, notes *string, wasEdited bool, resultingEntryID *uuid.UUID) error
	UpdatePayload(ctx context.Context, id uuid.UUID, payload entity.SubmissionPayload) error
}

type ReportRepository interface {
	Create(ctx context.Context, report *entity.Report) error
	ListOpen(ctx context.Context, page, limit int) ([]*entity.Report, int64, error)
	UpdateStatus(ctx context.Context, id uuid.UUID, status string, resolverID uuid.UUID) error
}

type NotificationRepository interface {
	Create(ctx context.Context, notification *entity.Notification) error
	ListByUserID(ctx context.Context, userID uuid.UUID, page, limit int) ([]*entity.Notification, int64, error)
	UnreadCount(ctx context.Context, userID uuid.UUID) (int64, error)
	MarkAsRead(ctx context.Context, id uuid.UUID, userID uuid.UUID) error
	MarkAllAsRead(ctx context.Context, userID uuid.UUID) error
}

type TokenRepository interface {
	Create(ctx context.Context, token *entity.RefreshToken) error
	FindByHash(ctx context.Context, hash string) (*entity.RefreshToken, error)
	Revoke(ctx context.Context, hash string) error
	DeleteExpired(ctx context.Context) error
}
