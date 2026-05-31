package usecase

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/kamus-manggarai/backend/config"
	"github.com/kamus-manggarai/backend/internal/domain/entity"
	"github.com/kamus-manggarai/backend/internal/domain/repository"
	"github.com/kamus-manggarai/backend/internal/domain/service"
	"github.com/kamus-manggarai/backend/pkg/apperror"
	"golang.org/x/crypto/bcrypt"
)

type AuthUseCase struct {
	cfg         config.JWTConfig
	userRepo    repository.UserRepository
	tokenRepo   repository.TokenRepository
	oauth       service.OAuthService
	frontendURL string
}

func NewAuthUseCase(cfg config.JWTConfig, frontendURL string, userRepo repository.UserRepository, tokenRepo repository.TokenRepository, oauth service.OAuthService) *AuthUseCase {
	return &AuthUseCase{
		cfg:         cfg,
		userRepo:    userRepo,
		tokenRepo:   tokenRepo,
		oauth:       oauth,
		frontendURL: frontendURL,
	}
}

type Claims struct {
	UserID string `json:"uid"`
	Email  string `json:"email"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

type LoginResult struct {
	AccessToken  string       `json:"access_token"`
	RefreshToken string       `json:"refresh_token"`
	ExpiresIn    int64        `json:"expires_in"`
	User         *entity.User `json:"user"`
}

func (u *AuthUseCase) GoogleAuthURL(state string) string {
	if state == "" {
		b := make([]byte, 16)
		_, _ = rand.Read(b)
		state = hex.EncodeToString(b)
	}
	return u.oauth.AuthURL(state)
}

func (u *AuthUseCase) GoogleCallback(ctx context.Context, code string) (*LoginResult, error) {
	if code == "" {
		return nil, apperror.ErrBadRequest.WithMessage("authorization code dibutuhkan")
	}

	tok, err := u.oauth.Exchange(ctx, code)
	if err != nil {
		return nil, apperror.ErrUnauthorized.WithMessage("gagal menukar code OAuth").WithCause(err)
	}

	info, err := u.oauth.UserInfo(ctx, tok)
	if err != nil {
		return nil, apperror.ErrUnauthorized.WithMessage("gagal mendapatkan info user dari Google").WithCause(err)
	}

	user, err := u.userRepo.FindByGoogleID(ctx, info.ID)
	if err != nil {
		if !errors.Is(err, apperror.ErrNotFound) {
			return nil, err
		}

		if existing, e := u.userRepo.FindByEmail(ctx, info.Email); e == nil {
			user = existing
		} else {
			gid := info.ID
			newUser := &entity.User{
				GoogleID: &gid,
				Email:    info.Email,
				Name:     info.Name,
				Role:     entity.RoleContributor,
			}
			if info.Picture != "" {
				pic := info.Picture
				newUser.AvatarURL = &pic
			}
			if err := u.userRepo.Create(ctx, newUser); err != nil {
				return nil, err
			}
			user = newUser
		}
	}

	if user.IsSuspended {
		return nil, apperror.ErrSuspended
	}

	return u.issueTokens(ctx, user)
}

func (u *AuthUseCase) issueTokens(ctx context.Context, user *entity.User) (*LoginResult, error) {
	accessToken, err := u.signAccessToken(user)
	if err != nil {
		return nil, err
	}

	refreshToken, refreshHash, err := u.generateRefreshToken()
	if err != nil {
		return nil, err
	}

	rt := &entity.RefreshToken{
		UserID:    user.ID,
		TokenHash: refreshHash,
		ExpiresAt: time.Now().Add(u.cfg.RefreshExpiry),
	}
	if err := u.tokenRepo.Create(ctx, rt); err != nil {
		return nil, err
	}

	return &LoginResult{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    int64(u.cfg.AccessExpiry.Seconds()),
		User:         user,
	}, nil
}

func (u *AuthUseCase) signAccessToken(user *entity.User) (string, error) {
	claims := Claims{
		UserID: user.ID.String(),
		Email:  user.Email,
		Role:   user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(u.cfg.AccessExpiry)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Subject:   user.ID.String(),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(u.cfg.AccessSecret))
}

func (u *AuthUseCase) ParseAccessToken(tokenStr string) (*Claims, error) {
	tok, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(u.cfg.AccessSecret), nil
	})
	if err != nil {
		return nil, apperror.ErrUnauthorized.WithMessage("token tidak valid").WithCause(err)
	}
	if claims, ok := tok.Claims.(*Claims); ok && tok.Valid {
		return claims, nil
	}
	return nil, apperror.ErrUnauthorized.WithMessage("token tidak valid")
}

func (u *AuthUseCase) Refresh(ctx context.Context, refreshToken string) (*LoginResult, error) {
	if refreshToken == "" {
		return nil, apperror.ErrUnauthorized.WithMessage("refresh token dibutuhkan")
	}
	hash := hashToken(refreshToken)
	stored, err := u.tokenRepo.FindByHash(ctx, hash)
	if err != nil {
		return nil, apperror.ErrUnauthorized.WithMessage("refresh token tidak valid")
	}
	if stored.Revoked || time.Now().After(stored.ExpiresAt) {
		return nil, apperror.ErrUnauthorized.WithMessage("refresh token kedaluwarsa atau dicabut")
	}
	user, err := u.userRepo.FindByID(ctx, stored.UserID)
	if err != nil {
		return nil, err
	}
	if user.IsSuspended {
		return nil, apperror.ErrSuspended
	}
	_ = u.tokenRepo.Revoke(ctx, hash)
	return u.issueTokens(ctx, user)
}

func (u *AuthUseCase) Logout(ctx context.Context, refreshToken string) error {
	if refreshToken == "" {
		return nil
	}
	return u.tokenRepo.Revoke(ctx, hashToken(refreshToken))
}

func (u *AuthUseCase) GetUserByID(ctx context.Context, id uuid.UUID) (*entity.User, error) {
	return u.userRepo.FindByID(ctx, id)
}

func (u *AuthUseCase) generateRefreshToken() (string, string, error) {
	b := make([]byte, 48)
	if _, err := rand.Read(b); err != nil {
		return "", "", err
	}
	tok := base64.URLEncoding.EncodeToString(b)
	return tok, hashToken(tok), nil
}

func hashToken(t string) string {
	h := sha256.Sum256([]byte(t))
	return hex.EncodeToString(h[:])
}

type RegisterInput struct {
	Email    string
	Name     string
	Password string
}

func (u *AuthUseCase) Register(ctx context.Context, input RegisterInput) (*LoginResult, error) {
	email := strings.ToLower(strings.TrimSpace(input.Email))
	name := strings.TrimSpace(input.Name)
	if email == "" || !strings.Contains(email, "@") {
		return nil, apperror.ErrValidation.WithMessage("email tidak valid")
	}
	if name == "" {
		return nil, apperror.ErrValidation.WithMessage("nama wajib diisi")
	}
	if len(input.Password) < 8 {
		return nil, apperror.ErrValidation.WithMessage("password minimal 8 karakter")
	}

	if existing, err := u.userRepo.FindByEmail(ctx, email); err == nil && existing != nil {
		return nil, apperror.ErrConflict.WithMessage("email sudah terdaftar")
	} else if err != nil && !errors.Is(err, apperror.ErrNotFound) {
		return nil, err
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, apperror.ErrInternal.WithCause(err)
	}
	hashStr := string(hash)

	newUser := &entity.User{
		Email:        email,
		Name:         name,
		Role:         entity.RoleContributor,
		PasswordHash: &hashStr,
	}
	if err := u.userRepo.Create(ctx, newUser); err != nil {
		return nil, err
	}
	return u.issueTokens(ctx, newUser)
}

func (u *AuthUseCase) Login(ctx context.Context, email, password string) (*LoginResult, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	if email == "" || password == "" {
		return nil, apperror.ErrUnauthorized.WithMessage("email atau password salah")
	}
	user, err := u.userRepo.FindByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, apperror.ErrNotFound) {
			return nil, apperror.ErrUnauthorized.WithMessage("email atau password salah")
		}
		return nil, err
	}
	if user.PasswordHash == nil || *user.PasswordHash == "" {
		return nil, apperror.ErrUnauthorized.WithMessage("akun ini hanya dapat login melalui Google")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(*user.PasswordHash), []byte(password)); err != nil {
		return nil, apperror.ErrUnauthorized.WithMessage("email atau password salah")
	}
	if user.IsSuspended {
		return nil, apperror.ErrSuspended
	}
	return u.issueTokens(ctx, user)
}
