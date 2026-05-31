package usecase

import (
	"context"

	"github.com/google/uuid"
	"github.com/kamus-manggarai/backend/internal/domain/entity"
	"github.com/kamus-manggarai/backend/internal/domain/repository"
)

type ReportUseCase struct {
	reportRepo repository.ReportRepository
	wordRepo   repository.WordRepository
}

func NewReportUseCase(reportRepo repository.ReportRepository, wordRepo repository.WordRepository) *ReportUseCase {
	return &ReportUseCase{reportRepo: reportRepo, wordRepo: wordRepo}
}

type CreateReportInput struct {
	Reason      string  `validate:"required,oneof=ejaan_salah arti_tidak_tepat contoh_salah konten_tidak_pantas lainnya"`
	Description *string `json:"description,omitempty"`
}

func (u *ReportUseCase) ReportEntry(ctx context.Context, slug string, input CreateReportInput, reporterID *uuid.UUID) (*entity.Report, error) {
	word, err := u.wordRepo.FindBySlug(ctx, slug)
	if err != nil {
		return nil, err
	}
	report := &entity.Report{
		EntryID:     word.ID,
		ReportedBy:  reporterID,
		Reason:      input.Reason,
		Description: input.Description,
		Status:      entity.ReportStatusOpen,
	}
	if err := u.reportRepo.Create(ctx, report); err != nil {
		return nil, err
	}
	return report, nil
}
