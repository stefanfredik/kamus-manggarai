package entity

import (
	"time"

	"github.com/google/uuid"
)

// Goet is a Manggarai proverb or figurative saying paired with its meaning.
type Goet struct {
	ID            uuid.UUID  `json:"id"`
	Manggarai     string     `json:"manggarai"`
	Meaning       string     `json:"meaning"`
	CreatedBy     *uuid.UUID `json:"created_by,omitempty"`
	CreatedByName string     `json:"created_by_name,omitempty"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}
