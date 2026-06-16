package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/kamus-manggarai/backend/internal/domain/entity"
)

type WordFilter struct {
	// Language filters by word language ("id" or "mgr"); empty = all.
	Language string
	// Letter filters by first letter of the lemma (A-Z), empty = all.
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

// CreateTranslationParams is one counterpart word to create and link.
type CreateTranslationParams struct {
	Lemma        string
	Slug         string
	PartOfSpeech *string
	Notes        *string
	DialectIDs   []uuid.UUID
	Examples     []entity.TranslationExample
}

// CreateWordParams creates a headword in SourceLang plus its counterpart words
// in the other language, linking each via the translations table.
type CreateWordParams struct {
	SourceLang    string
	Headword      string
	HeadwordSlug  string
	PartOfSpeech  *string
	HomonymNumber *int
	Source        *string
	Status        string
	CreatedBy     *uuid.UUID
	DialectIDs    []uuid.UUID
	Translations  []CreateTranslationParams
	Derived       []entity.SubmissionDerivedInput
}

// UpdateWordParams replaces the editable fields of an existing headword and
// rebuilds its translation links and derived words. The word's language and
// slug are immutable (changing them would re-key the entry and break links).
type UpdateWordParams struct {
	ID           uuid.UUID
	Headword     string
	PartOfSpeech *string
	Source       *string
	DialectIDs   []uuid.UUID
	Translations []CreateTranslationParams
	Derived      []entity.SubmissionDerivedInput
}

type WordRepository interface {
	FindByID(ctx context.Context, id uuid.UUID) (*entity.Word, error)
	FindBySlug(ctx context.Context, slug string) (*entity.Word, error)
	FindDetailBySlug(ctx context.Context, slug string) (*entity.WordDetail, error)
	FindPublished(ctx context.Context, filter WordFilter) ([]*entity.WordSummary, int64, error)
	Search(ctx context.Context, filter SearchFilter) ([]*entity.WordSummary, int64, error)
	Suggest(ctx context.Context, query, direction string, limit int) ([]string, error)
	SlugExists(ctx context.Context, slug string) (bool, error)
	// FindWordByLemma looks up an existing word in a language by exact lemma
	// (case-insensitive), used to reuse words when linking translations.
	FindWordByLemma(ctx context.Context, language, lemma string) (*entity.Word, error)
	CreateWord(ctx context.Context, params CreateWordParams) (*entity.Word, error)
	UpdateWord(ctx context.Context, params UpdateWordParams) (*entity.Word, error)
	Delete(ctx context.Context, id uuid.UUID) error
	CountPublished(ctx context.Context) (int64, error)
}
