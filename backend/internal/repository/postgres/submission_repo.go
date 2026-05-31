package postgres

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/kamus-manggarai/backend/internal/domain/entity"
	"github.com/kamus-manggarai/backend/internal/domain/repository"
	"github.com/kamus-manggarai/backend/pkg/apperror"
)

type submissionRepo struct {
	db *pgxpool.Pool
}

func NewSubmissionRepo(db *pgxpool.Pool) repository.SubmissionRepository {
	return &submissionRepo{db: db}
}

func (r *submissionRepo) Create(ctx context.Context, s *entity.Submission) error {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	if s.Status == "" {
		s.Status = entity.SubmissionStatusPending
	}

	payloadBytes, err := json.Marshal(s.Payload)
	if err != nil {
		return err
	}

	row := r.db.QueryRow(ctx, `
		INSERT INTO submissions (id, submitted_by, status, payload, was_edited)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING created_at, updated_at`,
		s.ID, s.SubmittedBy, s.Status, payloadBytes, s.WasEdited)
	return row.Scan(&s.CreatedAt, &s.UpdatedAt)
}

func (r *submissionRepo) FindByID(ctx context.Context, id uuid.UUID) (*entity.Submission, error) {
	row := r.db.QueryRow(ctx, `
		SELECT s.id, s.submitted_by, COALESCE(u.name, ''), s.status, s.payload, s.reviewed_by,
		       COALESCE(rv.name, ''), s.reviewed_at, s.review_notes, s.was_edited, s.resulting_entry_id,
		       s.created_at, s.updated_at
		FROM submissions s
		LEFT JOIN users u ON u.id = s.submitted_by
		LEFT JOIN users rv ON rv.id = s.reviewed_by
		WHERE s.id = $1`, id)
	return scanSubmission(row)
}

func (r *submissionRepo) FindByUserID(ctx context.Context, userID uuid.UUID, page, limit int) ([]*entity.Submission, int64, error) {
	offset := (page - 1) * limit
	rows, err := r.db.Query(ctx, `
		SELECT s.id, s.submitted_by, COALESCE(u.name, ''), s.status, s.payload, s.reviewed_by,
		       COALESCE(rv.name, ''), s.reviewed_at, s.review_notes, s.was_edited, s.resulting_entry_id,
		       s.created_at, s.updated_at
		FROM submissions s
		LEFT JOIN users u ON u.id = s.submitted_by
		LEFT JOIN users rv ON rv.id = s.reviewed_by
		WHERE s.submitted_by = $1
		ORDER BY s.created_at DESC
		LIMIT $2 OFFSET $3`, userID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	res := make([]*entity.Submission, 0)
	for rows.Next() {
		s, err := scanSubmission(rows)
		if err != nil {
			return nil, 0, err
		}
		res = append(res, s)
	}

	var total int64
	if err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM submissions WHERE submitted_by = $1`, userID).Scan(&total); err != nil {
		return nil, 0, err
	}
	return res, total, nil
}

func (r *submissionRepo) ListPending(ctx context.Context, page, limit int) ([]*entity.Submission, int64, error) {
	offset := (page - 1) * limit
	rows, err := r.db.Query(ctx, `
		SELECT s.id, s.submitted_by, COALESCE(u.name, ''), s.status, s.payload, s.reviewed_by,
		       COALESCE(rv.name, ''), s.reviewed_at, s.review_notes, s.was_edited, s.resulting_entry_id,
		       s.created_at, s.updated_at
		FROM submissions s
		LEFT JOIN users u ON u.id = s.submitted_by
		LEFT JOIN users rv ON rv.id = s.reviewed_by
		WHERE s.status = 'pending'
		ORDER BY s.created_at ASC
		LIMIT $1 OFFSET $2`, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	res := make([]*entity.Submission, 0)
	for rows.Next() {
		s, err := scanSubmission(rows)
		if err != nil {
			return nil, 0, err
		}
		res = append(res, s)
	}

	var total int64
	if err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM submissions WHERE status = 'pending'`).Scan(&total); err != nil {
		return nil, 0, err
	}
	return res, total, nil
}

func (r *submissionRepo) UpdateStatus(ctx context.Context, id uuid.UUID, status string, reviewerID uuid.UUID, notes *string, wasEdited bool, resultingEntryID *uuid.UUID) error {
	tag, err := r.db.Exec(ctx, `
		UPDATE submissions
		SET status = $1, reviewed_by = $2, reviewed_at = NOW(), review_notes = $3, was_edited = $4, resulting_entry_id = $5, updated_at = NOW()
		WHERE id = $6`,
		status, reviewerID, notes, wasEdited, resultingEntryID, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return apperror.ErrNotFound
	}
	return nil
}

func (r *submissionRepo) UpdatePayload(ctx context.Context, id uuid.UUID, payload entity.SubmissionPayload) error {
	b, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	tag, err := r.db.Exec(ctx, `UPDATE submissions SET payload = $1, updated_at = NOW() WHERE id = $2 AND status = 'pending'`, b, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return apperror.ErrNotFound.WithMessage("submission tidak ditemukan atau sudah tidak pending")
	}
	return nil
}

func scanSubmission(row rowScanner) (*entity.Submission, error) {
	s := &entity.Submission{}
	var payloadBytes []byte
	err := row.Scan(
		&s.ID, &s.SubmittedBy, &s.SubmitterName, &s.Status, &payloadBytes, &s.ReviewedBy,
		&s.ReviewerName, &s.ReviewedAt, &s.ReviewNotes, &s.WasEdited, &s.ResultingEntryID,
		&s.CreatedAt, &s.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, apperror.ErrNotFound
		}
		return nil, err
	}
	if len(payloadBytes) > 0 {
		if err := json.Unmarshal(payloadBytes, &s.Payload); err != nil {
			return nil, err
		}
	}
	return s, nil
}
