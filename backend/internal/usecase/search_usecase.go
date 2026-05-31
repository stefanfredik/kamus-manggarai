package usecase

import (
	"context"
	"crypto/sha1"
	"encoding/hex"
	"errors"
	"strconv"
	"strings"

	"github.com/kamus-manggarai/backend/internal/domain/entity"
	"github.com/kamus-manggarai/backend/internal/domain/repository"
	"github.com/kamus-manggarai/backend/pkg/apperror"
	"github.com/redis/go-redis/v9"
)

const cacheTTLSearch = 120

type SearchResult struct {
	Items       []*entity.WordSummary `json:"items"`
	Total       int64                 `json:"total"`
	Page        int                   `json:"page"`
	Limit       int                   `json:"limit"`
	Suggestions []string              `json:"suggestions,omitempty"`
}

type SearchInput struct {
	Query     string
	Direction string
	Page      int
	Limit     int
}

type SearchUseCase struct {
	wordRepo repository.WordRepository
	cache    repository.CacheRepository
}

func NewSearchUseCase(wordRepo repository.WordRepository, cache repository.CacheRepository) *SearchUseCase {
	return &SearchUseCase{wordRepo: wordRepo, cache: cache}
}

func (u *SearchUseCase) Search(ctx context.Context, input SearchInput) (*SearchResult, error) {
	input.Query = strings.TrimSpace(input.Query)
	if input.Query == "" {
		return nil, apperror.ErrBadRequest.WithMessage("parameter q dibutuhkan")
	}
	if input.Direction == "" {
		input.Direction = DirectionManggaraiToIndonesia
	}
	if input.Direction != DirectionIndonesiaToManggarai && input.Direction != DirectionManggaraiToIndonesia {
		return nil, apperror.ErrBadRequest.WithMessage("direction tidak valid")
	}
	if input.Page < 1 {
		input.Page = 1
	}
	if input.Limit < 1 {
		input.Limit = 20
	}
	if input.Limit > 50 {
		input.Limit = 50
	}

	cacheKey := buildSearchCacheKey(input)
	var cached SearchResult
	if err := u.cache.Get(ctx, cacheKey, &cached); err == nil {
		return &cached, nil
	} else if !errors.Is(err, redis.Nil) {
		// non-fatal: fall through to live search
	}

	items, total, err := u.wordRepo.Search(ctx, repository.SearchFilter{
		Query:     input.Query,
		Direction: input.Direction,
		Page:      input.Page,
		Limit:     input.Limit,
	})
	if err != nil {
		return nil, err
	}

	result := &SearchResult{
		Items: items,
		Total: total,
		Page:  input.Page,
		Limit: input.Limit,
	}

	// If nothing found, offer "did you mean" suggestions.
	if total == 0 {
		if sugg, sErr := u.wordRepo.Suggest(ctx, input.Query, input.Direction, 5); sErr == nil {
			result.Suggestions = sugg
		}
	}

	_ = u.cache.Set(ctx, cacheKey, result, cacheTTLSearch)
	return result, nil
}

func buildSearchCacheKey(input SearchInput) string {
	parts := []string{strings.ToLower(strings.TrimSpace(input.Query)), input.Direction}
	h := sha1.Sum([]byte(strings.Join(parts, "|")))
	return "search:" + hex.EncodeToString(h[:8]) + ":p" + strconv.Itoa(input.Page) + ":l" + strconv.Itoa(input.Limit)
}
