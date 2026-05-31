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

const entryColumns = `id, manggarai, slug, homonym_number, source, status, created_by, created_at, updated_at`

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

	senses, err := r.findSensesByEntryID(ctx, entry.ID)
	if err != nil {
		return nil, err
	}
	detail.Senses = senses

	derived, err := r.findDerivedByEntryID(ctx, entry.ID)
	if err != nil {
		return nil, err
	}
	detail.DerivedWords = derived

	return detail, nil
}

func (r *entryRepo) findSensesByEntryID(ctx context.Context, entryID uuid.UUID) ([]entity.Sense, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, entry_id, indonesian, part_of_speech, notes, sort_order, created_at
		FROM senses WHERE entry_id = $1
		ORDER BY sort_order ASC, created_at ASC`, entryID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]entity.Sense, 0)
	for rows.Next() {
		s := entity.Sense{}
		if err := rows.Scan(&s.ID, &s.EntryID, &s.Indonesian, &s.PartOfSpeech, &s.Notes, &s.SortOrder, &s.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, rows.Err()
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

// summarySelect builds an EntrySummary list query that aggregates each entry's
// senses into a translations array plus a primary translation/part of speech.
// The caller provides the WHERE clause, ORDER BY clause, and bound args; the
// senses are joined via a lateral aggregate so ordering stays stable.
const summarySelect = `
	SELECT e.id, e.manggarai, e.slug, e.homonym_number,
	       agg.translations, agg.primary_indonesian, agg.primary_pos
	FROM entries e
	JOIN LATERAL (
		SELECT
			array_agg(s.indonesian ORDER BY s.sort_order ASC, s.created_at ASC) AS translations,
			(array_agg(s.indonesian ORDER BY s.sort_order ASC, s.created_at ASC))[1] AS primary_indonesian,
			(array_agg(s.part_of_speech ORDER BY s.sort_order ASC, s.created_at ASC))[1] AS primary_pos
		FROM senses s
		WHERE s.entry_id = e.id
	) agg ON TRUE`

func scanSummaryRows(rows pgx.Rows) ([]*entity.EntrySummary, error) {
	items := make([]*entity.EntrySummary, 0)
	for rows.Next() {
		s := &entity.EntrySummary{}
		var translations []string
		if err := rows.Scan(&s.ID, &s.Manggarai, &s.Slug, &s.HomonymNumber, &translations, &s.Indonesian, &s.PartOfSpeech); err != nil {
			return nil, err
		}
		s.Translations = translations
		items = append(items, s)
	}
	return items, rows.Err()
}

func (r *entryRepo) FindPublished(ctx context.Context, filter repository.EntryFilter) ([]*entity.EntrySummary, int64, error) {
	if filter.Page < 1 {
		filter.Page = 1
	}
	if filter.Limit < 1 {
		filter.Limit = 20
	}

	args := []interface{}{}
	idx := 1
	// Filter by first letter of the Indonesian headword (matches any sense).
	letterJoin := ""
	letterWhere := ""
	if letter := strings.TrimSpace(filter.Letter); letter != "" {
		letterJoin = `JOIN senses fs ON fs.entry_id = e.id`
		letterWhere = fmt.Sprintf(`AND LOWER(fs.indonesian) LIKE $%d`, idx)
		args = append(args, strings.ToLower(letter[:1])+"%")
		idx++
	}

	listQ := fmt.Sprintf(`
		SELECT DISTINCT ON (LOWER(agg.primary_indonesian), e.id)
		       e.id, e.manggarai, e.slug, e.homonym_number,
		       agg.translations, agg.primary_indonesian, agg.primary_pos
		FROM entries e
		%s
		JOIN LATERAL (
			SELECT
				array_agg(s.indonesian ORDER BY s.sort_order ASC, s.created_at ASC) AS translations,
				(array_agg(s.indonesian ORDER BY s.sort_order ASC, s.created_at ASC))[1] AS primary_indonesian,
				(array_agg(s.part_of_speech ORDER BY s.sort_order ASC, s.created_at ASC))[1] AS primary_pos
			FROM senses s
			WHERE s.entry_id = e.id
		) agg ON TRUE
		WHERE e.status = 'published' %s
		ORDER BY LOWER(agg.primary_indonesian) ASC, e.id ASC
		LIMIT $%d OFFSET $%d`, letterJoin, letterWhere, idx, idx+1)
	listArgs := append(append([]interface{}{}, args...), filter.Limit, (filter.Page-1)*filter.Limit)

	rows, err := r.db.Query(ctx, listQ, listArgs...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	items, err := scanSummaryRows(rows)
	if err != nil {
		return nil, 0, err
	}

	countQ := fmt.Sprintf(`
		SELECT COUNT(DISTINCT e.id)
		FROM entries e
		%s
		WHERE e.status = 'published' %s`, letterJoin, letterWhere)
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

	if filter.Direction == "indonesia_to_manggarai" {
		return r.searchByIndonesian(ctx, filter)
	}
	return r.searchByManggarai(ctx, filter)
}

// searchByManggarai matches the Manggarai headword column on entries.
func (r *entryRepo) searchByManggarai(ctx context.Context, filter repository.SearchFilter) ([]*entity.EntrySummary, int64, error) {
	matchExpr := "immutable_unaccent(lower(e.manggarai))"

	listQ := fmt.Sprintf(`
		%s
		WHERE e.status = 'published'
		  AND (%s %% immutable_unaccent(lower($1))
		       OR %s LIKE immutable_unaccent(lower($1)) || '%%')
		ORDER BY
			(%s = immutable_unaccent(lower($1))) DESC,
			similarity(%s, immutable_unaccent(lower($1))) DESC,
			LOWER(e.manggarai) ASC
		LIMIT $2 OFFSET $3`, summarySelect, matchExpr, matchExpr, matchExpr, matchExpr)

	rows, err := r.db.Query(ctx, listQ, filter.Query, filter.Limit, (filter.Page-1)*filter.Limit)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	items, err := scanSummaryRows(rows)
	if err != nil {
		return nil, 0, err
	}

	countQ := fmt.Sprintf(`
		SELECT COUNT(*) FROM entries e
		WHERE e.status = 'published'
		  AND (%s %% immutable_unaccent(lower($1))
		       OR %s LIKE immutable_unaccent(lower($1)) || '%%')`, matchExpr, matchExpr)
	var total int64
	if err := r.db.QueryRow(ctx, countQ, filter.Query).Scan(&total); err != nil {
		return nil, 0, err
	}

	return items, total, nil
}

// searchByIndonesian matches any sense's Indonesian translation, returning the
// distinct parent entries ranked by their best-matching sense.
func (r *entryRepo) searchByIndonesian(ctx context.Context, filter repository.SearchFilter) ([]*entity.EntrySummary, int64, error) {
	matchExpr := "immutable_unaccent(lower(s.indonesian))"

	// Rank entries by the best (max) similarity across their senses.
	listQ := fmt.Sprintf(`
		SELECT e.id, e.manggarai, e.slug, e.homonym_number,
		       agg.translations, agg.primary_indonesian, agg.primary_pos,
		       m.best_exact, m.best_sim
		FROM entries e
		JOIN LATERAL (
			SELECT
				bool_or(%s = immutable_unaccent(lower($1))) AS best_exact,
				max(similarity(%s, immutable_unaccent(lower($1)))) AS best_sim
			FROM senses s
			WHERE s.entry_id = e.id
			  AND (%s %% immutable_unaccent(lower($1))
			       OR %s LIKE immutable_unaccent(lower($1)) || '%%')
		) m ON TRUE
		JOIN LATERAL (
			SELECT
				array_agg(s2.indonesian ORDER BY s2.sort_order ASC, s2.created_at ASC) AS translations,
				(array_agg(s2.indonesian ORDER BY s2.sort_order ASC, s2.created_at ASC))[1] AS primary_indonesian,
				(array_agg(s2.part_of_speech ORDER BY s2.sort_order ASC, s2.created_at ASC))[1] AS primary_pos
			FROM senses s2
			WHERE s2.entry_id = e.id
		) agg ON TRUE
		WHERE e.status = 'published' AND m.best_sim IS NOT NULL
		ORDER BY m.best_exact DESC, m.best_sim DESC, LOWER(agg.primary_indonesian) ASC
		LIMIT $2 OFFSET $3`, matchExpr, matchExpr, matchExpr, matchExpr)

	rows, err := r.db.Query(ctx, listQ, filter.Query, filter.Limit, (filter.Page-1)*filter.Limit)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	items := make([]*entity.EntrySummary, 0)
	for rows.Next() {
		s := &entity.EntrySummary{}
		var translations []string
		var bestExact *bool
		var bestSim *float64
		if err := rows.Scan(&s.ID, &s.Manggarai, &s.Slug, &s.HomonymNumber, &translations, &s.Indonesian, &s.PartOfSpeech, &bestExact, &bestSim); err != nil {
			return nil, 0, err
		}
		s.Translations = translations
		items = append(items, s)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}

	countQ := fmt.Sprintf(`
		SELECT COUNT(DISTINCT s.entry_id)
		FROM senses s
		JOIN entries e ON e.id = s.entry_id
		WHERE e.status = 'published'
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

	var q string
	if direction == "indonesia_to_manggarai" {
		matchExpr := "immutable_unaccent(lower(indonesian))"
		q = fmt.Sprintf(`
			SELECT DISTINCT indonesian
			FROM senses
			ORDER BY similarity(%s, immutable_unaccent(lower($1))) DESC
			LIMIT $2`, matchExpr)
	} else {
		matchExpr := "immutable_unaccent(lower(manggarai))"
		q = fmt.Sprintf(`
			SELECT manggarai
			FROM entries
			WHERE status = 'published'
			ORDER BY similarity(%s, immutable_unaccent(lower($1))) DESC
			LIMIT $2`, matchExpr)
	}

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
		Manggarai:     p.Manggarai,
		Slug:          p.Slug,
		HomonymNumber: p.HomonymNumber,
		Source:        p.Source,
		Status:        p.Status,
		CreatedBy:     p.CreatedBy,
	}
	if entry.Status == "" {
		entry.Status = entity.StatusPublished
	}

	row := tx.QueryRow(ctx, `
		INSERT INTO entries (id, manggarai, slug, homonym_number, source, status, created_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING created_at, updated_at`,
		entry.ID, entry.Manggarai, entry.Slug, entry.HomonymNumber,
		entry.Source, entry.Status, entry.CreatedBy)
	if err := row.Scan(&entry.CreatedAt, &entry.UpdatedAt); err != nil {
		return nil, err
	}

	for i, s := range p.Senses {
		if strings.TrimSpace(s.Indonesian) == "" {
			continue
		}
		_, err := tx.Exec(ctx, `
			INSERT INTO senses (entry_id, indonesian, part_of_speech, notes, sort_order)
			VALUES ($1, $2, $3, $4, $5)`,
			entry.ID, s.Indonesian, s.PartOfSpeech, s.Notes, i)
		if err != nil {
			return nil, fmt.Errorf("insert sense: %w", err)
		}
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
		SET manggarai = $1, source = $2, status = $3, updated_at = NOW()
		WHERE id = $4`,
		e.Manggarai, e.Source, e.Status, e.ID)
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
		&e.ID, &e.Manggarai, &e.Slug, &e.HomonymNumber,
		&e.Source, &e.Status, &e.CreatedBy, &e.CreatedAt, &e.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, apperror.ErrNotFound
		}
		return nil, err
	}
	return e, nil
}
