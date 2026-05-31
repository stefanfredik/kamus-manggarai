package entity

import (
	"time"

	"github.com/google/uuid"
)

const (
	StatusPublished = "published"
	StatusArchived  = "archived"

	LangIndonesian = "id"
	LangManggarai  = "mgr"
)

// Word is a single lemma in one language. Indonesian and Manggarai words are
// stored symmetrically; their relationship lives in Translation.
type Word struct {
	ID            uuid.UUID  `json:"id"`
	Language      string     `json:"language"`
	Lemma         string     `json:"lemma"`
	Slug          string     `json:"slug"`
	HomonymNumber *int       `json:"homonym_number,omitempty"`
	PartOfSpeech  *string    `json:"part_of_speech,omitempty"`
	Status        string     `json:"status"`
	CreatedBy     *uuid.UUID `json:"created_by,omitempty"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

// TranslationLink is a counterpart word plus the metadata of the relationship.
type TranslationLink struct {
	TranslationID uuid.UUID `json:"translation_id"`
	WordID        uuid.UUID `json:"word_id"`
	Lemma         string    `json:"lemma"`
	Slug          string    `json:"slug"`
	PartOfSpeech  *string   `json:"part_of_speech,omitempty"`
	Notes         *string   `json:"notes,omitempty"`
	Source        *string   `json:"source,omitempty"`
}

// DerivedWord is a "kata turunan" attached to a word.
type DerivedWord struct {
	ID          uuid.UUID `json:"id"`
	WordID      uuid.UUID `json:"word_id"`
	Word        string    `json:"word"`
	Translation string    `json:"translation"`
	SortOrder   int       `json:"sort_order"`
	CreatedAt   time.Time `json:"created_at"`
}

// WordDetail is a word with all its translations and derived words.
type WordDetail struct {
	Word
	Translations  []TranslationLink `json:"translations"`
	DerivedWords  []DerivedWord     `json:"derived_words"`
	CreatedByName string            `json:"created_by_name,omitempty"`
}

// WordSummary is a compact representation for lists and search results.
type WordSummary struct {
	ID            uuid.UUID `json:"id"`
	Language      string    `json:"language"`
	Lemma         string    `json:"lemma"`
	Slug          string    `json:"slug"`
	HomonymNumber *int      `json:"homonym_number,omitempty"`
	PartOfSpeech  *string   `json:"part_of_speech,omitempty"`
	// Translations are the counterpart lemmas in the other language.
	Translations []string `json:"translations,omitempty"`
}
