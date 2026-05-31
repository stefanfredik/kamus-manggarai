package oauth

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/kamus-manggarai/backend/config"
	"github.com/kamus-manggarai/backend/internal/domain/service"
	"golang.org/x/oauth2"
	googleoauth "golang.org/x/oauth2/google"
)

type googleService struct {
	cfg *oauth2.Config
}

func New(cfg config.GoogleConfig) service.OAuthService {
	return &googleService{
		cfg: &oauth2.Config{
			ClientID:     cfg.ClientID,
			ClientSecret: cfg.ClientSecret,
			RedirectURL:  cfg.RedirectURL,
			Endpoint:     googleoauth.Endpoint,
			Scopes: []string{
				"https://www.googleapis.com/auth/userinfo.email",
				"https://www.googleapis.com/auth/userinfo.profile",
			},
		},
	}
}

func (g *googleService) AuthURL(state string) string {
	return g.cfg.AuthCodeURL(state, oauth2.AccessTypeOnline)
}

func (g *googleService) Exchange(ctx context.Context, code string) (*oauth2.Token, error) {
	return g.cfg.Exchange(ctx, code)
}

func (g *googleService) UserInfo(ctx context.Context, token *oauth2.Token) (*service.GoogleUserInfo, error) {
	client := g.cfg.Client(ctx, token)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://www.googleapis.com/oauth2/v2/userinfo", nil)
	if err != nil {
		return nil, fmt.Errorf("build userinfo request: %w", err)
	}

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("fetch userinfo: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("userinfo returned status %d", resp.StatusCode)
	}

	var info service.GoogleUserInfo
	if err := json.NewDecoder(resp.Body).Decode(&info); err != nil {
		return nil, fmt.Errorf("decode userinfo: %w", err)
	}
	return &info, nil
}
