package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/kamus-manggarai/backend/internal/domain/entity"
)

type CreateGoetParams struct {
	Manggarai string
	Meaning   string
	CreatedBy *uuid.UUID
}

type UpdateGoetParams struct {
	ID        uuid.UUID
	Manggarai string
	Meaning   string
}

type GoetRepository interface {
	List(ctx context.Context, query string, page, limit int) ([]*entity.Goet, int64, error)
	FindByID(ctx context.Context, id uuid.UUID) (*entity.Goet, error)
	Create(ctx context.Context, params CreateGoetParams) (*entity.Goet, error)
	Update(ctx context.Context, params UpdateGoetParams) (*entity.Goet, error)
	Delete(ctx context.Context, id uuid.UUID) error
}
