package config

import (
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

func Load() (*Config, error) {
	_ = godotenv.Load()

	cfg := &Config{
		App: AppConfig{
			Env:         getEnv("APP_ENV", "development"),
			Port:        getEnv("APP_PORT", "8080"),
			URL:         getEnv("APP_URL", "http://localhost:8080"),
			FrontendURL: getEnv("FRONTEND_URL", "http://localhost"),
		},
		DB: DBConfig{
			Host:            getEnv("DB_HOST", "postgres"),
			Port:            getEnv("DB_PORT", "5432"),
			Name:            getEnv("DB_NAME", "kamus_manggarai"),
			User:            getEnv("DB_USER", "kamus_user"),
			Password:        getEnv("DB_PASSWORD", ""),
			MaxOpenConns:    int32(getEnvInt("DB_MAX_OPEN_CONNS", 25)),
			MaxIdleConns:    int32(getEnvInt("DB_MAX_IDLE_CONNS", 10)),
			ConnMaxLifetime: getEnvDuration("DB_CONN_MAX_LIFETIME", 5*time.Minute),
		},
		Redis: RedisConfig{
			Host:     getEnv("REDIS_HOST", "redis"),
			Port:     getEnv("REDIS_PORT", "6379"),
			Password: getEnv("REDIS_PASSWORD", ""),
			DB:       getEnvInt("REDIS_DB", 0),
		},
		JWT: JWTConfig{
			AccessSecret:  getEnv("JWT_ACCESS_SECRET", "change_me"),
			RefreshSecret: getEnv("JWT_REFRESH_SECRET", "change_me_refresh"),
			AccessExpiry:  getEnvDuration("JWT_ACCESS_EXPIRY", 15*time.Minute),
			RefreshExpiry: getEnvDuration("JWT_REFRESH_EXPIRY", 168*time.Hour),
		},
		Google: GoogleConfig{
			ClientID:     getEnv("GOOGLE_CLIENT_ID", ""),
			ClientSecret: getEnv("GOOGLE_CLIENT_SECRET", ""),
			RedirectURL:  getEnv("GOOGLE_REDIRECT_URL", ""),
		},
		RateLimit: RateLimitConfig{
			Public: getEnvInt("RATE_LIMIT_PUBLIC", 60),
			Auth:   getEnvInt("RATE_LIMIT_AUTH", 10),
		},
		Log: LogConfig{
			Level:  getEnv("LOG_LEVEL", "info"),
			Format: getEnv("LOG_FORMAT", "json"),
		},
		SeedAdmin: SeedAdminConfig{
			Email: getEnv("SEED_ADMIN_EMAIL", "admin@kamus-manggarai.id"),
			Name:  getEnv("SEED_ADMIN_NAME", "Administrator"),
		},
	}

	return cfg, nil
}

func getEnv(key, defaultValue string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	if v := os.Getenv(key); v != "" {
		if i, err := strconv.Atoi(v); err == nil {
			return i
		}
	}
	return defaultValue
}

func getEnvDuration(key string, defaultValue time.Duration) time.Duration {
	if v := os.Getenv(key); v != "" {
		if d, err := time.ParseDuration(v); err == nil {
			return d
		}
	}
	return defaultValue
}
