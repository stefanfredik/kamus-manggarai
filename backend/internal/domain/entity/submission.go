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

// SubmissionTranslationInput is one counterpart lemma proposed for the
// headword, with its own part of speech and notes.
type SubmissionTranslationInput struct {
	Lemma        string  `json:"lemma"`
	PartOfSpeech *string `json:"part_of_speech,omitempty"`
	Notes        *string `json:"notes,omitempty"`
}

// SubmissionPayload is what a contributor submits: a headword in a chosen
// language with one or more counterpart translations in the other language.
type SubmissionPayload struct {
	// SourceLang is the language of the headword ("id" or "mgr").
	SourceLang   string                       `json:"source_lang"`
	Headword     string                       `json:"headword"`
	PartOfSpeech *string                      `json:"part_of_speech,omitempty"`
	Source       *string                      `json:"source,omitempty"`
	Translations []SubmissionTranslationInput `json:"translations"`
	Derived      []SubmissionDerivedInput     `json:"derived,omitempty"`
}

// TargetLang returns the language of the counterpart translations.
func (p SubmissionPayload) TargetLang() string {
	if p.SourceLang == LangIndonesian {
		return LangManggarai
	}
	return LangIndonesian
}

// PrimaryTranslation returns the first counterpart lemma, used for
// notifications and display fallbacks.
func (p SubmissionPayload) PrimaryTranslation() string {
	if len(p.Translations) > 0 {
		return p.Translations[0].Lemma
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
