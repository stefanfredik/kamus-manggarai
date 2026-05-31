package handler

import (
	"strings"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
	"github.com/kamus-manggarai/backend/internal/delivery/http/middleware"
	"github.com/kamus-manggarai/backend/internal/domain/repository"
	"github.com/kamus-manggarai/backend/internal/domain/service"
	"github.com/kamus-manggarai/backend/internal/usecase"
	"github.com/kamus-manggarai/backend/pkg/apperror"
	"github.com/kamus-manggarai/backend/pkg/pagination"
	"github.com/kamus-manggarai/backend/pkg/response"
)

type DictionaryHandler struct {
	entryUC   *usecase.EntryUseCase
	searchUC  *usecase.SearchUseCase
	dialectUC *usecase.DialectUseCase
	reportUC  *usecase.ReportUseCase
}

func NewDictionaryHandler(
	entryUC *usecase.EntryUseCase,
	searchUC *usecase.SearchUseCase,
	dialectUC *usecase.DialectUseCase,
	reportUC *usecase.ReportUseCase,
) *DictionaryHandler {
	return &DictionaryHandler{
		entryUC:   entryUC,
		searchUC:  searchUC,
		dialectUC: dialectUC,
		reportUC:  reportUC,
	}
}

func (h *DictionaryHandler) ListEntries(c fiber.Ctx) error {
	p := pagination.FromQuery(c)
	dialectIDs := parseDialectIDs(c.Query("dialect_ids"))

	items, total, err := h.entryUC.ListEntries(c.Context(), repository.EntryFilter{
		DialectIDs: dialectIDs,
		Page:       p.Page,
		Limit:      p.Limit,
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
	detail, err := h.entryUC.GetEntryDetail(c.Context(), slug)
	if err != nil {
		return response.Error(c, err)
	}
	return response.Success(c, detail)
}

func (h *DictionaryHandler) Search(c fiber.Ctx) error {
	p := pagination.FromQuery(c)
	dialectIDs := parseDialectIDs(c.Query("dialect_ids"))

	input := service.SearchInput{
		Query:      strings.TrimSpace(c.Query("q")),
		Direction:  c.Query("direction", service.DirectionManggaraiToIndonesia),
		DialectIDs: dialectIDs,
		Page:       p.Page,
		Limit:      p.Limit,
	}
	result, err := h.searchUC.Search(c.Context(), input)
	if err != nil {
		return response.Error(c, err)
	}
	return response.Success(c, result)
}

func (h *DictionaryHandler) ListDialects(c fiber.Ctx) error {
	dialects, err := h.dialectUC.ListActive(c.Context())
	if err != nil {
		return response.Error(c, err)
	}
	return response.Success(c, dialects)
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

func parseDialectIDs(raw string) []uuid.UUID {
	if raw == "" {
		return nil
	}
	parts := strings.Split(raw, ",")
	ids := make([]uuid.UUID, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p == "" {
			continue
		}
		if id, err := uuid.Parse(p); err == nil {
			ids = append(ids, id)
		}
	}
	return ids
}
