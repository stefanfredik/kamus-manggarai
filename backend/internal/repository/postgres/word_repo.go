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

type wordRepo struct {
	db *pgxpool.Pool
}

func NewWordRepo(db *pgxpool.Pool) repository.WordRepository {
	return &wordRepo{db: db}
}

const wordColumns = `id, language, lemma, slug, homonym_number, part_of_speech, status, created_by, created_at, updated_at`

func (r *wordRepo) FindByID(ctx context.Context, id uuid.UUID) (*entity.Word, error) {
	row := r.db.QueryRow(ctx, `SELECT `+wordColumns+` FROM words WHERE id = $1`, id)
	return scanWord(row)
}

func (r *wordRepo) FindBySlug(ctx context.Context, slug string) (*entity.Word, error) {
	row := r.db.QueryRow(ctx, `SELECT `+wordColumns+` FROM words WHERE slug = $1`, slug)
	return scanWord(row)
}

func (r *wordRepo) SlugExists(ctx context.Context, slug string) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM words WHERE slug = $1)`, slug).Scan(&exists)
	return exists, err
}

func (r *wordRepo) FindWordByLemma(ctx context.Context, language, lemma string) (*entity.Word, error) {
	row := r.db.QueryRow(ctx, `SELECT `+wordColumns+`
		FROM words WHERE language = $1 AND LOWER(lemma) = LOWER($2)
		ORDER BY created_at ASC LIMIT 1`, language, lemma)
	return scanWord(row)
}

func (r *wordRepo) FindDetailBySlug(ctx context.Context, slug string) (*entity.WordDetail, error) {
	word, err := r.FindBySlug(ctx, slug)
	if err != nil {
		return nil, err
	}

	detail := &entity.WordDetail{Word: *word}

	if word.CreatedBy != nil {
		var creatorName string
		_ = r.db.QueryRow(ctx, `SELECT name FROM users WHERE id = $1`, *word.CreatedBy).Scan(&creatorName)
		detail.CreatedByName = creatorName
	}

	links, err := r.findTranslations(ctx, word.ID, word.Language)
	if err != nil {
		return nil, err
	}
	detail.Translations = links

	derived, err := r.findDerivedByWordID(ctx, word.ID)
	if err != nil {
		return nil, err
	}
	detail.DerivedWords = derived

	return detail, nil
}

// findTranslations returns the counterpart words for a given word. The join
// column depends on which side the word is on.
func (r *wordRepo) findTranslations(ctx context.Context, wordID uuid.UUID, language string) ([]entity.TranslationLink, error) {
	selfCol, otherCol := "mgr_word_id", "id_word_id"
	if language == entity.LangIndonesian {
		selfCol, otherCol = "id_word_id", "mgr_word_id"
	}

	q := fmt.Sprintf(`
		SELECT t.id, w.id, w.lemma, w.slug, w.part_of_speech, t.notes, t.source
		FROM translations t
		JOIN words w ON w.id = t.%s
		WHERE t.%s = $1
		ORDER BY t.created_at ASC`, otherCol, selfCol)

	rows, err := r.db.Query(ctx, q, wordID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]entity.TranslationLink, 0)
	for rows.Next() {
		l := entity.TranslationLink{}
		if err := rows.Scan(&l.TranslationID, &l.WordID, &l.Lemma, &l.Slug, &l.PartOfSpeech, &l.Notes, &l.Source); err != nil {
			return nil, err
		}
		out = append(out, l)
	}
	return out, rows.Err()
}

func (r *wordRepo) findDerivedByWordID(ctx context.Context, wordID uuid.UUID) ([]entity.DerivedWord, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, word_id, word, translation, sort_order, created_at
		FROM derived_words WHERE word_id = $1
		ORDER BY sort_order ASC, created_at ASC`, wordID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]entity.DerivedWord, 0)
	for rows.Next() {
		d := entity.DerivedWord{}
		if err := rows.Scan(&d.ID, &d.WordID, &d.Word, &d.Translation, &d.SortOrder, &d.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, d)
	}
	return out, rows.Err()
}

// summaryAgg builds the lateral aggregate that collects a word's counterpart
// lemmas into a translations array. The direction of the join depends on the
// word's language, so callers pass the matching self/other columns.
func summaryAggSQL(selfCol, otherCol string) string {
	return fmt.Sprintf(`
		LEFT JOIN LATERAL (
			SELECT array_agg(cw.lemma ORDER BY t.created_at ASC) AS translations
			FROM translations t
			JOIN words cw ON cw.id = t.%s
			WHERE t.%s = w.id
		) agg ON TRUE`, otherCol, selfCol)
}

func scanSummaryRows(rows pgx.Rows) ([]*entity.WordSummary, error) {
	items := make([]*entity.WordSummary, 0)
	for rows.Next() {
		s := &entity.WordSummary{}
		var translations []string
		if err := rows.Scan(&s.ID, &s.Language, &s.Lemma, &s.Slug, &s.HomonymNumber, &s.PartOfSpeech, &translations); err != nil {
			return nil, err
		}
		s.Translations = translations
		items = append(items, s)
	}
	return items, rows.Err()
}

func (r *wordRepo) FindPublished(ctx context.Context, filter repository.WordFilter) ([]*entity.WordSummary, int64, error) {
	if filter.Page < 1 {
		filter.Page = 1
	}
	if filter.Limit < 1 {
		filter.Limit = 20
	}

	where := []string{`w.status = 'published'`}
	args := []interface{}{}
	idx := 1

	if lang := strings.TrimSpace(filter.Language); lang != "" {
		where = append(where, fmt.Sprintf(`w.language = $%d`, idx))
		args = append(args, lang)
		idx++
	}
	if letter := strings.TrimSpace(filter.Letter); letter != "" {
		where = append(where, fmt.Sprintf(`LOWER(w.lemma) LIKE $%d`, idx))
		args = append(args, strings.ToLower(letter[:1])+"%")
		idx++
	}
	whereClause := strings.Join(where, " AND ")

	// The translations aggregate must follow the word's own language, so we
	// union both directions via a CASE-free approach: aggregate from whichever
	// side matches. Here we compute it per row using a correlated lateral that
	// checks both columns.
	listQ := fmt.Sprintf(`
		SELECT w.id, w.language, w.lemma, w.slug, w.homonym_number, w.part_of_speech,
		       COALESCE(agg.translations, '{}') AS translations
		FROM words w
		LEFT JOIN LATERAL (
			SELECT array_agg(cw.lemma ORDER BY t.created_at ASC) AS translations
			FROM translations t
			JOIN words cw ON cw.id = CASE WHEN w.language = 'id' THEN t.mgr_word_id ELSE t.id_word_id END
			WHERE (w.language = 'id' AND t.id_word_id = w.id)
			   OR (w.language = 'mgr' AND t.mgr_word_id = w.id)
		) agg ON TRUE
		WHERE %s
		ORDER BY LOWER(w.lemma) ASC, w.id ASC
		LIMIT $%d OFFSET $%d`, whereClause, idx, idx+1)
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

	countQ := fmt.Sprintf(`SELECT COUNT(*) FROM words w WHERE %s`, whereClause)
	var total int64
	if err := r.db.QueryRow(ctx, countQ, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	return items, total, nil
}

func (r *wordRepo) Search(ctx context.Context, filter repository.SearchFilter) ([]*entity.WordSummary, int64, error) {
	if filter.Page < 1 {
		filter.Page = 1
	}
	if filter.Limit < 1 {
		filter.Limit = 20
	}

	// The search matches words in the source language of the chosen direction.
	// indonesia_to_manggarai: user types Indonesian, match 'id' words.
	// manggarai_to_indonesia: user types Manggarai, match 'mgr' words.
	srcLang := entity.LangManggarai
	selfCol, otherCol := "mgr_word_id", "id_word_id"
	if filter.Direction == "indonesia_to_manggarai" {
		srcLang = entity.LangIndonesian
		selfCol, otherCol = "id_word_id", "mgr_word_id"
	}

	matchExpr := "immutable_unaccent(lower(w.lemma))"
	aggJoin := summaryAggSQL(selfCol, otherCol)

	listQ := fmt.Sprintf(`
		SELECT w.id, w.language, w.lemma, w.slug, w.homonym_number, w.part_of_speech,
		       COALESCE(agg.translations, '{}') AS translations
		FROM words w
		%s
		WHERE w.status = 'published' AND w.language = $4
		  AND (%s %% immutable_unaccent(lower($1))
		       OR %s LIKE immutable_unaccent(lower($1)) || '%%')
		ORDER BY
			(%s = immutable_unaccent(lower($1))) DESC,
			similarity(%s, immutable_unaccent(lower($1))) DESC,
			LOWER(w.lemma) ASC
		LIMIT $2 OFFSET $3`, aggJoin, matchExpr, matchExpr, matchExpr, matchExpr)

	rows, err := r.db.Query(ctx, listQ, filter.Query, filter.Limit, (filter.Page-1)*filter.Limit, srcLang)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	items, err := scanSummaryRows(rows)
	if err != nil {
		return nil, 0, err
	}

	countQ := fmt.Sprintf(`
		SELECT COUNT(*) FROM words w
		WHERE w.status = 'published' AND w.language = $2
		  AND (%s %% immutable_unaccent(lower($1))
		       OR %s LIKE immutable_unaccent(lower($1)) || '%%')`, matchExpr, matchExpr)
	var total int64
	if err := r.db.QueryRow(ctx, countQ, filter.Query, srcLang).Scan(&total); err != nil {
		return nil, 0, err
	}

	return items, total, nil
}

func (r *wordRepo) Suggest(ctx context.Context, query, direction string, limit int) ([]string, error) {
	if limit < 1 {
		limit = 5
	}
	srcLang := entity.LangManggarai
	if direction == "indonesia_to_manggarai" {
		srcLang = entity.LangIndonesian
	}
	matchExpr := "immutable_unaccent(lower(lemma))"

	q := fmt.Sprintf(`
		SELECT lemma
		FROM words
		WHERE status = 'published' AND language = $2
		ORDER BY similarity(%s, immutable_unaccent(lower($1))) DESC
		LIMIT $3`, matchExpr)

	rows, err := r.db.Query(ctx, q, query, srcLang, limit)
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

func (r *wordRepo) CreateWord(ctx context.Context, p repository.CreateWordParams) (*entity.Word, error) {
	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	status := p.Status
	if status == "" {
		status = entity.StatusPublished
	}
	targetLang := entity.LangIndonesian
	if p.SourceLang == entity.LangIndonesian {
		targetLang = entity.LangManggarai
	}

	head := &entity.Word{
		ID:            uuid.New(),
		Language:      p.SourceLang,
		Lemma:         p.Headword,
		Slug:          p.HeadwordSlug,
		HomonymNumber: p.HomonymNumber,
		PartOfSpeech:  p.PartOfSpeech,
		Status:        status,
		CreatedBy:     p.CreatedBy,
	}
	row := tx.QueryRow(ctx, `
		INSERT INTO words (id, language, lemma, slug, homonym_number, part_of_speech, status, created_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING created_at, updated_at`,
		head.ID, head.Language, head.Lemma, head.Slug, head.HomonymNumber, head.PartOfSpeech, head.Status, head.CreatedBy)
	if err := row.Scan(&head.CreatedAt, &head.UpdatedAt); err != nil {
		return nil, err
	}

	for _, t := range p.Translations {
		if strings.TrimSpace(t.Lemma) == "" {
			continue
		}
		// Reuse an existing counterpart word if one with the same lemma exists.
		counterpartID, err := r.upsertWordTx(ctx, tx, targetLang, t, status, p.CreatedBy)
		if err != nil {
			return nil, err
		}

		idWordID, mgrWordID := head.ID, counterpartID
		if p.SourceLang == entity.LangManggarai {
			idWordID, mgrWordID = counterpartID, head.ID
		}

		_, err = tx.Exec(ctx, `
			INSERT INTO translations (id_word_id, mgr_word_id, notes, source, created_by)
			VALUES ($1, $2, $3, $4, $5)
			ON CONFLICT (id_word_id, mgr_word_id) DO NOTHING`,
			idWordID, mgrWordID, t.Notes, p.Source, p.CreatedBy)
		if err != nil {
			return nil, fmt.Errorf("insert translation: %w", err)
		}
	}

	for i, d := range p.Derived {
		if strings.TrimSpace(d.Word) == "" {
			continue
		}
		_, err := tx.Exec(ctx, `
			INSERT INTO derived_words (word_id, word, translation, sort_order)
			VALUES ($1, $2, $3, $4)`,
			head.ID, d.Word, d.Translation, i)
		if err != nil {
			return nil, fmt.Errorf("insert derived_word: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return head, nil
}

// upsertWordTx returns the id of an existing word with the same lemma/language,
// or creates a new one (generating a unique slug) within the transaction.
func (r *wordRepo) upsertWordTx(ctx context.Context, tx pgx.Tx, language string, t repository.CreateTranslationParams, status string, createdBy *uuid.UUID) (uuid.UUID, error) {
	var existingID uuid.UUID
	err := tx.QueryRow(ctx, `SELECT id FROM words WHERE language = $1 AND LOWER(lemma) = LOWER($2) LIMIT 1`, language, t.Lemma).Scan(&existingID)
	if err == nil {
		return existingID, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return uuid.Nil, err
	}

	slug, err := uniqueSlugTx(ctx, tx, t.Slug)
	if err != nil {
		return uuid.Nil, err
	}

	id := uuid.New()
	_, err = tx.Exec(ctx, `
		INSERT INTO words (id, language, lemma, slug, part_of_speech, status, created_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		id, language, t.Lemma, slug, t.PartOfSpeech, status, createdBy)
	if err != nil {
		return uuid.Nil, fmt.Errorf("insert counterpart word: %w", err)
	}
	return id, nil
}

func uniqueSlugTx(ctx context.Context, tx pgx.Tx, base string) (string, error) {
	if base == "" {
		base = "kata"
	}
	candidate := base
	for i := 2; i < 10000; i++ {
		var exists bool
		if err := tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM words WHERE slug = $1)`, candidate).Scan(&exists); err != nil {
			return "", err
		}
		if !exists {
			return candidate, nil
		}
		candidate = fmt.Sprintf("%s-%d", base, i)
	}
	return "", apperror.ErrConflict.WithMessage("tidak dapat membuat slug unik")
}

func (r *wordRepo) Delete(ctx context.Context, id uuid.UUID) error {
	tag, err := r.db.Exec(ctx, `DELETE FROM words WHERE id = $1`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return apperror.ErrNotFound
	}
	return nil
}

func (r *wordRepo) CountPublished(ctx context.Context) (int64, error) {
	var total int64
	err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM words WHERE status = 'published'`).Scan(&total)
	return total, err
}

func scanWord(row rowScanner) (*entity.Word, error) {
	w := &entity.Word{}
	err := row.Scan(
		&w.ID, &w.Language, &w.Lemma, &w.Slug, &w.HomonymNumber,
		&w.PartOfSpeech, &w.Status, &w.CreatedBy, &w.CreatedAt, &w.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, apperror.ErrNotFound
		}
		return nil, err
	}
	return w, nil
}
