package usecase

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/kamus-manggarai/backend/internal/domain/entity"
	"github.com/kamus-manggarai/backend/internal/domain/repository"
	"github.com/kamus-manggarai/backend/pkg/apperror"
	"github.com/kamus-manggarai/backend/pkg/validator"
	"github.com/redis/go-redis/v9"
)

const (
	cacheTTLEntryDetail = 600
	cacheTTLEntryList   = 60

	DirectionManggaraiToIndonesia = "manggarai_to_indonesia"
	DirectionIndonesiaToManggarai = "indonesia_to_manggarai"
)

type EntryUseCase struct {
	entryRepo repository.EntryRepository
	cache     repository.CacheRepository
}

func NewEntryUseCase(entryRepo repository.EntryRepository, cache repository.CacheRepository) *EntryUseCase {
	return &EntryUseCase{entryRepo: entryRepo, cache: cache}
}

func (u *EntryUseCase) GetEntryDetail(ctx context.Context, slug string) (*entity.EntryDetail, error) {
	cacheKey := "entry:detail:" + slug
	var cached entity.EntryDetail
	if err := u.cache.Get(ctx, cacheKey, &cached); err == nil {
		return &cached, nil
	} else if !errors.Is(err, redis.Nil) {
		// non-fatal: continue to DB
	}

	detail, err := u.entryRepo.FindDetailBySlug(ctx, slug)
	if err != nil {
		return nil, err
	}
	if detail.Status != entity.StatusPublished {
		return nil, apperror.ErrNotFound
	}

	_ = u.cache.Set(ctx, cacheKey, detail, cacheTTLEntryDetail)
	return detail, nil
}

func (u *EntryUseCase) ListEntries(ctx context.Context, filter repository.EntryFilter) ([]*entity.EntrySummary, int64, error) {
	if filter.Page < 1 {
		filter.Page = 1
	}
	if filter.Limit < 1 {
		filter.Limit = 20
	}
	return u.entryRepo.FindPublished(ctx, filter)
}

func (u *EntryUseCase) CountPublished(ctx context.Context) (int64, error) {
	return u.entryRepo.CountPublished(ctx)
}

type CreateEntrySenseInput = entity.SubmissionSenseInput

type CreateEntryInput struct {
	Manggarai string                          `json:"manggarai" validate:"required,min=1"`
	Senses    []entity.SubmissionSenseInput   `json:"senses" validate:"required,min=1,dive"`
	Source    *string                         `json:"source,omitempty"`
	Derived   []entity.SubmissionDerivedInput `json:"derived,omitempty"`
}

func (u *EntryUseCase) CreateEntry(ctx context.Context, input CreateEntryInput, creatorID *uuid.UUID) (*entity.Entry, error) {
	if errs := validator.Validate(&input); len(errs) > 0 {
		return nil, apperror.ErrValidation.WithMessage(errs.Error())
	}

	// At least one sense with a non-empty Indonesian translation is required.
	primary := ""
	for _, s := range input.Senses {
		if strings.TrimSpace(s.Indonesian) != "" {
			primary = s.Indonesian
			break
		}
	}
	if primary == "" {
		return nil, apperror.ErrValidation.WithMessage("minimal satu terjemahan Bahasa Indonesia wajib diisi")
	}

	slug := validator.Slugify(primary)
	if slug == "" {
		slug = "entri"
	}
	candidate := slug
	exists, err := u.entryRepo.SlugExists(ctx, candidate)
	if err != nil {
		return nil, err
	}
	for i := 2; exists && i < 1000; i++ {
		candidate = fmt.Sprintf("%s-%d", slug, i)
		exists, err = u.entryRepo.SlugExists(ctx, candidate)
		if err != nil {
			return nil, err
		}
	}
	if exists {
		return nil, apperror.ErrConflict.WithMessage("tidak dapat membuat slug unik untuk kata ini")
	}

	entry, err := u.entryRepo.Create(ctx, repository.CreateEntryParams{
		Manggarai: input.Manggarai,
		Slug:      candidate,
		Source:    input.Source,
		Status:    entity.StatusPublished,
		CreatedBy: creatorID,
		Senses:    input.Senses,
		Derived:   input.Derived,
	})
	if err != nil {
		return nil, err
	}

	_ = u.cache.DeletePattern(context.Background(), "search:*")
	_ = u.cache.DeletePattern(context.Background(), "entry:list:*")
	return entry, nil
}
