package usecase

import (
	"context"

	"github.com/google/uuid"
	"github.com/kamus-manggarai/backend/internal/domain/entity"
	"github.com/kamus-manggarai/backend/internal/domain/repository"
	"github.com/kamus-manggarai/backend/pkg/apperror"
)

type AdminUseCase struct {
	userRepo   repository.UserRepository
	reportRepo repository.ReportRepository
	subRepo    repository.SubmissionRepository
	entryRepo  repository.EntryRepository
}

func NewAdminUseCase(
	userRepo repository.UserRepository,
	reportRepo repository.ReportRepository,
	subRepo repository.SubmissionRepository,
	entryRepo repository.EntryRepository,
) *AdminUseCase {
	return &AdminUseCase{
		userRepo:   userRepo,
		reportRepo: reportRepo,
		subRepo:    subRepo,
		entryRepo:  entryRepo,
	}
}

func (u *AdminUseCase) ListUsers(ctx context.Context, page, limit int) ([]*entity.User, int64, error) {
	return u.userRepo.ListAll(ctx, page, limit)
}

func (u *AdminUseCase) ToggleValidator(ctx context.Context, userID uuid.UUID) (*entity.User, error) {
	user, err := u.userRepo.FindByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if user.IsAdmin() {
		return nil, apperror.ErrForbidden.WithMessage("tidak dapat mengubah role admin")
	}
	newRole := entity.RoleValidator
	if user.IsValidator() {
		newRole = entity.RoleContributor
	}
	if err := u.userRepo.UpdateRole(ctx, userID, newRole); err != nil {
		return nil, err
	}
	return u.userRepo.FindByID(ctx, userID)
}

func (u *AdminUseCase) ToggleSuspend(ctx context.Context, userID uuid.UUID) (*entity.User, error) {
	user, err := u.userRepo.FindByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if user.IsAdmin() {
		return nil, apperror.ErrForbidden.WithMessage("tidak dapat suspend admin")
	}
	if err := u.userRepo.UpdateSuspendStatus(ctx, userID, !user.IsSuspended); err != nil {
		return nil, err
	}
	return u.userRepo.FindByID(ctx, userID)
}

func (u *AdminUseCase) ListReports(ctx context.Context, page, limit int) ([]*entity.Report, int64, error) {
	return u.reportRepo.ListOpen(ctx, page, limit)
}

func (u *AdminUseCase) HandleReport(ctx context.Context, reportID uuid.UUID, action string, resolverID uuid.UUID) error {
	if action != entity.ReportStatusResolved && action != entity.ReportStatusDismissed {
		return apperror.ErrBadRequest.WithMessage("aksi harus 'resolved' atau 'dismissed'")
	}
	return u.reportRepo.UpdateStatus(ctx, reportID, action, resolverID)
}

type Analytics struct {
	TotalEntries        int64            `json:"total_entries"`
	SubmissionsByStatus map[string]int64 `json:"submissions_by_status"`
	TopContributors     []ContributorRow `json:"top_contributors"`
	GrowthByMonth       []MonthlyCount   `json:"growth_by_month"`
}

type ContributorRow struct {
	UserID string `json:"user_id"`
	Name   string `json:"name"`
	Total  int64  `json:"total"`
}

type MonthlyCount struct {
	Month string `json:"month"`
	Total int64  `json:"total"`
}

func (u *AdminUseCase) GetAnalytics(ctx context.Context, db AnalyticsDB) (*Analytics, error) {
	return db.LoadAnalytics(ctx)
}

type AnalyticsDB interface {
	LoadAnalytics(ctx context.Context) (*Analytics, error)
}
