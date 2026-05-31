package entity

import (
	"time"

	"github.com/google/uuid"
)

const (
	StatusPublished = "published"
	StatusArchived  = "archived"
)

// Entry is a Manggarai headword. Its Indonesian translations live in Senses,
// so a single headword can carry multiple meanings (polysemy).
type Entry struct {
	ID            uuid.UUID  `json:"id"`
	Manggarai     string     `json:"manggarai"`
	Slug          string     `json:"slug"`
	HomonymNumber *int       `json:"homonym_number,omitempty"`
	Source        *string    `json:"source,omitempty"`
	Status        string     `json:"status"`
	CreatedBy     *uuid.UUID `json:"created_by,omitempty"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

// Sense is one meaning of an entry: an Indonesian translation with its own
// part of speech and usage notes.
type Sense struct {
	ID           uuid.UUID `json:"id"`
	EntryID      uuid.UUID `json:"entry_id"`
	Indonesian   string    `json:"indonesian"`
	PartOfSpeech *string   `json:"part_of_speech,omitempty"`
	Notes        *string   `json:"notes,omitempty"`
	SortOrder    int       `json:"sort_order"`
	CreatedAt    time.Time `json:"created_at"`
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
	Senses        []Sense        `json:"senses"`
	DerivedWords  []DerivedWord  `json:"derived_words"`
	RelatedByWord []EntrySummary `json:"related_by_word,omitempty"`
	CreatedByName string         `json:"created_by_name,omitempty"`
}

// EntrySummary is a compact representation for lists and search results. It
// carries the headword plus a flattened view of its translations.
type EntrySummary struct {
	ID            uuid.UUID `json:"id"`
	Manggarai     string    `json:"manggarai"`
	Slug          string    `json:"slug"`
	HomonymNumber *int      `json:"homonym_number,omitempty"`
	// Indonesian is the primary (first) translation, kept for convenience.
	Indonesian string `json:"indonesian"`
	// Translations lists all Indonesian meanings of this headword.
	Translations []string `json:"translations,omitempty"`
	PartOfSpeech *string  `json:"part_of_speech,omitempty"`
}

type PaginatedEntries struct {
	Items []EntrySummary `json:"items"`
	Total int64          `json:"total"`
	Page  int            `json:"page"`
	Limit int            `json:"limit"`
}
