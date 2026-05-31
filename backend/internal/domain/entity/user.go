package entity

import (
	"time"

	"github.com/google/uuid"
)

const (
	RoleAdmin       = "admin"
	RoleValidator   = "validator"
	RoleContributor = "contributor"
)

type User struct {
	ID           uuid.UUID `json:"id"`
	GoogleID     *string   `json:"-"`
	Email        string    `json:"email"`
	Name         string    `json:"name"`
	AvatarURL    *string   `json:"avatar_url,omitempty"`
	PasswordHash *string   `json:"-"`
	Role         string    `json:"role"`
	IsSuspended  bool      `json:"is_suspended"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

func (u *User) IsAdmin() bool       { return u.Role == RoleAdmin }
func (u *User) IsValidator() bool   { return u.Role == RoleValidator }
func (u *User) IsContributor() bool { return u.Role == RoleContributor }

func (u *User) CanReview() bool {
	return u.IsAdmin() || u.IsValidator()
}

func (u *User) CanAutoPublish() bool {
	return u.IsAdmin() || u.IsValidator()
}
