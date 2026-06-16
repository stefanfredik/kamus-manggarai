package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/kamus-manggarai/backend/internal/domain/entity"
)

type UserRepository interface {
	FindByID(ctx context.Context, id uuid.UUID) (*entity.User, error)
	FindByEmail(ctx context.Context, email string) (*entity.User, error)
	FindByGoogleID(ctx context.Context, googleID string) (*entity.User, error)
	Create(ctx context.Context, user *entity.User) error
	UpdateRole(ctx context.Context, id uuid.UUID, role string) error
	UpdateSuspendStatus(ctx context.Context, id uuid.UUID, suspended bool) error
	// UpdateProfile changes a user's editable identity fields (name, email, role).
	UpdateProfile(ctx context.Context, id uuid.UUID, name, email, role string) error
	// UpdatePassword sets a new bcrypt password hash.
	UpdatePassword(ctx context.Context, id uuid.UUID, passwordHash string) error
	Delete(ctx context.Context, id uuid.UUID) error
	ListAll(ctx context.Context, page, limit int) ([]*entity.User, int64, error)
	GetLeaderboard(ctx context.Context, limit int) ([]*entity.LeaderboardRow, error)
}
