package postgres

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/kamus-manggarai/backend/internal/domain/entity"
	"github.com/kamus-manggarai/backend/internal/domain/repository"
	"github.com/kamus-manggarai/backend/pkg/apperror"
)

type userRepo struct {
	db *pgxpool.Pool
}

func NewUserRepo(db *pgxpool.Pool) repository.UserRepository {
	return &userRepo{db: db}
}

func (r *userRepo) FindByID(ctx context.Context, id uuid.UUID) (*entity.User, error) {
	row := r.db.QueryRow(ctx, `
		SELECT id, google_id, email, name, avatar_url, password_hash, role, is_suspended, created_at, updated_at
		FROM users WHERE id = $1`, id)
	return scanUser(row)
}

func (r *userRepo) FindByEmail(ctx context.Context, email string) (*entity.User, error) {
	row := r.db.QueryRow(ctx, `
		SELECT id, google_id, email, name, avatar_url, password_hash, role, is_suspended, created_at, updated_at
		FROM users WHERE email = $1`, email)
	return scanUser(row)
}

func (r *userRepo) FindByGoogleID(ctx context.Context, googleID string) (*entity.User, error) {
	row := r.db.QueryRow(ctx, `
		SELECT id, google_id, email, name, avatar_url, password_hash, role, is_suspended, created_at, updated_at
		FROM users WHERE google_id = $1`, googleID)
	return scanUser(row)
}

func (r *userRepo) Create(ctx context.Context, u *entity.User) error {
	if u.ID == uuid.Nil {
		u.ID = uuid.New()
	}
	if u.Role == "" {
		u.Role = entity.RoleContributor
	}

	row := r.db.QueryRow(ctx, `
		INSERT INTO users (id, google_id, email, name, avatar_url, password_hash, role, is_suspended)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING created_at, updated_at`,
		u.ID, u.GoogleID, u.Email, u.Name, u.AvatarURL, u.PasswordHash, u.Role, u.IsSuspended)
	err := row.Scan(&u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return err
	}
	u.IsGoogleUser = u.GoogleID != nil
	return nil
}

func (r *userRepo) UpdateRole(ctx context.Context, id uuid.UUID, role string) error {
	tag, err := r.db.Exec(ctx, `UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2`, role, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return apperror.ErrNotFound
	}
	return nil
}

func (r *userRepo) UpdateSuspendStatus(ctx context.Context, id uuid.UUID, suspended bool) error {
	tag, err := r.db.Exec(ctx, `UPDATE users SET is_suspended = $1, updated_at = NOW() WHERE id = $2`, suspended, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return apperror.ErrNotFound
	}
	return nil
}

func (r *userRepo) UpdateProfile(ctx context.Context, id uuid.UUID, name, email, role string) error {
	tag, err := r.db.Exec(ctx, `
		UPDATE users SET name = $1, email = $2, role = $3, updated_at = NOW()
		WHERE id = $4`, name, email, role, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return apperror.ErrNotFound
	}
	return nil
}

func (r *userRepo) UpdatePassword(ctx context.Context, id uuid.UUID, passwordHash string) error {
	tag, err := r.db.Exec(ctx, `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`, passwordHash, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return apperror.ErrNotFound
	}
	return nil
}

func (r *userRepo) Delete(ctx context.Context, id uuid.UUID) error {
	tag, err := r.db.Exec(ctx, `DELETE FROM users WHERE id = $1`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return apperror.ErrNotFound
	}
	return nil
}

func (r *userRepo) ListAll(ctx context.Context, page, limit int) ([]*entity.User, int64, error) {
	offset := (page - 1) * limit
	rows, err := r.db.Query(ctx, `
		SELECT id, google_id, email, name, avatar_url, password_hash, role, is_suspended, created_at, updated_at
		FROM users
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2`, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	users := make([]*entity.User, 0)
	for rows.Next() {
		u, err := scanUser(rows)
		if err != nil {
			return nil, 0, err
		}
		users = append(users, u)
	}

	var total int64
	if err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM users`).Scan(&total); err != nil {
		return nil, 0, err
	}
	return users, total, nil
}

type rowScanner interface {
	Scan(dest ...any) error
}

func scanUser(row rowScanner) (*entity.User, error) {
	u := &entity.User{}
	err := row.Scan(&u.ID, &u.GoogleID, &u.Email, &u.Name, &u.AvatarURL, &u.PasswordHash, &u.Role, &u.IsSuspended, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, apperror.ErrNotFound
		}
		return nil, err
	}
	u.IsGoogleUser = u.GoogleID != nil
	return u, nil
}

func (r *userRepo) GetLeaderboard(ctx context.Context, limit int) ([]*entity.LeaderboardRow, error) {
	rows, err := r.db.Query(ctx, `
		SELECT u.id, u.name, u.avatar_url, COUNT(s.id) AS approved_count
		FROM users u
		JOIN submissions s ON s.submitted_by = u.id
		WHERE s.status = 'approved' AND u.is_suspended = false
		GROUP BY u.id, u.name, u.avatar_url
		ORDER BY approved_count DESC, u.name ASC
		LIMIT $1`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	leaderboard := make([]*entity.LeaderboardRow, 0)
	for rows.Next() {
		row := &entity.LeaderboardRow{}
		if err := rows.Scan(&row.UserID, &row.Name, &row.AvatarURL, &row.ApprovedCount); err != nil {
			return nil, err
		}
		leaderboard = append(leaderboard, row)
	}
	return leaderboard, nil
}
