package postgres

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/kamus-manggarai/backend/internal/domain/entity"
	"github.com/kamus-manggarai/backend/internal/domain/repository"
	"github.com/kamus-manggarai/backend/pkg/apperror"
)

type entryRepo struct {
	db *pgxpool.Pool
}

func NewEntryRepo(db *pgxpool.Pool) repository.EntryRepository {
	return &entryRepo{db: db}
}

const entryColumns = `id, indonesian, manggarai, slug, homonym_number, part_of_speech, notes, source, status, created_by, created_at, updated_at`

func (r *entryRepo) FindByID(ctx context.Context, id uuid.UUID) (*entity.Entry, error) {
	row := r.db.QueryRow(ctx, `SELECT `+entryColumns+` FROM entries WHERE id = $1`, id)
	return scanEntry(row)
}

func (r *entryRepo) FindBySlug(ctx context.Context, slug string) (*entity.Entry, error) {
	row := r.db.QueryRow(ctx, `SELECT `+entryColumns+` FROM entries WHERE slug = $1`, slug)
	return scanEntry(row)
}

func (r *entryRepo) SlugExists(ctx context.Context, slug string) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM entries WHERE slug = $1)`, slug).Scan(&exists)
	return exists, err
}

func (r *entryRepo) FindDetailBySlug(ctx context.Context, slug string) (*entity.EntryDetail, error) {
	entry, err := r.FindBySlug(ctx, slug)
	if err != nil {
		return nil, err
	}

	detail := &entity.EntryDetail{Entry: *entry}

	if entry.CreatedBy != nil {
		var creatorName string
		_ = r.db.QueryRow(ctx, `SELECT name FROM users WHERE id = $1`, *entry.CreatedBy).Scan(&creatorName)
		detail.CreatedByName = creatorName
	}

	derived, err := r.findDerivedByEntryID(ctx, entry.ID)
	if err != nil {
		return nil, err
	}
	detail.DerivedWords = derived

	return detail, nil
}

func (r *entryRepo) findDerivedByEntryID(ctx context.Context, entryID uuid.UUID) ([]entity.DerivedWord, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, entry_id, word, translation, sort_order, created_at
		FROM derived_words WHERE entry_id = $1
		ORDER BY sort_order ASC, created_at ASC`, entryID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]entity.DerivedWord, 0)
	for rows.Next() {
		d := entity.DerivedWord{}
		if err := rows.Scan(&d.ID, &d.EntryID, &d.Word, &d.Translation, &d.SortOrder, &d.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, d)
	}
	return out, rows.Err()
}

func (r *entryRepo) FindPublished(ctx context.Context, filter repository.EntryFilter) ([]*entity.EntrySummary, int64, error) {
	where := []string{`status = 'published'`}
	args := []interface{}{}
	idx := 1

	if letter := strings.TrimSpace(filter.Letter); letter != "" {
		where = append(where, fmt.Sprintf(`LOWER(indonesian) LIKE $%d`, idx))
		args = append(args, strings.ToLower(letter[:1])+"%")
		idx++
	}

	whereClause := strings.Join(where, " AND ")

	if filter.Page < 1 {
		filter.Page = 1
	}
	if filter.Limit < 1 {
		filter.Limit = 20
	}

	listQ := fmt.Sprintf(`
		SELECT id, indonesian, manggarai, slug, homonym_number, part_of_speech
		FROM entries
		WHERE %s
		ORDER BY LOWER(indonesian) ASC
		LIMIT $%d OFFSET $%d`, whereClause, idx, idx+1)
	listArgs := append(append([]interface{}{}, args...), filter.Limit, (filter.Page-1)*filter.Limit)

	rows, err := r.db.Query(ctx, listQ, listArgs...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	items := make([]*entity.EntrySummary, 0)
	for rows.Next() {
		s := &entity.EntrySummary{}
		if err := rows.Scan(&s.ID, &s.Indonesian, &s.Manggarai, &s.Slug, &s.HomonymNumber, &s.PartOfSpeech); err != nil {
			return nil, 0, err
		}
		items = append(items, s)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}

	countQ := fmt.Sprintf(`SELECT COUNT(*) FROM entries WHERE %s`, whereClause)
	var total int64
	if err := r.db.QueryRow(ctx, countQ, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	return items, total, nil
}

func (r *entryRepo) Search(ctx context.Context, filter repository.SearchFilter) ([]*entity.EntrySummary, int64, error) {
	if filter.Page < 1 {
		filter.Page = 1
	}
	if filter.Limit < 1 {
		filter.Limit = 20
	}

	// Choose the column to match against based on search direction.
	// manggarai_to_indonesia: user types Manggarai, match the manggarai column.
	// indonesia_to_manggarai: user types Indonesian, match the indonesian column.
	col := "manggarai"
	if filter.Direction == "indonesia_to_manggarai" {
		col = "indonesian"
	}

	// Accent-insensitive, typo-tolerant match via pg_trgm similarity, with an
	// exact/prefix boost so the best matches surface first.
	matchExpr := fmt.Sprintf("immutable_unaccent(lower(%s))", col)

	listQ := fmt.Sprintf(`
		SELECT id, indonesian, manggarai, slug, homonym_number, part_of_speech
		FROM entries
		WHERE status = 'published'
		  AND (%s %% immutable_unaccent(lower($1))
		       OR %s LIKE immutable_unaccent(lower($1)) || '%%')
		ORDER BY
			(%s = immutable_unaccent(lower($1))) DESC,
			similarity(%s, immutable_unaccent(lower($1))) DESC,
			LOWER(%s) ASC
		LIMIT $2 OFFSET $3`, matchExpr, matchExpr, matchExpr, matchExpr, col)

	rows, err := r.db.Query(ctx, listQ, filter.Query, filter.Limit, (filter.Page-1)*filter.Limit)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	items := make([]*entity.EntrySummary, 0)
	for rows.Next() {
		s := &entity.EntrySummary{}
		if err := rows.Scan(&s.ID, &s.Indonesian, &s.Manggarai, &s.Slug, &s.HomonymNumber, &s.PartOfSpeech); err != nil {
			return nil, 0, err
		}
		items = append(items, s)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}

	countQ := fmt.Sprintf(`
		SELECT COUNT(*) FROM entries
		WHERE status = 'published'
		  AND (%s %% immutable_unaccent(lower($1))
		       OR %s LIKE immutable_unaccent(lower($1)) || '%%')`, matchExpr, matchExpr)
	var total int64
	if err := r.db.QueryRow(ctx, countQ, filter.Query).Scan(&total); err != nil {
		return nil, 0, err
	}

	return items, total, nil
}

func (r *entryRepo) Suggest(ctx context.Context, query, direction string, limit int) ([]string, error) {
	if limit < 1 {
		limit = 5
	}
	col := "manggarai"
	if direction == "indonesia_to_manggarai" {
		col = "indonesian"
	}
	matchExpr := fmt.Sprintf("immutable_unaccent(lower(%s))", col)

	q := fmt.Sprintf(`
		SELECT %s
		FROM entries
		WHERE status = 'published'
		ORDER BY similarity(%s, immutable_unaccent(lower($1))) DESC
		LIMIT $2`, col, matchExpr)

	rows, err := r.db.Query(ctx, q, query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]string, 0, limit)
	for rows.Next() {
		var s string
		if err := rows.Scan(&s); err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, rows.Err()
}

func (r *entryRepo) Create(ctx context.Context, p repository.CreateEntryParams) (*entity.Entry, error) {
	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	entry := &entity.Entry{
		ID:            uuid.New(),
		Indonesian:    p.Indonesian,
		Manggarai:     p.Manggarai,
		Slug:          p.Slug,
		HomonymNumber: p.HomonymNumber,
		PartOfSpeech:  p.PartOfSpeech,
		Notes:         p.Notes,
		Source:        p.Source,
		Status:        p.Status,
		CreatedBy:     p.CreatedBy,
	}
	if entry.Status == "" {
		entry.Status = entity.StatusPublished
	}

	row := tx.QueryRow(ctx, `
		INSERT INTO entries (id, indonesian, manggarai, slug, homonym_number, part_of_speech, notes, source, status, created_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING created_at, updated_at`,
		entry.ID, entry.Indonesian, entry.Manggarai, entry.Slug, entry.HomonymNumber,
		entry.PartOfSpeech, entry.Notes, entry.Source, entry.Status, entry.CreatedBy)
	if err := row.Scan(&entry.CreatedAt, &entry.UpdatedAt); err != nil {
		return nil, err
	}

	for i, d := range p.Derived {
		if strings.TrimSpace(d.Word) == "" {
			continue
		}
		_, err := tx.Exec(ctx, `
			INSERT INTO derived_words (entry_id, word, translation, sort_order)
			VALUES ($1, $2, $3, $4)`,
			entry.ID, d.Word, d.Translation, i)
		if err != nil {
			return nil, fmt.Errorf("insert derived_word: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return entry, nil
}

func (r *entryRepo) Update(ctx context.Context, e *entity.Entry) error {
	tag, err := r.db.Exec(ctx, `
		UPDATE entries
		SET indonesian = $1, manggarai = $2, part_of_speech = $3, notes = $4, source = $5, status = $6, updated_at = NOW()
		WHERE id = $7`,
		e.Indonesian, e.Manggarai, e.PartOfSpeech, e.Notes, e.Source, e.Status, e.ID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return apperror.ErrNotFound
	}
	return nil
}

func (r *entryRepo) Delete(ctx context.Context, id uuid.UUID) error {
	tag, err := r.db.Exec(ctx, `DELETE FROM entries WHERE id = $1`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return apperror.ErrNotFound
	}
	return nil
}

func (r *entryRepo) CountPublished(ctx context.Context) (int64, error) {
	var total int64
	err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM entries WHERE status = 'published'`).Scan(&total)
	return total, err
}

func scanEntry(row rowScanner) (*entity.Entry, error) {
	e := &entity.Entry{}
	err := row.Scan(
		&e.ID, &e.Indonesian, &e.Manggarai, &e.Slug, &e.HomonymNumber,
		&e.PartOfSpeech, &e.Notes, &e.Source, &e.Status, &e.CreatedBy, &e.CreatedAt, &e.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, apperror.ErrNotFound
		}
		return nil, err
	}
	return e, nil
}
