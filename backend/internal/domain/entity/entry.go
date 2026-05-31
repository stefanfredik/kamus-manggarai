package entity

import (
	"time"

	"github.com/google/uuid"
)

const (
	StatusPublished = "published"
	StatusArchived  = "archived"
)

// Entry is a bidirectional Indonesian <-> Manggarai dictionary pair.
type Entry struct {
	ID            uuid.UUID `json:"id"`
	Indonesian    string    `json:"indonesian"`
	Manggarai     string    `json:"manggarai"`
	Slug          string    `json:"slug"`
	HomonymNumber *int      `json:"homonym_number,omitempty"`
	PartOfSpeech  *string   `json:"part_of_speech,omitempty"`
	Notes         *string   `json:"notes,omitempty"`
	Source        *string   `json:"source,omitempty"`
	Status        string    `json:"status"`
	CreatedBy     *uuid.UUID `json:"created_by,omitempty"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// DerivedWord is a "kata turunan" attached to an entry.
type DerivedWord struct {
	ID          uuid.UUID `json:"id"`
	EntryID     uuid.UUID `json:"entry_id"`
	Word        string    `json:"word"`
	Translation string    `json:"translation"`
	SortOrder   int       `json:"sort_order"`
	CreatedAt   time.Time `json:"created_at"`
}

type EntryDetail struct {
	Entry
	DerivedWords  []DerivedWord  `json:"derived_words"`
	RelatedByWord []EntrySummary `json:"related_by_word,omitempty"`
	CreatedByName string         `json:"created_by_name,omitempty"`
}

type EntrySummary struct {
	ID            uuid.UUID `json:"id"`
	Indonesian    string    `json:"indonesian"`
	Manggarai     string    `json:"manggarai"`
	Slug          string    `json:"slug"`
	HomonymNumber *int      `json:"homonym_number,omitempty"`
	PartOfSpeech  *string   `json:"part_of_speech,omitempty"`
}

type PaginatedEntries struct {
	Items []EntrySummary `json:"items"`
	Total int64          `json:"total"`
	Page  int            `json:"page"`
	Limit int            `json:"limit"`
}
