package entity

import (
	"time"

	"github.com/google/uuid"
)

const (
	SubmissionStatusPending  = "pending"
	SubmissionStatusApproved = "approved"
	SubmissionStatusRejected = "rejected"
)

type SubmissionDerivedInput struct {
	Word        string `json:"word"`
	Translation string `json:"translation"`
}

// SubmissionSenseInput is one proposed meaning: an Indonesian translation with
// its own part of speech and notes.
type SubmissionSenseInput struct {
	Indonesian   string  `json:"indonesian"`
	PartOfSpeech *string `json:"part_of_speech,omitempty"`
	Notes        *string `json:"notes,omitempty"`
}

// SubmissionPayload is what a contributor submits: one Manggarai headword with
// one or more senses (Indonesian translations) and optional derived words.
type SubmissionPayload struct {
	Manggarai string                   `json:"manggarai"`
	Senses    []SubmissionSenseInput   `json:"senses"`
	Source    *string                  `json:"source,omitempty"`
	Derived   []SubmissionDerivedInput `json:"derived,omitempty"`
}

// PrimaryIndonesian returns the first sense's Indonesian translation, used for
// notifications and display fallbacks.
func (p SubmissionPayload) PrimaryIndonesian() string {
	if len(p.Senses) > 0 {
		return p.Senses[0].Indonesian
	}
	return ""
}

type Submission struct {
	ID               uuid.UUID         `json:"id"`
	SubmittedBy      uuid.UUID         `json:"submitted_by"`
	SubmitterName    string            `json:"submitter_name,omitempty"`
	Status           string            `json:"status"`
	Payload          SubmissionPayload `json:"payload"`
	ReviewedBy       *uuid.UUID        `json:"reviewed_by,omitempty"`
	ReviewerName     string            `json:"reviewer_name,omitempty"`
	ReviewedAt       *time.Time        `json:"reviewed_at,omitempty"`
	ReviewNotes      *string           `json:"review_notes,omitempty"`
	WasEdited        bool              `json:"was_edited"`
	ResultingEntryID *uuid.UUID        `json:"resulting_entry_id,omitempty"`
	CreatedAt        time.Time         `json:"created_at"`
	UpdatedAt        time.Time         `json:"updated_at"`
}
