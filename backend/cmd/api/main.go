package main

import (
	"context"
	"errors"
	"fmt"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/kamus-manggarai/backend/config"
	httpdelivery "github.com/kamus-manggarai/backend/internal/delivery/http"
	"golang.org/x/crypto/bcrypt"
	"github.com/kamus-manggarai/backend/internal/delivery/http/handler"
	"github.com/kamus-manggarai/backend/internal/infrastructure/database"
	"github.com/kamus-manggarai/backend/internal/infrastructure/oauth"
	"github.com/kamus-manggarai/backend/internal/repository/postgres"
	redisrepo "github.com/kamus-manggarai/backend/internal/repository/redis"
	"github.com/kamus-manggarai/backend/internal/usecase"
	"github.com/kamus-manggarai/backend/pkg/apperror"
	"github.com/kamus-manggarai/backend/pkg/logger"
	"github.com/kamus-manggarai/backend/pkg/response"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		fmt.Printf("failed to load config: %v\n", err)
		os.Exit(1)
	}
	logger.Init(cfg.Log.Level, cfg.Log.Format)

	if len(os.Args) > 1 {
		switch os.Args[1] {
		case "migrate":
			runMigrationCommand(cfg)
			return
		case "seed":
			runSeed(cfg)
			return
		case "set-password":
			runSetPassword(cfg)
			return
		}
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	logger.Info().Msg("starting kamus manggarai backend")

	migrationsPath := findMigrationsPath()
	if migrationsPath != "" {
		if err := database.RunMigrations(cfg.DB, migrationsPath); err != nil {
			logger.Error().Err(err).Msg("auto-migration failed")
		} else {
			logger.Info().Msg("migrations applied successfully")
		}
	}

	pgPool, err := database.NewPostgres(ctx, cfg.DB)
	if err != nil {
		logger.Fatal().Err(err).Msg("failed to connect postgres")
	}
	defer pgPool.Close()

	redisClient, err := database.NewRedis(ctx, cfg.Redis)
	if err != nil {
		logger.Fatal().Err(err).Msg("failed to connect redis")
	}
	defer redisClient.Close()

	oauthSvc := oauth.New(cfg.Google)

	userRepo := postgres.NewUserRepo(pgPool)
	entryRepo := postgres.NewEntryRepo(pgPool)
	submissionRepo := postgres.NewSubmissionRepo(pgPool)
	reportRepo := postgres.NewReportRepo(pgPool)
	notifRepo := postgres.NewNotificationRepo(pgPool)
	tokenRepo := postgres.NewTokenRepo(pgPool)
	cacheRepo := redisrepo.NewCacheRepo(redisClient)
	analyticsDB := postgres.NewAnalyticsDB(pgPool)

	authUC := usecase.NewAuthUseCase(cfg.JWT, cfg.App.FrontendURL, userRepo, tokenRepo, oauthSvc)
	notifUC := usecase.NewNotificationUseCase(notifRepo)
	entryUC := usecase.NewEntryUseCase(entryRepo, cacheRepo)
	searchUC := usecase.NewSearchUseCase(entryRepo, cacheRepo)
	reportUC := usecase.NewReportUseCase(reportRepo, entryRepo)
	submissionUC := usecase.NewSubmissionUseCase(submissionRepo, userRepo, entryUC, notifUC)
	reviewUC := usecase.NewReviewUseCase(submissionRepo, userRepo, entryUC, notifUC)
	adminUC := usecase.NewAdminUseCase(userRepo, reportRepo, submissionRepo, entryRepo)

	cookieSecure := cfg.App.Env == "production"
	handlers := httpdelivery.Handlers{
		Auth:       handler.NewAuthHandler(authUC, cfg.App.FrontendURL, cookieSecure),
		Dictionary: handler.NewDictionaryHandler(entryUC, searchUC, reportUC),
		Submission: handler.NewSubmissionHandler(submissionUC, notifUC),
		Review:     handler.NewReviewHandler(reviewUC),
		Admin:      handler.NewAdminHandler(adminUC, analyticsDB),
	}

	app := fiber.New(fiber.Config{
		AppName: "Kamus Manggarai API",
		ErrorHandler: func(c fiber.Ctx, err error) error {
			ae, _ := apperror.As(err)
			if ae == nil {
				logger.Error().Err(err).Msg("unhandled error")
				ae = apperror.ErrInternal
			}
			return response.Error(c, ae)
		},
	})

	app.Use(func(c fiber.Ctx) error {
		start := time.Now()
		err := c.Next()
		logger.Info().
			Str("method", c.Method()).
			Str("path", c.Path()).
			Int("status", c.Response().StatusCode()).
			Dur("duration", time.Since(start)).
			Msg("request")
		return err
	})

	httpdelivery.RegisterRoutes(app, handlers, authUC, cacheRepo, cfg)

	go func() {
		addr := ":" + cfg.App.Port
		logger.Info().Str("addr", addr).Msg("server listening")
		if err := app.Listen(addr); err != nil && !errors.Is(err, fiber.ErrServiceUnavailable) {
			logger.Fatal().Err(err).Msg("server error")
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	<-stop

	logger.Info().Msg("shutdown signal received")

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()
	if err := app.ShutdownWithContext(shutdownCtx); err != nil {
		logger.Error().Err(err).Msg("server shutdown error")
	}
	logger.Info().Msg("server exited cleanly")
}

func runMigrationCommand(cfg *config.Config) {
	if len(os.Args) < 3 {
		fmt.Println("usage: api migrate up|down")
		os.Exit(1)
	}
	migrationsPath := findMigrationsPath()
	if migrationsPath == "" {
		fmt.Println("migrations directory not found")
		os.Exit(1)
	}
	switch os.Args[2] {
	case "up":
		if err := database.RunMigrations(cfg.DB, migrationsPath); err != nil {
			fmt.Println("migration up failed:", err)
			os.Exit(1)
		}
		fmt.Println("migration up applied")
	case "down":
		if err := database.RunMigrationsDown(cfg.DB, migrationsPath); err != nil {
			fmt.Println("migration down failed:", err)
			os.Exit(1)
		}
		fmt.Println("migration down applied")
	default:
		fmt.Println("unknown migrate subcommand:", os.Args[2])
		os.Exit(1)
	}
}

func runSeed(cfg *config.Config) {
	fmt.Println("seed: please run the dedicated seed binary (./seed) — see scripts/seed.go")
	_ = cfg
}

func runSetPassword(cfg *config.Config) {
	if len(os.Args) < 4 {
		fmt.Println("usage: api set-password <email> <new-password>")
		os.Exit(1)
	}
	email := os.Args[2]
	password := os.Args[3]
	if len(password) < 8 {
		fmt.Println("password must be at least 8 characters")
		os.Exit(1)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	pool, err := pgxpool.New(ctx, cfg.DB.DSN())
	if err != nil {
		fmt.Println("failed to connect:", err)
		os.Exit(1)
	}
	defer pool.Close()

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		fmt.Println("failed to hash:", err)
		os.Exit(1)
	}

	tag, err := pool.Exec(ctx, `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE email = $2`, string(hash), email)
	if err != nil {
		fmt.Println("update failed:", err)
		os.Exit(1)
	}
	if tag.RowsAffected() == 0 {
		fmt.Printf("no user found with email: %s\n", email)
		os.Exit(1)
	}
	fmt.Printf("password updated for %s\n", email)
}

func findMigrationsPath() string {
	candidates := []string{"./db/migrations", "/app/db/migrations"}
	for _, p := range candidates {
		if abs, err := filepath.Abs(p); err == nil {
			if _, err := os.Stat(abs); err == nil {
				return abs
			}
		}
	}
	return ""
}
