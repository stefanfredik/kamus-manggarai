package usecase

import (
	"context"

	"github.com/google/uuid"
	"github.com/kamus-manggarai/backend/internal/domain/entity"
	"github.com/kamus-manggarai/backend/internal/domain/repository"
	"github.com/kamus-manggarai/backend/pkg/apperror"
)

type DialectUseCase interface {
	FindAll(ctx context.Context) ([]*entity.Dialect, error)
	FindByID(ctx context.Context, id uuid.UUID) (*entity.Dialect, error)
	Create(ctx context.Context, input entity.DialectInput) (*entity.Dialect, error)
	Update(ctx context.Context, id uuid.UUID, input entity.DialectInput) (*entity.Dialect, error)
	Delete(ctx context.Context, id uuid.UUID) error
}

type dialectUseCase struct {
	repo repository.DialectRepository
}

func NewDialectUseCase(repo repository.DialectRepository) DialectUseCase {
	return &dialectUseCase{repo: repo}
}

func (u *dialectUseCase) FindAll(ctx context.Context) ([]*entity.Dialect, error) {
	return u.repo.FindAll(ctx)
}

func (u *dialectUseCase) FindByID(ctx context.Context, id uuid.UUID) (*entity.Dialect, error) {
	return u.repo.FindByID(ctx, id)
}

func (u *dialectUseCase) Create(ctx context.Context, input entity.DialectInput) (*entity.Dialect, error) {
	if len(input.Name) < 2 {
		return nil, apperror.ErrValidation.WithMessage("nama dialek minimal 2 karakter")
	}
	return u.repo.Create(ctx, input.Name, input.Description)
}

func (u *dialectUseCase) Update(ctx context.Context, id uuid.UUID, input entity.DialectInput) (*entity.Dialect, error) {
	if len(input.Name) < 2 {
		return nil, apperror.ErrValidation.WithMessage("nama dialek minimal 2 karakter")
	}
	return u.repo.Update(ctx, id, input.Name, input.Description)
}

func (u *dialectUseCase) Delete(ctx context.Context, id uuid.UUID) error {
	return u.repo.Delete(ctx, id)
}
