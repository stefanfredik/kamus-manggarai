package pagination

import (
	"strconv"

	"github.com/gofiber/fiber/v3"
)

const (
	DefaultPage  = 1
	DefaultLimit = 20
	MaxLimit     = 50
)

type Pagination struct {
	Page  int
	Limit int
}

func New(page, limit int) Pagination {
	if page < 1 {
		page = DefaultPage
	}
	if limit < 1 {
		limit = DefaultLimit
	}
	if limit > MaxLimit {
		limit = MaxLimit
	}
	return Pagination{Page: page, Limit: limit}
}

func FromQuery(c fiber.Ctx) Pagination {
	page, _ := strconv.Atoi(c.Query("page", strconv.Itoa(DefaultPage)))
	limit, _ := strconv.Atoi(c.Query("limit", strconv.Itoa(DefaultLimit)))
	return New(page, limit)
}

func (p Pagination) Offset() int {
	return (p.Page - 1) * p.Limit
}
