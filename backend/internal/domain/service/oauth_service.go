package service

import (
	"context"

	"golang.org/x/oauth2"
)

type GoogleUserInfo struct {
	ID      string `json:"id"`
	Email   string `json:"email"`
	Name    string `json:"name"`
	Picture string `json:"picture"`
}

type OAuthService interface {
	AuthURL(state string) string
	Exchange(ctx context.Context, code string) (*oauth2.Token, error)
	UserInfo(ctx context.Context, token *oauth2.Token) (*GoogleUserInfo, error)
}
