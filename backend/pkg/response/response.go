package response

import (
	"github.com/gofiber/fiber/v3"
	"github.com/kamus-manggarai/backend/pkg/apperror"
)

type SuccessResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Meta    *Meta       `json:"meta,omitempty"`
}

type ErrorResponse struct {
	Success bool      `json:"success"`
	Error   ErrorBody `json:"error"`
}

type ErrorBody struct {
	Code    string      `json:"code"`
	Message string      `json:"message"`
	Details interface{} `json:"details,omitempty"`
}

type Meta struct {
	Page  int   `json:"page"`
	Limit int   `json:"limit"`
	Total int64 `json:"total"`
}

func Success(c fiber.Ctx, data interface{}) error {
	return c.Status(fiber.StatusOK).JSON(SuccessResponse{
		Success: true,
		Data:    data,
	})
}

func Created(c fiber.Ctx, data interface{}) error {
	return c.Status(fiber.StatusCreated).JSON(SuccessResponse{
		Success: true,
		Data:    data,
	})
}

func NoContent(c fiber.Ctx) error {
	return c.SendStatus(fiber.StatusNoContent)
}

func Paginated(c fiber.Ctx, data interface{}, page, limit int, total int64) error {
	return c.Status(fiber.StatusOK).JSON(SuccessResponse{
		Success: true,
		Data:    data,
		Meta: &Meta{
			Page:  page,
			Limit: limit,
			Total: total,
		},
	})
}

func Error(c fiber.Ctx, err error) error {
	ae := apperror.From(err)
	return c.Status(ae.StatusCode).JSON(ErrorResponse{
		Success: false,
		Error: ErrorBody{
			Code:    ae.Code,
			Message: ae.Message,
		},
	})
}

func ErrorWithDetails(c fiber.Ctx, err error, details interface{}) error {
	ae := apperror.From(err)
	return c.Status(ae.StatusCode).JSON(ErrorResponse{
		Success: false,
		Error: ErrorBody{
			Code:    ae.Code,
			Message: ae.Message,
			Details: details,
		},
	})
}
