package usecase

import (
	"context"

	"github.com/google/uuid"
	"github.com/kamus-manggarai/backend/internal/domain/entity"
	"github.com/kamus-manggarai/backend/internal/domain/repository"
	"github.com/kamus-manggarai/backend/pkg/apperror"
)

type ReviewUseCase struct {
	submissionRepo repository.SubmissionRepository
	userRepo       repository.UserRepository
	wordUseCase    *WordUseCase
	notifUC        *NotificationUseCase
}

func NewReviewUseCase(
	submissionRepo repository.SubmissionRepository,
	userRepo repository.UserRepository,
	wordUC *WordUseCase,
	notifUC *NotificationUseCase,
) *ReviewUseCase {
	return &ReviewUseCase{
		submissionRepo: submissionRepo,
		userRepo:       userRepo,
		wordUseCase:    wordUC,
		notifUC:        notifUC,
	}
}

func (u *ReviewUseCase) GetReviewQueue(ctx context.Context, page, limit int) ([]*entity.Submission, int64, error) {
	return u.submissionRepo.ListPending(ctx, page, limit)
}

func (u *ReviewUseCase) ApproveSubmission(ctx context.Context, submissionID uuid.UUID, reviewerID uuid.UUID) (*entity.Submission, error) {
	reviewer, err := u.userRepo.FindByID(ctx, reviewerID)
	if err != nil {
		return nil, err
	}
	if !reviewer.CanReview() {
		return nil, apperror.ErrForbidden
	}

	submission, err := u.submissionRepo.FindByID(ctx, submissionID)
	if err != nil {
		return nil, err
	}
	if submission.Status != entity.SubmissionStatusPending {
		return nil, apperror.ErrConflict.WithMessage("submission sudah diproses")
	}
	if submission.SubmittedBy == reviewerID {
		return nil, apperror.ErrForbidden.WithMessage("tidak dapat mereview submission sendiri")
	}

	word, err := u.wordUseCase.CreateWord(ctx, payloadToCreateWordInput(submission.Payload), &submission.SubmittedBy)
	if err != nil {
		return nil, err
	}

	if err := u.submissionRepo.UpdateStatus(ctx, submissionID, entity.SubmissionStatusApproved, reviewerID, nil, false, &word.ID); err != nil {
		return nil, err
	}

	_ = u.notifUC.NotifySubmissionApproved(ctx, submission.SubmittedBy, submissionID, submission.Payload.Headword, word.Slug)

	return u.submissionRepo.FindByID(ctx, submissionID)
}

func (u *ReviewUseCase) RejectSubmission(ctx context.Context, submissionID uuid.UUID, reviewerID uuid.UUID, notes string) (*entity.Submission, error) {
	if notes == "" {
		return nil, apperror.ErrValidation.WithMessage("catatan penolakan wajib diisi")
	}
	reviewer, err := u.userRepo.FindByID(ctx, reviewerID)
	if err != nil {
		return nil, err
	}
	if !reviewer.CanReview() {
		return nil, apperror.ErrForbidden
	}

	submission, err := u.submissionRepo.FindByID(ctx, submissionID)
	if err != nil {
		return nil, err
	}
	if submission.Status != entity.SubmissionStatusPending {
		return nil, apperror.ErrConflict.WithMessage("submission sudah diproses")
	}

	if err := u.submissionRepo.UpdateStatus(ctx, submissionID, entity.SubmissionStatusRejected, reviewerID, &notes, false, nil); err != nil {
		return nil, err
	}

	_ = u.notifUC.NotifySubmissionRejected(ctx, submission.SubmittedBy, submissionID, submission.Payload.Headword, notes)

	return u.submissionRepo.FindByID(ctx, submissionID)
}

func (u *ReviewUseCase) ReviseAndPublish(ctx context.Context, submissionID uuid.UUID, reviewerID uuid.UUID, payload entity.SubmissionPayload, notes *string) (*entity.Submission, error) {
	reviewer, err := u.userRepo.FindByID(ctx, reviewerID)
	if err != nil {
		return nil, err
	}
	if !reviewer.CanReview() {
		return nil, apperror.ErrForbidden
	}

	submission, err := u.submissionRepo.FindByID(ctx, submissionID)
	if err != nil {
		return nil, err
	}
	if submission.Status != entity.SubmissionStatusPending {
		return nil, apperror.ErrConflict.WithMessage("submission sudah diproses")
	}
	if submission.SubmittedBy == reviewerID {
		return nil, apperror.ErrForbidden.WithMessage("tidak dapat mereview submission sendiri")
	}

	if err := u.submissionRepo.UpdatePayload(ctx, submissionID, payload); err != nil {
		return nil, err
	}

	word, err := u.wordUseCase.CreateWord(ctx, payloadToCreateWordInput(payload), &submission.SubmittedBy)
	if err != nil {
		return nil, err
	}

	if err := u.submissionRepo.UpdateStatus(ctx, submissionID, entity.SubmissionStatusApproved, reviewerID, notes, true, &word.ID); err != nil {
		return nil, err
	}

	_ = u.notifUC.NotifySubmissionEditedPublished(ctx, submission.SubmittedBy, submissionID, payload.Headword, word.Slug)

	return u.submissionRepo.FindByID(ctx, submissionID)
}
