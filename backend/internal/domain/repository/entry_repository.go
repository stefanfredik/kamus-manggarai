package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/kamus-manggarai/backend/internal/domain/entity"
)

type EntryFilter struct {
	// Letter filters by first letter of the Indonesian headword (A-Z), empty = all.
	Letter string
	Status string
	Page   int
	Limit  int
}

type SearchFilter struct {
	Query     string
	Direction string // manggarai_to_indonesia | indonesia_to_manggarai
	Page      int
	Limit     int
}

type CreateEntryParams struct {
	Manggarai     string
	Slug          string
	HomonymNumber *int
	Source        *string
	Status        string
	CreatedBy     *uuid.UUID
	Senses        []entity.SubmissionSenseInput
	Derived       []entity.SubmissionDerivedInput
}

type EntryRepository interface {
	FindByID(ctx context.Context, id uuid.UUID) (*entity.Entry, error)
	FindBySlug(ctx context.Context, slug string) (*entity.Entry, error)
	FindDetailBySlug(ctx context.Context, slug string) (*entity.EntryDetail, error)
	FindPublished(ctx context.Context, filter EntryFilter) ([]*entity.EntrySummary, int64, error)
	Search(ctx context.Context, filter SearchFilter) ([]*entity.EntrySummary, int64, error)
	Suggest(ctx context.Context, query, direction string, limit int) ([]string, error)
	SlugExists(ctx context.Context, slug string) (bool, error)
	Create(ctx context.Context, params CreateEntryParams) (*entity.Entry, error)
	Update(ctx context.Context, entry *entity.Entry) error
	Delete(ctx context.Context, id uuid.UUID) error
	CountPublished(ctx context.Context) (int64, error)
}
