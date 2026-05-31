package usecase

import (
	"context"
	"strings"

	"github.com/google/uuid"
	"github.com/kamus-manggarai/backend/internal/domain/entity"
	"github.com/kamus-manggarai/backend/internal/domain/repository"
	"github.com/kamus-manggarai/backend/pkg/apperror"
)

type SubmissionUseCase struct {
	submissionRepo repository.SubmissionRepository
	userRepo       repository.UserRepository
	wordUseCase    *WordUseCase
	notificationUC *NotificationUseCase
}

func NewSubmissionUseCase(
	submissionRepo repository.SubmissionRepository,
	userRepo repository.UserRepository,
	wordUseCase *WordUseCase,
	notifUC *NotificationUseCase,
) *SubmissionUseCase {
	return &SubmissionUseCase{
		submissionRepo: submissionRepo,
		userRepo:       userRepo,
		wordUseCase:    wordUseCase,
		notificationUC: notifUC,
	}
}

func (u *SubmissionUseCase) Submit(ctx context.Context, payload entity.SubmissionPayload, userID uuid.UUID) (*entity.Submission, error) {
	if payload.SourceLang == "" {
		payload.SourceLang = entity.LangManggarai
	}
	if payload.SourceLang != entity.LangIndonesian && payload.SourceLang != entity.LangManggarai {
		return nil, apperror.ErrValidation.WithMessage("bahasa sumber tidak valid")
	}
	if strings.TrimSpace(payload.Headword) == "" {
		return nil, apperror.ErrValidation.WithMessage("kata utama wajib diisi")
	}
	hasTranslation := false
	for _, t := range payload.Translations {
		if strings.TrimSpace(t.Lemma) != "" {
			hasTranslation = true
			break
		}
	}
	if !hasTranslation {
		return nil, apperror.ErrValidation.WithMessage("minimal satu terjemahan wajib diisi")
	}
	for _, d := range payload.Derived {
		if strings.TrimSpace(d.Word) != "" && strings.TrimSpace(d.Translation) == "" {
			return nil, apperror.ErrValidation.WithMessage("kata turunan harus memiliki terjemahan")
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
		word, err := u.wordUseCase.CreateWord(ctx, payloadToCreateWordInput(payload), &userID)
		if err != nil {
			return nil, err
		}

		submission.Status = entity.SubmissionStatusApproved
		submission.ResultingEntryID = &word.ID
		if err := u.submissionRepo.Create(ctx, submission); err != nil {
			return nil, err
		}
		_ = u.submissionRepo.UpdateStatus(ctx, submission.ID, entity.SubmissionStatusApproved, userID, nil, false, &word.ID)
		return submission, nil
	}

	if err := u.submissionRepo.Create(ctx, submission); err != nil {
		return nil, err
	}
	return submission, nil
}

// payloadToCreateWordInput maps a submission payload to the word creation input.
func payloadToCreateWordInput(payload entity.SubmissionPayload) CreateWordInput {
	return CreateWordInput{
		SourceLang:   payload.SourceLang,
		Headword:     payload.Headword,
		PartOfSpeech: payload.PartOfSpeech,
		Source:       payload.Source,
		Translations: payload.Translations,
		Derived:      payload.Derived,
	}
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
