package main

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/google/uuid"
	"github.com/kamus-manggarai/backend/config"
	"github.com/kamus-manggarai/backend/internal/domain/entity"
	"github.com/kamus-manggarai/backend/internal/infrastructure/database"
	"github.com/kamus-manggarai/backend/internal/repository/postgres"
	redisrepo "github.com/kamus-manggarai/backend/internal/repository/redis"
	"github.com/kamus-manggarai/backend/internal/usecase"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		fmt.Printf("failed to load config: %v\n", err)
		os.Exit(1)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	pool, err := database.NewPostgres(ctx, cfg.DB)
	if err != nil {
		fmt.Printf("failed to connect postgres: %v\n", err)
		os.Exit(1)
	}
	defer pool.Close()

	userRepo := postgres.NewUserRepo(pool)
	entryRepo := postgres.NewEntryRepo(pool)

	adminUser := seedAdminUser(ctx, userRepo, cfg.SeedAdmin)

	redisClient, err := database.NewRedis(ctx, cfg.Redis)
	if err != nil {
		fmt.Printf("warning: skipping entry seed (redis not reachable): %v\n", err)
		fmt.Println("seed completed (admin only)")
		return
	}
	defer redisClient.Close()

	cache := redisrepo.NewCacheRepo(redisClient)
	entryUC := usecase.NewEntryUseCase(entryRepo, cache)
	seedEntries(ctx, entryUC, adminUser.ID)

	fmt.Println("seed completed successfully")
}

func seedAdminUser(ctx context.Context, repo interface {
	FindByEmail(ctx context.Context, email string) (*entity.User, error)
	Create(ctx context.Context, u *entity.User) error
}, cfg config.SeedAdminConfig) *entity.User {
	existing, err := repo.FindByEmail(ctx, cfg.Email)
	if err == nil {
		fmt.Printf("admin user already exists: %s\n", existing.Email)
		return existing
	}

	hash, herr := bcrypt.GenerateFromPassword([]byte("admin1234"), bcrypt.DefaultCost)
	if herr != nil {
		fmt.Printf("failed to hash admin password: %v\n", herr)
		os.Exit(1)
	}
	hashStr := string(hash)

	user := &entity.User{
		ID:           uuid.New(),
		Email:        cfg.Email,
		Name:         cfg.Name,
		Role:         entity.RoleAdmin,
		PasswordHash: &hashStr,
	}
	if err := repo.Create(ctx, user); err != nil {
		fmt.Printf("failed to seed admin: %v\n", err)
		os.Exit(1)
	}
	fmt.Printf("seeded admin user: %s (default password: admin1234 — segera ubah)\n", user.Email)
	return user
}

func seedEntries(ctx context.Context, uc *usecase.EntryUseCase, adminID uuid.UUID) {
	samples := []usecase.CreateEntryInput{
		{
			Manggarai: "hang",
			Senses: []entity.SubmissionSenseInput{
				{Indonesian: "makan", PartOfSpeech: ptr("verba"), Notes: ptr("Verba dasar yang digunakan dalam percakapan sehari-hari")},
				{Indonesian: "makanan", PartOfSpeech: ptr("nomina"), Notes: ptr("Hasil atau sesuatu yang dimakan")},
			},
			Derived: []entity.SubmissionDerivedInput{
				{Word: "hang nggula", Translation: "sarapan (makan pagi)"},
				{Word: "hang leso", Translation: "makan siang"},
			},
		},
		{
			Manggarai: "wae",
			Senses: []entity.SubmissionSenseInput{
				{Indonesian: "air", PartOfSpeech: ptr("nomina"), Notes: ptr("Kata benda untuk air")},
			},
			Derived: []entity.SubmissionDerivedInput{
				{Word: "wae teku", Translation: "air minum"},
			},
		},
		{
			Manggarai: "tabe",
			Senses: []entity.SubmissionSenseInput{
				{Indonesian: "salam", PartOfSpeech: ptr("interjeksi"), Notes: ptr("Ungkapan salam atau hormat")},
			},
		},
		{
			Manggarai: "mbaru",
			Senses: []entity.SubmissionSenseInput{
				{Indonesian: "rumah", PartOfSpeech: ptr("nomina")},
			},
		},
		{
			Manggarai: "ngo",
			Senses: []entity.SubmissionSenseInput{
				{Indonesian: "pergi", PartOfSpeech: ptr("verba")},
			},
		},
	}

	for _, s := range samples {
		entry, err := uc.CreateEntry(ctx, s, &adminID)
		if err != nil {
			fmt.Printf("skip seed entry %q: %v\n", s.Manggarai, err)
			continue
		}
		fmt.Printf("seeded entry: %s (slug=%s)\n", entry.Manggarai, entry.Slug)
	}
}

func ptr(s string) *string { return &s }
