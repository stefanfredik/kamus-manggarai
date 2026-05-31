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

type reportRepo struct {
	db *pgxpool.Pool
}

func NewReportRepo(db *pgxpool.Pool) repository.ReportRepository {
	return &reportRepo{db: db}
}

func (r *reportRepo) Create(ctx context.Context, rep *entity.Report) error {
	if rep.ID == uuid.Nil {
		rep.ID = uuid.New()
	}
	if rep.Status == "" {
		rep.Status = entity.ReportStatusOpen
	}
	row := r.db.QueryRow(ctx, `
		INSERT INTO reports (id, entry_id, reported_by, reason, description, status)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING created_at`,
		rep.ID, rep.EntryID, rep.ReportedBy, rep.Reason, rep.Description, rep.Status)
	return row.Scan(&rep.CreatedAt)
}

func (r *reportRepo) ListOpen(ctx context.Context, page, limit int) ([]*entity.Report, int64, error) {
	offset := (page - 1) * limit
	rows, err := r.db.Query(ctx, `
		SELECT r.id, r.entry_id, COALESCE(w.lemma, ''), r.reported_by, r.reason, r.description, r.status, r.resolved_by, r.resolved_at, r.created_at
		FROM reports r
		LEFT JOIN words w ON w.id = r.entry_id
		WHERE r.status = 'open'
		ORDER BY r.created_at DESC
		LIMIT $1 OFFSET $2`, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	res := make([]*entity.Report, 0)
	for rows.Next() {
		rep := &entity.Report{}
		if err := rows.Scan(&rep.ID, &rep.EntryID, &rep.EntryName, &rep.ReportedBy, &rep.Reason, &rep.Description, &rep.Status, &rep.ResolvedBy, &rep.ResolvedAt, &rep.CreatedAt); err != nil {
			return nil, 0, err
		}
		res = append(res, rep)
	}
	var total int64
	if err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM reports WHERE status = 'open'`).Scan(&total); err != nil {
		return nil, 0, err
	}
	return res, total, nil
}

func (r *reportRepo) UpdateStatus(ctx context.Context, id uuid.UUID, status string, resolverID uuid.UUID) error {
	tag, err := r.db.Exec(ctx, `
		UPDATE reports SET status = $1, resolved_by = $2, resolved_at = NOW()
		WHERE id = $3`, status, resolverID, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return apperror.ErrNotFound
	}
	return nil
}

type notificationRepo struct {
	db *pgxpool.Pool
}

func NewNotificationRepo(db *pgxpool.Pool) repository.NotificationRepository {
	return &notificationRepo{db: db}
}

func (n *notificationRepo) Create(ctx context.Context, notif *entity.Notification) error {
	if notif.ID == uuid.Nil {
		notif.ID = uuid.New()
	}
	b, err := json.Marshal(notif.Payload)
	if err != nil {
		return err
	}
	row := n.db.QueryRow(ctx, `
		INSERT INTO notifications (id, user_id, type, payload, is_read)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING created_at`,
		notif.ID, notif.UserID, notif.Type, b, notif.IsRead)
	return row.Scan(&notif.CreatedAt)
}

func (n *notificationRepo) ListByUserID(ctx context.Context, userID uuid.UUID, page, limit int) ([]*entity.Notification, int64, error) {
	offset := (page - 1) * limit
	rows, err := n.db.Query(ctx, `
		SELECT id, user_id, type, payload, is_read, created_at
		FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
		userID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	res := make([]*entity.Notification, 0)
	for rows.Next() {
		notif := &entity.Notification{}
		var b []byte
		if err := rows.Scan(&notif.ID, &notif.UserID, &notif.Type, &b, &notif.IsRead, &notif.CreatedAt); err != nil {
			return nil, 0, err
		}
		if len(b) > 0 {
			_ = json.Unmarshal(b, &notif.Payload)
		}
		res = append(res, notif)
	}
	var total int64
	if err := n.db.QueryRow(ctx, `SELECT COUNT(*) FROM notifications WHERE user_id = $1`, userID).Scan(&total); err != nil {
		return nil, 0, err
	}
	return res, total, nil
}

func (n *notificationRepo) UnreadCount(ctx context.Context, userID uuid.UUID) (int64, error) {
	var c int64
	err := n.db.QueryRow(ctx, `SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE`, userID).Scan(&c)
	return c, err
}

func (n *notificationRepo) MarkAsRead(ctx context.Context, id uuid.UUID, userID uuid.UUID) error {
	tag, err := n.db.Exec(ctx, `UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2`, id, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return apperror.ErrNotFound
	}
	return nil
}

func (n *notificationRepo) MarkAllAsRead(ctx context.Context, userID uuid.UUID) error {
	_, err := n.db.Exec(ctx, `UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE`, userID)
	return err
}

type tokenRepo struct {
	db *pgxpool.Pool
}

func NewTokenRepo(db *pgxpool.Pool) repository.TokenRepository {
	return &tokenRepo{db: db}
}

func (t *tokenRepo) Create(ctx context.Context, tk *entity.RefreshToken) error {
	if tk.ID == uuid.Nil {
		tk.ID = uuid.New()
	}
	row := t.db.QueryRow(ctx, `
		INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, revoked)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING created_at`,
		tk.ID, tk.UserID, tk.TokenHash, tk.ExpiresAt, tk.Revoked)
	return row.Scan(&tk.CreatedAt)
}

func (t *tokenRepo) FindByHash(ctx context.Context, hash string) (*entity.RefreshToken, error) {
	tk := &entity.RefreshToken{}
	row := t.db.QueryRow(ctx, `
		SELECT id, user_id, token_hash, expires_at, revoked, created_at
		FROM refresh_tokens WHERE token_hash = $1`, hash)
	err := row.Scan(&tk.ID, &tk.UserID, &tk.TokenHash, &tk.ExpiresAt, &tk.Revoked, &tk.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, apperror.ErrNotFound
		}
		return nil, err
	}
	return tk, nil
}

func (t *tokenRepo) Revoke(ctx context.Context, hash string) error {
	_, err := t.db.Exec(ctx, `UPDATE refresh_tokens SET revoked = TRUE WHERE token_hash = $1`, hash)
	return err
}

func (t *tokenRepo) DeleteExpired(ctx context.Context) error {
	_, err := t.db.Exec(ctx, `DELETE FROM refresh_tokens WHERE expires_at < NOW() OR revoked = TRUE`)
	return err
}
