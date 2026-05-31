package usecase

import (
	"context"

	"github.com/google/uuid"
	"github.com/kamus-manggarai/backend/internal/domain/entity"
	"github.com/kamus-manggarai/backend/internal/domain/repository"
	"github.com/kamus-manggarai/backend/pkg/apperror"
	"github.com/kamus-manggarai/backend/pkg/validator"
)

type AdminUseCase struct {
	userRepo    repository.UserRepository
	dialectRepo repository.DialectRepository
	reportRepo  repository.ReportRepository
	subRepo     repository.SubmissionRepository
	entryRepo   repository.EntryRepository
}

func NewAdminUseCase(
	userRepo repository.UserRepository,
	dialectRepo repository.DialectRepository,
	reportRepo repository.ReportRepository,
	subRepo repository.SubmissionRepository,
	entryRepo repository.EntryRepository,
) *AdminUseCase {
	return &AdminUseCase{
		userRepo:    userRepo,
		dialectRepo: dialectRepo,
		reportRepo:  reportRepo,
		subRepo:     subRepo,
		entryRepo:   entryRepo,
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

type DialectInput struct {
	Name        string  `json:"name" validate:"required,min=2,max=100"`
	Description *string `json:"description,omitempty"`
	Region      *string `json:"region,omitempty"`
	SortOrder   int     `json:"sort_order"`
}

func (u *AdminUseCase) ListAllDialects(ctx context.Context) ([]*entity.Dialect, error) {
	return u.dialectRepo.ListAll(ctx)
}

func (u *AdminUseCase) CreateDialect(ctx context.Context, input DialectInput) (*entity.Dialect, error) {
	if errs := validator.Validate(&input); len(errs) > 0 {
		return nil, apperror.ErrValidation.WithMessage(errs.Error())
	}
	d := &entity.Dialect{
		Name:        input.Name,
		Slug:        validator.Slugify(input.Name),
		Description: input.Description,
		Region:      input.Region,
		IsActive:    true,
		SortOrder:   input.SortOrder,
	}
	if err := u.dialectRepo.Create(ctx, d); err != nil {
		return nil, err
	}
	return d, nil
}

func (u *AdminUseCase) UpdateDialect(ctx context.Context, id uuid.UUID, input DialectInput) (*entity.Dialect, error) {
	d, err := u.dialectRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	d.Name = input.Name
	d.Slug = validator.Slugify(input.Name)
	d.Description = input.Description
	d.Region = input.Region
	d.SortOrder = input.SortOrder
	if err := u.dialectRepo.Update(ctx, d); err != nil {
		return nil, err
	}
	return u.dialectRepo.FindByID(ctx, id)
}

func (u *AdminUseCase) ToggleDialectActive(ctx context.Context, id uuid.UUID) (*entity.Dialect, error) {
	if err := u.dialectRepo.ToggleActive(ctx, id); err != nil {
		return nil, err
	}
	return u.dialectRepo.FindByID(ctx, id)
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
	EntriesPerDialect   []DialectCount   `json:"entries_per_dialect"`
	SubmissionsByStatus map[string]int64 `json:"submissions_by_status"`
	TopContributors     []ContributorRow `json:"top_contributors"`
	GrowthByMonth       []MonthlyCount   `json:"growth_by_month"`
}

type DialectCount struct {
	DialectName string `json:"dialect_name"`
	Total       int64  `json:"total"`
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
