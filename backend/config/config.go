package config

import "time"

type Config struct {
	App       AppConfig
	DB        DBConfig
	Redis     RedisConfig
	JWT       JWTConfig
	Google    GoogleConfig
	RateLimit RateLimitConfig
	Log       LogConfig
	SeedAdmin SeedAdminConfig
}

type AppConfig struct {
	Env         string
	Port        string
	URL         string
	FrontendURL string
}

type DBConfig struct {
	Host            string
	Port            string
	Name            string
	User            string
	Password        string
	MaxOpenConns    int32
	MaxIdleConns    int32
	ConnMaxLifetime time.Duration
}

func (d DBConfig) DSN() string {
	return "postgres://" + d.User + ":" + d.Password + "@" + d.Host + ":" + d.Port + "/" + d.Name + "?sslmode=disable"
}

// RedactedDSN returns a DSN safe for logging (password masked).
func (d DBConfig) RedactedDSN() string {
	return "postgres://" + d.User + ":***@" + d.Host + ":" + d.Port + "/" + d.Name + "?sslmode=disable"
}

type RedisConfig struct {
	Host     string
	Port     string
	Password string
	DB       int
}

func (r RedisConfig) Addr() string {
	return r.Host + ":" + r.Port
}

type JWTConfig struct {
	AccessSecret  string
	RefreshSecret string
	AccessExpiry  time.Duration
	RefreshExpiry time.Duration
}

type GoogleConfig struct {
	ClientID     string
	ClientSecret string
	RedirectURL  string
}

type RateLimitConfig struct {
	Public int
	Auth   int
}

type LogConfig struct {
	Level  string
	Format string
}

type SeedAdminConfig struct {
	Email string
	Name  string
}
