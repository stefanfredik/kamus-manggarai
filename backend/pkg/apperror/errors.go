package apperror

import (
	"errors"
	"fmt"
	"net/http"
)

type AppError struct {
	Code       string `json:"code"`
	Message    string `json:"message"`
	StatusCode int    `json:"-"`
	Cause      error  `json:"-"`
}

func (e *AppError) Error() string {
	if e.Cause != nil {
		return fmt.Sprintf("%s: %s (%v)", e.Code, e.Message, e.Cause)
	}
	return fmt.Sprintf("%s: %s", e.Code, e.Message)
}

func (e *AppError) Unwrap() error {
	return e.Cause
}

func (e *AppError) WithMessage(msg string) *AppError {
	clone := *e
	clone.Message = msg
	return &clone
}

func (e *AppError) WithCause(err error) *AppError {
	clone := *e
	clone.Cause = err
	return &clone
}

var (
	ErrNotFound     = &AppError{Code: "NOT_FOUND", Message: "Resource tidak ditemukan", StatusCode: http.StatusNotFound}
	ErrUnauthorized = &AppError{Code: "UNAUTHORIZED", Message: "Authentication required", StatusCode: http.StatusUnauthorized}
	ErrForbidden    = &AppError{Code: "FORBIDDEN", Message: "Akses ditolak", StatusCode: http.StatusForbidden}
	ErrBadRequest   = &AppError{Code: "BAD_REQUEST", Message: "Request tidak valid", StatusCode: http.StatusBadRequest}
	ErrConflict     = &AppError{Code: "CONFLICT", Message: "Resource sudah ada", StatusCode: http.StatusConflict}
	ErrInternal     = &AppError{Code: "INTERNAL_ERROR", Message: "Terjadi kesalahan internal", StatusCode: http.StatusInternalServerError}
	ErrTooManyReq   = &AppError{Code: "TOO_MANY_REQUESTS", Message: "Terlalu banyak request", StatusCode: http.StatusTooManyRequests}
	ErrValidation   = &AppError{Code: "VALIDATION_ERROR", Message: "Validasi gagal", StatusCode: http.StatusUnprocessableEntity}
	ErrSuspended    = &AppError{Code: "USER_SUSPENDED", Message: "Akun user dibekukan", StatusCode: http.StatusForbidden}
)

func As(err error) (*AppError, bool) {
	var ae *AppError
	if errors.As(err, &ae) {
		return ae, true
	}
	return nil, false
}

func From(err error) *AppError {
	if err == nil {
		return nil
	}
	if ae, ok := As(err); ok {
		return ae
	}
	return ErrInternal.WithCause(err)
}
