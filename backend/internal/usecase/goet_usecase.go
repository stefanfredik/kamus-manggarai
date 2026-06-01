package usecase

import (
	"context"
	"strings"

	"github.com/google/uuid"
	"github.com/kamus-manggarai/backend/internal/domain/entity"
	"github.com/kamus-manggarai/backend/internal/domain/repository"
	"github.com/kamus-manggarai/backend/pkg/apperror"
)

type GoetUseCase struct {
	repo repository.GoetRepository
}

func NewGoetUseCase(repo repository.GoetRepository) *GoetUseCase {
	return &GoetUseCase{repo: repo}
}

func (u *GoetUseCase) List(ctx context.Context, query string, page, limit int) ([]*entity.Goet, int64, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 20
	}
	return u.repo.List(ctx, query, page, limit)
}

func (u *GoetUseCase) GetByID(ctx context.Context, id uuid.UUID) (*entity.Goet, error) {
	return u.repo.FindByID(ctx, id)
}

type GoetInput struct {
	Manggarai string `json:"manggarai"`
	Meaning   string `json:"meaning"`
}

func (in GoetInput) validate() (string, string, error) {
	manggarai := strings.TrimSpace(in.Manggarai)
	meaning := strings.TrimSpace(in.Meaning)
	if manggarai == "" {
		return "", "", apperror.ErrValidation.WithMessage("teks goet (Manggarai) wajib diisi")
	}
	if meaning == "" {
		return "", "", apperror.ErrValidation.WithMessage("arti goet wajib diisi")
	}
	return manggarai, meaning, nil
}

func (u *GoetUseCase) Create(ctx context.Context, input GoetInput, creatorID *uuid.UUID) (*entity.Goet, error) {
	manggarai, meaning, err := input.validate()
	if err != nil {
		return nil, err
	}
	return u.repo.Create(ctx, repository.CreateGoetParams{
		Manggarai: manggarai,
		Meaning:   meaning,
		CreatedBy: creatorID,
	})
}

func (u *GoetUseCase) Update(ctx context.Context, id uuid.UUID, input GoetInput) (*entity.Goet, error) {
	manggarai, meaning, err := input.validate()
	if err != nil {
		return nil, err
	}
	return u.repo.Update(ctx, repository.UpdateGoetParams{
		ID:        id,
		Manggarai: manggarai,
		Meaning:   meaning,
	})
}

func (u *GoetUseCase) Delete(ctx context.Context, id uuid.UUID) error {
	return u.repo.Delete(ctx, id)
}
