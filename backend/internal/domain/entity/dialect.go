package entity

import (
	"time"

	"github.com/google/uuid"
)

type Dialect struct {
	ID          uuid.UUID `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type DialectInput struct {
	Name        string `json:"name" validate:"required,min=2"`
	Description string `json:"description"`
}
