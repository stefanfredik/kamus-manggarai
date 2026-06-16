package entity

import (
	"time"

	"github.com/google/uuid"
)

const (
	ReportStatusOpen      = "open"
	ReportStatusResolved  = "resolved"
	ReportStatusDismissed = "dismissed"

	ReasonEjaanSalah        = "ejaan_salah"
	ReasonArtiTidakTepat    = "arti_tidak_tepat"
	ReasonContohSalah       = "contoh_salah"
	ReasonKontenTidakPantas = "konten_tidak_pantas"
	ReasonLainnya           = "lainnya"
)

type Report struct {
	ID            uuid.UUID  `json:"id"`
	EntryID       uuid.UUID  `json:"entry_id"`
	EntryName     string     `json:"entry_name,omitempty"`
	EntrySlug     string     `json:"entry_slug,omitempty"`
	EntryLanguage string     `json:"entry_language,omitempty"`
	ReportedBy    *uuid.UUID `json:"reported_by,omitempty"`
	Reason        string     `json:"reason"`
	Description   *string    `json:"description,omitempty"`
	Status        string     `json:"status"`
	ResolvedBy    *uuid.UUID `json:"resolved_by,omitempty"`
	ResolvedAt    *time.Time `json:"resolved_at,omitempty"`
	CreatedAt     time.Time  `json:"created_at"`
}

type Notification struct {
	ID        uuid.UUID              `json:"id"`
	UserID    uuid.UUID              `json:"user_id"`
	Type      string                 `json:"type"`
	Payload   map[string]interface{} `json:"payload"`
	IsRead    bool                   `json:"is_read"`
	CreatedAt time.Time              `json:"created_at"`
}

const (
	NotifSubmissionApproved        = "submission_approved"
	NotifSubmissionRejected        = "submission_rejected"
	NotifSubmissionEditedPublished = "submission_edited_then_published"
)

type RefreshToken struct {
	ID        uuid.UUID `json:"id"`
	UserID    uuid.UUID `json:"user_id"`
	TokenHash string    `json:"-"`
	ExpiresAt time.Time `json:"expires_at"`
	Revoked   bool      `json:"revoked"`
	CreatedAt time.Time `json:"created_at"`
}
