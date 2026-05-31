package usecase

import (
	"context"

	"github.com/google/uuid"
	"github.com/kamus-manggarai/backend/internal/domain/entity"
	"github.com/kamus-manggarai/backend/internal/domain/repository"
	"github.com/kamus-manggarai/backend/pkg/apperror"
)

type SubmissionUseCase struct {
	submissionRepo  repository.SubmissionRepository
	userRepo        repository.UserRepository
	entryUseCase    *EntryUseCase
	notificationUC  *NotificationUseCase
}

func NewSubmissionUseCase(
	submissionRepo repository.SubmissionRepository,
	userRepo repository.UserRepository,
	entryUseCase *EntryUseCase,
	notifUC *NotificationUseCase,
) *SubmissionUseCase {
	return &SubmissionUseCase{
		submissionRepo: submissionRepo,
		userRepo:       userRepo,
		entryUseCase:   entryUseCase,
		notificationUC: notifUC,
	}
}

func (u *SubmissionUseCase) Submit(ctx context.Context, payload entity.SubmissionPayload, userID uuid.UUID) (*entity.Submission, error) {
	if payload.BaseForm == "" {
		return nil, apperror.ErrValidation.WithMessage("base_form wajib diisi")
	}
	if len(payload.Dialects) == 0 {
		return nil, apperror.ErrValidation.WithMessage("minimal satu dialek wajib dipilih")
	}
	for i, d := range payload.Dialects {
		if d.IsAvailable && len(d.Definitions) == 0 {
			return nil, apperror.ErrValidation.WithMessage("dialek yang tersedia harus memiliki minimal satu arti")
		}
		for j, def := range d.Definitions {
			if def.Meaning == "" {
				return nil, apperror.ErrValidation.WithMessage("arti tidak boleh kosong")
			}
			_ = i
			_ = j
		}
	}

	user, err := u.userRepo.FindByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if user.IsSuspended {
		return nil, apperror.ErrSuspended
	}

	submission := &entity.Submission{
		SubmittedBy: userID,
		Status:      entity.SubmissionStatusPending,
		Payload:     payload,
	}

	if user.CanAutoPublish() {
		entry, err := u.entryUseCase.CreateEntry(ctx, CreateEntryInput{
			BaseForm:     payload.BaseForm,
			PartOfSpeech: payload.PartOfSpeech,
			Notes:        payload.Notes,
			Dialects:     payload.Dialects,
			Relations:    payload.Relations,
		}, userID)
		if err != nil {
			return nil, err
		}

		submission.Status = entity.SubmissionStatusApproved
		submission.ResultingEntryID = &entry.ID
		now := submission.CreatedAt
		submission.ReviewedBy = &userID
		submission.ReviewedAt = &now
		if err := u.submissionRepo.Create(ctx, submission); err != nil {
			return nil, err
		}
		_ = u.submissionRepo.UpdateStatus(ctx, submission.ID, entity.SubmissionStatusApproved, userID, nil, false, &entry.ID)
		return submission, nil
	}

	if err := u.submissionRepo.Create(ctx, submission); err != nil {
		return nil, err
	}
	return submission, nil
}

func (u *SubmissionUseCase) GetMySubmissions(ctx context.Context, userID uuid.UUID, page, limit int) ([]*entity.Submission, int64, error) {
	return u.submissionRepo.FindByUserID(ctx, userID, page, limit)
}

func (u *SubmissionUseCase) GetSubmissionDetail(ctx context.Context, id uuid.UUID, requesterID uuid.UUID) (*entity.Submission, error) {
	s, err := u.submissionRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	requester, err := u.userRepo.FindByID(ctx, requesterID)
	if err != nil {
		return nil, err
	}
	if s.SubmittedBy != requesterID && !requester.CanReview() {
		return nil, apperror.ErrForbidden
	}
	return s, nil
}

func (u *SubmissionUseCase) EditSubmission(ctx context.Context, id uuid.UUID, payload entity.SubmissionPayload, userID uuid.UUID) (*entity.Submission, error) {
	s, err := u.submissionRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if s.SubmittedBy != userID {
		return nil, apperror.ErrForbidden
	}
	if s.Status != entity.SubmissionStatusPending {
		return nil, apperror.ErrConflict.WithMessage("hanya submission pending yang dapat diedit")
	}
	if err := u.submissionRepo.UpdatePayload(ctx, id, payload); err != nil {
		return nil, err
	}
	return u.submissionRepo.FindByID(ctx, id)
}
