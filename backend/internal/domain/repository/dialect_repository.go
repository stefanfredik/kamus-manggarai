package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/kamus-manggarai/backend/internal/domain/entity"
)

type DialectRepository interface {
	FindAll(ctx context.Context) ([]*entity.Dialect, error)
	FindByID(ctx context.Context, id uuid.UUID) (*entity.Dialect, error)
	Create(ctx context.Context, name string, description string) (*entity.Dialect, error)
	Update(ctx context.Context, id uuid.UUID, name string, description string) (*entity.Dialect, error)
	Delete(ctx context.Context, id uuid.UUID) error
}
