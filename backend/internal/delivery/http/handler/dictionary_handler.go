package handler

import (
	"strings"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
	"github.com/kamus-manggarai/backend/internal/delivery/http/middleware"
	"github.com/kamus-manggarai/backend/internal/domain/repository"
	"github.com/kamus-manggarai/backend/internal/usecase"
	"github.com/kamus-manggarai/backend/pkg/apperror"
	"github.com/kamus-manggarai/backend/pkg/pagination"
	"github.com/kamus-manggarai/backend/pkg/response"
)

type DictionaryHandler struct {
	wordUC   *usecase.WordUseCase
	searchUC *usecase.SearchUseCase
	reportUC *usecase.ReportUseCase
}

func NewDictionaryHandler(
	wordUC *usecase.WordUseCase,
	searchUC *usecase.SearchUseCase,
	reportUC *usecase.ReportUseCase,
) *DictionaryHandler {
	return &DictionaryHandler{
		wordUC:   wordUC,
		searchUC: searchUC,
		reportUC: reportUC,
	}
}

func (h *DictionaryHandler) ListEntries(c fiber.Ctx) error {
	p := pagination.FromQuery(c)

	items, total, err := h.wordUC.ListWords(c.Context(), repository.WordFilter{
		Language: strings.TrimSpace(c.Query("lang")),
		Letter:   strings.TrimSpace(c.Query("letter")),
		Page:     p.Page,
		Limit:    p.Limit,
	})
	if err != nil {
		return response.Error(c, err)
	}
	return response.Paginated(c, items, p.Page, p.Limit, total)
}

func (h *DictionaryHandler) GetEntryDetail(c fiber.Ctx) error {
	slug := c.Params("slug")
	if slug == "" {
		return response.Error(c, apperror.ErrBadRequest.WithMessage("slug dibutuhkan"))
	}
	detail, err := h.wordUC.GetWordDetail(c.Context(), slug)
	if err != nil {
		return response.Error(c, err)
	}
	return response.Success(c, detail)
}

func (h *DictionaryHandler) Search(c fiber.Ctx) error {
	p := pagination.FromQuery(c)

	input := usecase.SearchInput{
		Query:     strings.TrimSpace(c.Query("q")),
		Direction: c.Query("direction", usecase.DirectionManggaraiToIndonesia),
		Page:      p.Page,
		Limit:     p.Limit,
	}
	result, err := h.searchUC.Search(c.Context(), input)
	if err != nil {
		return response.Error(c, err)
	}
	return response.Success(c, result)
}

type reportEntryRequest struct {
	Reason      string  `json:"reason"`
	Description *string `json:"description"`
}

func (h *DictionaryHandler) ReportEntry(c fiber.Ctx) error {
	slug := c.Params("slug")
	if slug == "" {
		return response.Error(c, apperror.ErrBadRequest.WithMessage("slug dibutuhkan"))
	}
	var req reportEntryRequest
	if err := c.Bind().Body(&req); err != nil {
		return response.Error(c, apperror.ErrBadRequest.WithCause(err))
	}

	var reporterID *uuid.UUID
	if uid, ok := middleware.GetUserID(c); ok {
		reporterID = &uid
	}

	report, err := h.reportUC.ReportEntry(c.Context(), slug, usecase.CreateReportInput{
		Reason:      req.Reason,
		Description: req.Description,
	}, reporterID)
	if err != nil {
		return response.Error(c, err)
	}
	return response.Created(c, report)
}
