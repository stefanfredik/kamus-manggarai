package postgres

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/kamus-manggarai/backend/internal/domain/entity"
	"github.com/kamus-manggarai/backend/internal/domain/repository"
)

type dialectRepo struct {
	pool *pgxpool.Pool
}

func NewDialectRepo(pool *pgxpool.Pool) repository.DialectRepository {
	return &dialectRepo{pool: pool}
}

func (r *dialectRepo) FindAll(ctx context.Context) ([]*entity.Dialect, error) {
	rows, err := r.pool.Query(ctx, `SELECT id, name, description, created_at, updated_at FROM dialects ORDER BY name ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []*entity.Dialect
	for rows.Next() {
		var d entity.Dialect
		if err := rows.Scan(&d.ID, &d.Name, &d.Description, &d.CreatedAt, &d.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, &d)
	}
	return out, rows.Err()
}

func (r *dialectRepo) FindByID(ctx context.Context, id uuid.UUID) (*entity.Dialect, error) {
	var d entity.Dialect
	err := r.pool.QueryRow(ctx, `SELECT id, name, description, created_at, updated_at FROM dialects WHERE id = $1`, id).
		Scan(&d.ID, &d.Name, &d.Description, &d.CreatedAt, &d.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &d, nil
}

func (r *dialectRepo) Create(ctx context.Context, name string, description string) (*entity.Dialect, error) {
	var d entity.Dialect
	err := r.pool.QueryRow(ctx, `
		INSERT INTO dialects (name, description) VALUES ($1, $2)
		RETURNING id, name, description, created_at, updated_at`, name, description).
		Scan(&d.ID, &d.Name, &d.Description, &d.CreatedAt, &d.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &d, nil
}

func (r *dialectRepo) Update(ctx context.Context, id uuid.UUID, name string, description string) (*entity.Dialect, error) {
	var d entity.Dialect
	err := r.pool.QueryRow(ctx, `
		UPDATE dialects SET name = $1, description = $2, updated_at = NOW() WHERE id = $3
		RETURNING id, name, description, created_at, updated_at`, name, description, id).
		Scan(&d.ID, &d.Name, &d.Description, &d.CreatedAt, &d.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &d, nil
}

func (r *dialectRepo) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM dialects WHERE id = $1`, id)
	return err
}
