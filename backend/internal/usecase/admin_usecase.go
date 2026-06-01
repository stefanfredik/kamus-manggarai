package usecase

import (
	"context"
	"errors"
	"strings"

	"github.com/google/uuid"
	"github.com/kamus-manggarai/backend/internal/domain/entity"
	"github.com/kamus-manggarai/backend/internal/domain/repository"
	"github.com/kamus-manggarai/backend/pkg/apperror"
	"golang.org/x/crypto/bcrypt"
)

type AdminUseCase struct {
	userRepo   repository.UserRepository
	reportRepo repository.ReportRepository
	subRepo    repository.SubmissionRepository
	wordRepo   repository.WordRepository
}

func NewAdminUseCase(
	userRepo repository.UserRepository,
	reportRepo repository.ReportRepository,
	subRepo repository.SubmissionRepository,
	wordRepo repository.WordRepository,
) *AdminUseCase {
	return &AdminUseCase{
		userRepo:   userRepo,
		reportRepo: reportRepo,
		subRepo:    subRepo,
		wordRepo:   wordRepo,
	}
}

func (u *AdminUseCase) ListUsers(ctx context.Context, page, limit int) ([]*entity.User, int64, error) {
	return u.userRepo.ListAll(ctx, page, limit)
}

func validRole(role string) bool {
	switch role {
	case entity.RoleAdmin, entity.RoleValidator, entity.RoleContributor:
		return true
	}
	return false
}

func normalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

type CreateUserInput struct {
	Name     string
	Email    string
	Password string
	Role     string
}

func (u *AdminUseCase) CreateUser(ctx context.Context, input CreateUserInput) (*entity.User, error) {
	name := strings.TrimSpace(input.Name)
	email := normalizeEmail(input.Email)
	if name == "" {
		return nil, apperror.ErrValidation.WithMessage("nama wajib diisi")
	}
	if email == "" || !strings.Contains(email, "@") {
		return nil, apperror.ErrValidation.WithMessage("email tidak valid")
	}
	if len(input.Password) < 8 {
		return nil, apperror.ErrValidation.WithMessage("password minimal 8 karakter")
	}
	if !validRole(input.Role) {
		return nil, apperror.ErrValidation.WithMessage("role tidak valid")
	}

	if existing, err := u.userRepo.FindByEmail(ctx, email); err == nil && existing != nil {
		return nil, apperror.ErrConflict.WithMessage("email sudah terdaftar")
	} else if err != nil && !errors.Is(err, apperror.ErrNotFound) {
		return nil, err
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, apperror.ErrInternal.WithCause(err)
	}
	hashStr := string(hash)

	newUser := &entity.User{
		Name:         name,
		Email:        email,
		Role:         input.Role,
		PasswordHash: &hashStr,
	}
	if err := u.userRepo.Create(ctx, newUser); err != nil {
		return nil, err
	}
	return newUser, nil
}

type UpdateUserInput struct {
	Name  string
	Email string
	Role  string
}

func (u *AdminUseCase) UpdateUser(ctx context.Context, userID uuid.UUID, requesterID uuid.UUID, input UpdateUserInput) (*entity.User, error) {
	name := strings.TrimSpace(input.Name)
	email := normalizeEmail(input.Email)
	if name == "" {
		return nil, apperror.ErrValidation.WithMessage("nama wajib diisi")
	}
	if email == "" || !strings.Contains(email, "@") {
		return nil, apperror.ErrValidation.WithMessage("email tidak valid")
	}
	if !validRole(input.Role) {
		return nil, apperror.ErrValidation.WithMessage("role tidak valid")
	}

	target, err := u.userRepo.FindByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	// An admin must not strip their own admin role and lock themselves out.
	if target.ID == requesterID && target.IsAdmin() && input.Role != entity.RoleAdmin {
		return nil, apperror.ErrForbidden.WithMessage("tidak dapat mengubah role admin sendiri")
	}

	// Reject an email change that collides with a different account.
	if email != target.Email {
		if existing, err := u.userRepo.FindByEmail(ctx, email); err == nil && existing != nil && existing.ID != userID {
			return nil, apperror.ErrConflict.WithMessage("email sudah terdaftar")
		} else if err != nil && !errors.Is(err, apperror.ErrNotFound) {
			return nil, err
		}
	}

	if err := u.userRepo.UpdateProfile(ctx, userID, name, email, input.Role); err != nil {
		return nil, err
	}
	return u.userRepo.FindByID(ctx, userID)
}

func (u *AdminUseCase) ResetPassword(ctx context.Context, userID uuid.UUID, newPassword string) error {
	if len(newPassword) < 8 {
		return apperror.ErrValidation.WithMessage("password minimal 8 karakter")
	}
	if _, err := u.userRepo.FindByID(ctx, userID); err != nil {
		return err
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return apperror.ErrInternal.WithCause(err)
	}
	return u.userRepo.UpdatePassword(ctx, userID, string(hash))
}

func (u *AdminUseCase) DeleteUser(ctx context.Context, userID uuid.UUID, requesterID uuid.UUID) error {
	if userID == requesterID {
		return apperror.ErrForbidden.WithMessage("tidak dapat menghapus akun sendiri")
	}
	target, err := u.userRepo.FindByID(ctx, userID)
	if err != nil {
		return err
	}
	if target.IsAdmin() {
		return apperror.ErrForbidden.WithMessage("tidak dapat menghapus akun admin")
	}
	return u.userRepo.Delete(ctx, userID)
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
