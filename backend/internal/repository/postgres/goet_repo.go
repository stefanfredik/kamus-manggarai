package postgres

import (
	"context"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/kamus-manggarai/backend/internal/domain/entity"
	"github.com/kamus-manggarai/backend/internal/domain/repository"
	"github.com/kamus-manggarai/backend/pkg/apperror"
)

type goetRepo struct {
	db *pgxpool.Pool
}

func NewGoetRepo(db *pgxpool.Pool) repository.GoetRepository {
	return &goetRepo{db: db}
}

func (r *goetRepo) List(ctx context.Context, query string, page, limit int) ([]*entity.Goet, int64, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 20
	}

	// Optional case-insensitive filter across the saying and its meaning.
	where := ""
	args := []interface{}{limit, (page - 1) * limit}
	countArgs := []interface{}{}
	if q := strings.TrimSpace(query); q != "" {
		where = " WHERE g.manggarai ILIKE $3 OR g.meaning ILIKE $3"
		pattern := "%" + q + "%"
		args = append(args, pattern)
		countArgs = append(countArgs, pattern)
	}

	rows, err := r.db.Query(ctx, `
		SELECT g.id, g.manggarai, g.meaning, g.created_by, COALESCE(u.name, ''), g.created_at, g.updated_at
		FROM goet g
		LEFT JOIN users u ON u.id = g.created_by`+where+`
		ORDER BY g.created_at DESC
		LIMIT $1 OFFSET $2`, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	items := make([]*entity.Goet, 0)
	for rows.Next() {
		g := &entity.Goet{}
		if err := rows.Scan(&g.ID, &g.Manggarai, &g.Meaning, &g.CreatedBy, &g.CreatedByName, &g.CreatedAt, &g.UpdatedAt); err != nil {
			return nil, 0, err
		}
		items = append(items, g)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}

	countWhere := ""
	if where != "" {
		countWhere = " WHERE manggarai ILIKE $1 OR meaning ILIKE $1"
	}
	var total int64
	if err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM goet`+countWhere, countArgs...).Scan(&total); err != nil {
		return nil, 0, err
	}
	return items, total, nil
}

func (r *goetRepo) FindByID(ctx context.Context, id uuid.UUID) (*entity.Goet, error) {
	g := &entity.Goet{}
	err := r.db.QueryRow(ctx, `
		SELECT g.id, g.manggarai, g.meaning, g.created_by, COALESCE(u.name, ''), g.created_at, g.updated_at
		FROM goet g
		LEFT JOIN users u ON u.id = g.created_by
		WHERE g.id = $1`, id).
		Scan(&g.ID, &g.Manggarai, &g.Meaning, &g.CreatedBy, &g.CreatedByName, &g.CreatedAt, &g.UpdatedAt)
	if err != nil {
		return nil, apperror.ErrNotFound
	}
	return g, nil
}

func (r *goetRepo) Create(ctx context.Context, p repository.CreateGoetParams) (*entity.Goet, error) {
	g := &entity.Goet{
		ID:        uuid.New(),
		Manggarai: p.Manggarai,
		Meaning:   p.Meaning,
		CreatedBy: p.CreatedBy,
	}
	err := r.db.QueryRow(ctx, `
		INSERT INTO goet (id, manggarai, meaning, created_by)
		VALUES ($1, $2, $3, $4)
		RETURNING created_at, updated_at`,
		g.ID, g.Manggarai, g.Meaning, g.CreatedBy).Scan(&g.CreatedAt, &g.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return g, nil
}

func (r *goetRepo) Update(ctx context.Context, p repository.UpdateGoetParams) (*entity.Goet, error) {
	g := &entity.Goet{ID: p.ID, Manggarai: p.Manggarai, Meaning: p.Meaning}
	err := r.db.QueryRow(ctx, `
		UPDATE goet SET manggarai = $2, meaning = $3, updated_at = NOW()
		WHERE id = $1
		RETURNING created_by, created_at, updated_at`,
		p.ID, p.Manggarai, p.Meaning).Scan(&g.CreatedBy, &g.CreatedAt, &g.UpdatedAt)
	if err != nil {
		return nil, apperror.ErrNotFound
	}
	return g, nil
}

func (r *goetRepo) Delete(ctx context.Context, id uuid.UUID) error {
	tag, err := r.db.Exec(ctx, `DELETE FROM goet WHERE id = $1`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return apperror.ErrNotFound
	}
	return nil
}
