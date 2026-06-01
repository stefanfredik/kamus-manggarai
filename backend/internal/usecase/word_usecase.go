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

type WordUseCase struct {
	wordRepo repository.WordRepository
	cache    repository.CacheRepository
}

func NewWordUseCase(wordRepo repository.WordRepository, cache repository.CacheRepository) *WordUseCase {
	return &WordUseCase{wordRepo: wordRepo, cache: cache}
}

func (u *WordUseCase) GetWordDetail(ctx context.Context, slug string) (*entity.WordDetail, error) {
	cacheKey := "word:detail:" + slug
	var cached entity.WordDetail
	if err := u.cache.Get(ctx, cacheKey, &cached); err == nil {
		return &cached, nil
	} else if !errors.Is(err, redis.Nil) {
		// non-fatal: continue to DB
	}

	detail, err := u.wordRepo.FindDetailBySlug(ctx, slug)
	if err != nil {
		return nil, err
	}
	if detail.Status != entity.StatusPublished {
		return nil, apperror.ErrNotFound
	}

	_ = u.cache.Set(ctx, cacheKey, detail, cacheTTLEntryDetail)
	return detail, nil
}

func (u *WordUseCase) ListWords(ctx context.Context, filter repository.WordFilter) ([]*entity.WordSummary, int64, error) {
	if filter.Page < 1 {
		filter.Page = 1
	}
	if filter.Limit < 1 {
		filter.Limit = 20
	}
	return u.wordRepo.FindPublished(ctx, filter)
}

func (u *WordUseCase) CountPublished(ctx context.Context) (int64, error) {
	return u.wordRepo.CountPublished(ctx)
}

// CreateWordInput is a headword plus its counterpart translations.
type CreateWordInput struct {
	SourceLang   string                              `json:"source_lang" validate:"required,oneof=id mgr"`
	Headword     string                              `json:"headword" validate:"required,min=1"`
	PartOfSpeech *string                             `json:"part_of_speech,omitempty"`
	Source       *string                             `json:"source,omitempty"`
	Translations []entity.SubmissionTranslationInput `json:"translations" validate:"required,min=1,dive"`
	Derived      []entity.SubmissionDerivedInput     `json:"derived,omitempty"`
}

func (u *WordUseCase) CreateWord(ctx context.Context, input CreateWordInput, creatorID *uuid.UUID) (*entity.Word, error) {
	if input.SourceLang == "" {
		input.SourceLang = entity.LangManggarai
	}
	if errs := validator.Validate(&input); len(errs) > 0 {
		return nil, apperror.ErrValidation.WithMessage(errs.Error())
	}

	// Require at least one non-empty counterpart translation.
	translations := make([]repository.CreateTranslationParams, 0, len(input.Translations))
	for _, t := range input.Translations {
		if strings.TrimSpace(t.Lemma) == "" {
			continue
		}
		translations = append(translations, repository.CreateTranslationParams{
			Lemma:        strings.TrimSpace(t.Lemma),
			Slug:         slugFor(t.Lemma),
			PartOfSpeech: t.PartOfSpeech,
			Notes:        t.Notes,
			Examples:     mapExamples(t.Examples),
		})
	}
	if len(translations) == 0 {
		return nil, apperror.ErrValidation.WithMessage("minimal satu terjemahan wajib diisi")
	}

	headSlug, err := u.uniqueSlug(ctx, slugFor(input.Headword))
	if err != nil {
		return nil, err
	}

	word, err := u.wordRepo.CreateWord(ctx, repository.CreateWordParams{
		SourceLang:   input.SourceLang,
		Headword:     strings.TrimSpace(input.Headword),
		HeadwordSlug: headSlug,
		PartOfSpeech: input.PartOfSpeech,
		Source:       input.Source,
		Status:       entity.StatusPublished,
		CreatedBy:    creatorID,
		Translations: translations,
		Derived:      input.Derived,
	})
	if err != nil {
		return nil, err
	}

	_ = u.cache.DeletePattern(context.Background(), "search:*")
	_ = u.cache.DeletePattern(context.Background(), "word:list:*")
	return word, nil
}

// UpdateWordInput is the editable shape of an existing headword.
type UpdateWordInput struct {
	Headword     string                              `json:"headword" validate:"required,min=1"`
	PartOfSpeech *string                             `json:"part_of_speech,omitempty"`
	Source       *string                             `json:"source,omitempty"`
	Translations []entity.SubmissionTranslationInput `json:"translations" validate:"required,min=1,dive"`
	Derived      []entity.SubmissionDerivedInput     `json:"derived,omitempty"`
}

// UpdateWord edits an existing headword: its lemma, part of speech, source, and
// the full set of translation links and derived words. Language and slug are
// immutable. Caches are busted broadly since edits can touch counterpart words.
func (u *WordUseCase) UpdateWord(ctx context.Context, id uuid.UUID, input UpdateWordInput) (*entity.Word, error) {
	if errs := validator.Validate(&input); len(errs) > 0 {
		return nil, apperror.ErrValidation.WithMessage(errs.Error())
	}

	translations := make([]repository.CreateTranslationParams, 0, len(input.Translations))
	for _, t := range input.Translations {
		if strings.TrimSpace(t.Lemma) == "" {
			continue
		}
		translations = append(translations, repository.CreateTranslationParams{
			Lemma:        strings.TrimSpace(t.Lemma),
			Slug:         slugFor(t.Lemma),
			PartOfSpeech: t.PartOfSpeech,
			Notes:        t.Notes,
			Examples:     mapExamples(t.Examples),
		})
	}
	if len(translations) == 0 {
		return nil, apperror.ErrValidation.WithMessage("minimal satu terjemahan wajib diisi")
	}

	word, err := u.wordRepo.UpdateWord(ctx, repository.UpdateWordParams{
		ID:           id,
		Headword:     strings.TrimSpace(input.Headword),
		PartOfSpeech: input.PartOfSpeech,
		Source:       input.Source,
		Translations: translations,
		Derived:      input.Derived,
	})
	if err != nil {
		return nil, err
	}

	u.bustWordCaches(word.Slug)
	return word, nil
}

// DeleteWord removes a headword. Its translation links, derived words, and any
// reports cascade away via foreign keys; counterpart words remain.
func (u *WordUseCase) DeleteWord(ctx context.Context, id uuid.UUID) error {
	word, err := u.wordRepo.FindByID(ctx, id)
	if err != nil {
		return err
	}
	if err := u.wordRepo.Delete(ctx, id); err != nil {
		return err
	}
	u.bustWordCaches(word.Slug)
	return nil
}

func (u *WordUseCase) bustWordCaches(slug string) {
	_ = u.cache.Delete(context.Background(), "word:detail:"+slug)
	_ = u.cache.DeletePattern(context.Background(), "word:list:*")
	_ = u.cache.DeletePattern(context.Background(), "search:*")
}

func slugFor(lemma string) string {
	s := validator.Slugify(lemma)
	if s == "" {
		s = "kata"
	}
	return s
}

// mapExamples converts submission example inputs into entity examples, dropping
// pairs where both sides are blank.
func mapExamples(in []entity.SubmissionExampleInput) []entity.TranslationExample {
	out := make([]entity.TranslationExample, 0, len(in))
	for _, ex := range in {
		if strings.TrimSpace(ex.Manggarai) == "" && strings.TrimSpace(ex.Indonesian) == "" {
			continue
		}
		out = append(out, entity.TranslationExample{
			Manggarai:  strings.TrimSpace(ex.Manggarai),
			Indonesian: strings.TrimSpace(ex.Indonesian),
		})
	}
	return out
}

func (u *WordUseCase) uniqueSlug(ctx context.Context, base string) (string, error) {
	candidate := base
	exists, err := u.wordRepo.SlugExists(ctx, candidate)
	if err != nil {
		return "", err
	}
	for i := 2; exists && i < 10000; i++ {
		candidate = fmt.Sprintf("%s-%d", base, i)
		exists, err = u.wordRepo.SlugExists(ctx, candidate)
		if err != nil {
			return "", err
		}
	}
	if exists {
		return "", apperror.ErrConflict.WithMessage("tidak dapat membuat slug unik untuk kata ini")
	}
	return candidate, nil
}
