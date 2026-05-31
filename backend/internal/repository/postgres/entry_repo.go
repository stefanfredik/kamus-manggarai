package postgres

import (
	"context"
	"errors"
	"fmt"

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

func (r *entryRepo) FindByID(ctx context.Context, id uuid.UUID) (*entity.Entry, error) {
	row := r.db.QueryRow(ctx, `
		SELECT id, base_form, slug, part_of_speech, notes, status, created_by, created_at, updated_at
		FROM entries WHERE id = $1`, id)
	return scanEntry(row)
}

func (r *entryRepo) FindBySlug(ctx context.Context, slug string) (*entity.Entry, error) {
	row := r.db.QueryRow(ctx, `
		SELECT id, base_form, slug, part_of_speech, notes, status, created_by, created_at, updated_at
		FROM entries WHERE slug = $1`, slug)
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

	var creatorName string
	_ = r.db.QueryRow(ctx, `SELECT name FROM users WHERE id = $1`, entry.CreatedBy).Scan(&creatorName)
	detail.CreatedByName = creatorName

	dialectRows, err := r.db.Query(ctx, `
		SELECT ed.id, ed.entry_id, ed.dialect_id, d.name, d.slug, ed.local_spelling, ed.is_available
		FROM entry_dialects ed
		JOIN dialects d ON d.id = ed.dialect_id
		WHERE ed.entry_id = $1
		ORDER BY d.sort_order ASC, d.name ASC`, entry.ID)
	if err != nil {
		return nil, err
	}
	defer dialectRows.Close()

	dialects := make([]entity.EntryDialect, 0)
	for dialectRows.Next() {
		ed := entity.EntryDialect{}
		if err := dialectRows.Scan(&ed.ID, &ed.EntryID, &ed.DialectID, &ed.DialectName, &ed.DialectSlug, &ed.LocalSpelling, &ed.IsAvailable); err != nil {
			return nil, err
		}
		dialects = append(dialects, ed)
	}

	for i := range dialects {
		defs, err := r.findDefinitionsByEntryDialectID(ctx, dialects[i].ID)
		if err != nil {
			return nil, err
		}
		dialects[i].Definitions = defs
	}
	detail.Dialects = dialects

	relatedRows, err := r.db.Query(ctx, `
		SELECT e.id, e.base_form, e.slug, wr.relation_type
		FROM word_relations wr
		JOIN entries e ON e.id = wr.to_entry_id
		WHERE wr.from_entry_id = $1 AND e.status = 'published'`, entry.ID)
	if err != nil {
		return nil, err
	}
	defer relatedRows.Close()

	related := make([]entity.RelatedEntry, 0)
	for relatedRows.Next() {
		re := entity.RelatedEntry{}
		if err := relatedRows.Scan(&re.ID, &re.BaseForm, &re.Slug, &re.RelationType); err != nil {
			return nil, err
		}
		related = append(related, re)
	}
	detail.RelatedEntries = related

	return detail, nil
}

func (r *entryRepo) findDefinitionsByEntryDialectID(ctx context.Context, entryDialectID uuid.UUID) ([]entity.DefinitionWithSentences, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, entry_dialect_id, meaning, context_notes, sort_order, created_at, updated_at
		FROM definitions WHERE entry_dialect_id = $1 ORDER BY sort_order ASC, created_at ASC`, entryDialectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	defs := make([]entity.DefinitionWithSentences, 0)
	for rows.Next() {
		d := entity.DefinitionWithSentences{}
		if err := rows.Scan(&d.ID, &d.EntryDialectID, &d.Meaning, &d.ContextNotes, &d.SortOrder, &d.CreatedAt, &d.UpdatedAt); err != nil {
			return nil, err
		}
		defs = append(defs, d)
	}

	for i := range defs {
		sentences, err := r.findSentencesByDefinitionID(ctx, defs[i].ID)
		if err != nil {
			return nil, err
		}
		defs[i].Sentences = sentences
	}
	return defs, nil
}

func (r *entryRepo) findSentencesByDefinitionID(ctx context.Context, defID uuid.UUID) ([]entity.ExampleSentence, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, definition_id, sentence_source, sentence_translation, created_at, updated_at
		FROM example_sentences WHERE definition_id = $1 ORDER BY created_at ASC`, defID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	res := make([]entity.ExampleSentence, 0)
	for rows.Next() {
		s := entity.ExampleSentence{}
		if err := rows.Scan(&s.ID, &s.DefinitionID, &s.SentenceSource, &s.SentenceTranslation, &s.CreatedAt, &s.UpdatedAt); err != nil {
			return nil, err
		}
		res = append(res, s)
	}
	return res, nil
}

func (r *entryRepo) FindPublished(ctx context.Context, filter repository.EntryFilter) ([]*entity.EntrySummary, int64, error) {
	args := []interface{}{}
	whereParts := []string{`e.status = 'published'`}
	argIdx := 1

	joinDialect := ""
	if len(filter.DialectIDs) > 0 {
		joinDialect = `JOIN entry_dialects ed ON ed.entry_id = e.id AND ed.is_available = TRUE`
		dialectPlaceholders := make([]string, 0, len(filter.DialectIDs))
		for _, did := range filter.DialectIDs {
			dialectPlaceholders = append(dialectPlaceholders, fmt.Sprintf("$%d", argIdx))
			args = append(args, did)
			argIdx++
		}
		whereParts = append(whereParts, fmt.Sprintf("ed.dialect_id IN (%s)", joinComma(dialectPlaceholders)))
	}

	whereClause := joinAnd(whereParts)

	limitIdx := argIdx
	offsetIdx := argIdx + 1
	args = append(args, filter.Limit, (filter.Page-1)*filter.Limit)

	listQ := fmt.Sprintf(`
		SELECT DISTINCT e.id, e.base_form, e.slug, e.part_of_speech
		FROM entries e
		%s
		WHERE %s
		ORDER BY e.base_form ASC
		LIMIT $%d OFFSET $%d`, joinDialect, whereClause, limitIdx, offsetIdx)

	rows, err := r.db.Query(ctx, listQ, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	items := make([]*entity.EntrySummary, 0)
	for rows.Next() {
		s := &entity.EntrySummary{}
		if err := rows.Scan(&s.ID, &s.BaseForm, &s.Slug, &s.PartOfSpeech); err != nil {
			return nil, 0, err
		}
		items = append(items, s)
	}

	for _, it := range items {
		dialects, brief, err := r.fetchEntryDialectsAndBrief(ctx, it.ID)
		if err != nil {
			return nil, 0, err
		}
		it.Dialects = dialects
		it.BriefMeaning = brief
	}

	countArgs := args[:argIdx-1]
	countQ := fmt.Sprintf(`SELECT COUNT(DISTINCT e.id) FROM entries e %s WHERE %s`, joinDialect, whereClause)
	var total int64
	if err := r.db.QueryRow(ctx, countQ, countArgs...).Scan(&total); err != nil {
		return nil, 0, err
	}

	return items, total, nil
}

func (r *entryRepo) fetchEntryDialectsAndBrief(ctx context.Context, entryID uuid.UUID) ([]string, string, error) {
	rows, err := r.db.Query(ctx, `
		SELECT d.name FROM entry_dialects ed
		JOIN dialects d ON d.id = ed.dialect_id
		WHERE ed.entry_id = $1 AND ed.is_available = TRUE
		ORDER BY d.sort_order ASC`, entryID)
	if err != nil {
		return nil, "", err
	}
	defer rows.Close()
	dialects := make([]string, 0)
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			return nil, "", err
		}
		dialects = append(dialects, name)
	}

	var brief string
	_ = r.db.QueryRow(ctx, `
		SELECT def.meaning
		FROM definitions def
		JOIN entry_dialects ed ON ed.id = def.entry_dialect_id
		WHERE ed.entry_id = $1
		ORDER BY def.sort_order ASC, def.created_at ASC
		LIMIT 1`, entryID).Scan(&brief)

	return dialects, brief, nil
}

func (r *entryRepo) Create(ctx context.Context, p repository.CreateEntryParams) (*entity.Entry, error) {
	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	entry := &entity.Entry{
		ID:           uuid.New(),
		BaseForm:     p.BaseForm,
		Slug:         p.Slug,
		PartOfSpeech: p.PartOfSpeech,
		Notes:        p.Notes,
		Status:       p.Status,
		CreatedBy:    p.CreatedBy,
	}
	if entry.Status == "" {
		entry.Status = entity.StatusPublished
	}

	row := tx.QueryRow(ctx, `
		INSERT INTO entries (id, base_form, slug, part_of_speech, notes, status, created_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING created_at, updated_at`,
		entry.ID, entry.BaseForm, entry.Slug, entry.PartOfSpeech, entry.Notes, entry.Status, entry.CreatedBy)
	if err := row.Scan(&entry.CreatedAt, &entry.UpdatedAt); err != nil {
		return nil, err
	}

	for _, dlInput := range p.Dialects {
		edID := uuid.New()
		_, err := tx.Exec(ctx, `
			INSERT INTO entry_dialects (id, entry_id, dialect_id, local_spelling, is_available)
			VALUES ($1, $2, $3, $4, $5)`,
			edID, entry.ID, dlInput.DialectID, dlInput.LocalSpelling, dlInput.IsAvailable)
		if err != nil {
			return nil, fmt.Errorf("insert entry_dialect: %w", err)
		}

		for sortIdx, defInput := range dlInput.Definitions {
			defID := uuid.New()
			_, err := tx.Exec(ctx, `
				INSERT INTO definitions (id, entry_dialect_id, meaning, context_notes, sort_order)
				VALUES ($1, $2, $3, $4, $5)`,
				defID, edID, defInput.Meaning, defInput.ContextNotes, sortIdx)
			if err != nil {
				return nil, fmt.Errorf("insert definition: %w", err)
			}

			for _, sInput := range defInput.Sentences {
				_, err := tx.Exec(ctx, `
					INSERT INTO example_sentences (definition_id, sentence_source, sentence_translation)
					VALUES ($1, $2, $3)`,
					defID, sInput.SentenceSource, sInput.SentenceTranslation)
				if err != nil {
					return nil, fmt.Errorf("insert example_sentence: %w", err)
				}
			}
		}
	}

	for _, rel := range p.Relations {
		if rel.ToEntryID == entry.ID {
			continue
		}
		_, err := tx.Exec(ctx, `
			INSERT INTO word_relations (from_entry_id, to_entry_id, relation_type, created_by)
			VALUES ($1, $2, $3, $4)
			ON CONFLICT DO NOTHING`,
			entry.ID, rel.ToEntryID, rel.RelationType, p.CreatedBy)
		if err != nil {
			return nil, fmt.Errorf("insert word_relation: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return entry, nil
}

func (r *entryRepo) Update(ctx context.Context, e *entity.Entry) error {
	tag, err := r.db.Exec(ctx, `
		UPDATE entries SET base_form = $1, part_of_speech = $2, notes = $3, status = $4, updated_at = NOW()
		WHERE id = $5`,
		e.BaseForm, e.PartOfSpeech, e.Notes, e.Status, e.ID)
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

func scanEntry(row rowScanner) (*entity.Entry, error) {
	e := &entity.Entry{}
	err := row.Scan(&e.ID, &e.BaseForm, &e.Slug, &e.PartOfSpeech, &e.Notes, &e.Status, &e.CreatedBy, &e.CreatedAt, &e.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, apperror.ErrNotFound
		}
		return nil, err
	}
	return e, nil
}

func joinComma(parts []string) string {
	out := ""
	for i, p := range parts {
		if i > 0 {
			out += ", "
		}
		out += p
	}
	return out
}

func joinAnd(parts []string) string {
	out := ""
	for i, p := range parts {
		if i > 0 {
			out += " AND "
		}
		out += p
	}
	return out
}
