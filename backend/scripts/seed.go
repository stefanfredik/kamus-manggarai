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
	"github.com/kamus-manggarai/backend/internal/infrastructure/search"
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
	dialectRepo := postgres.NewDialectRepo(pool)
	entryRepo := postgres.NewEntryRepo(pool)

	adminUser := seedAdminUser(ctx, userRepo, cfg.SeedAdmin)
	dialects := seedDialects(ctx, dialectRepo)

	redisClient, err := database.NewRedis(ctx, cfg.Redis)
	if err == nil {
		defer redisClient.Close()
		cache := redisrepo.NewCacheRepo(redisClient)
		searchSvc := search.New(cfg.Meili)
		_ = searchSvc.EnsureIndex(ctx)
		entryUC := usecase.NewEntryUseCase(entryRepo, cache, searchSvc)
		seedEntries(ctx, entryUC, adminUser.ID, dialects)
	} else {
		fmt.Printf("warning: skipping entry seed (redis not reachable): %v\n", err)
	}

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

func seedDialects(ctx context.Context, repo interface {
	FindBySlug(ctx context.Context, slug string) (*entity.Dialect, error)
	Create(ctx context.Context, d *entity.Dialect) error
}) []*entity.Dialect {
	defs := []entity.Dialect{
		{Name: "Manggarai Tengah", Slug: "manggarai-tengah", Region: ptr("Ruteng dan sekitarnya"), IsActive: true, SortOrder: 1, Description: ptr("Dialek pusat yang umum digunakan di Ruteng")},
		{Name: "Manggarai Timur", Slug: "manggarai-timur", Region: ptr("Borong dan sekitarnya"), IsActive: true, SortOrder: 2, Description: ptr("Dialek dari wilayah Manggarai Timur")},
		{Name: "Manggarai Barat", Slug: "manggarai-barat", Region: ptr("Labuan Bajo dan sekitarnya"), IsActive: true, SortOrder: 3, Description: ptr("Dialek dari wilayah Manggarai Barat")},
	}

	out := make([]*entity.Dialect, 0, len(defs))
	for i := range defs {
		d := defs[i]
		existing, err := repo.FindBySlug(ctx, d.Slug)
		if err == nil {
			fmt.Printf("dialect already exists: %s\n", existing.Name)
			out = append(out, existing)
			continue
		}
		d.ID = uuid.New()
		if err := repo.Create(ctx, &d); err != nil {
			fmt.Printf("failed to seed dialect %s: %v\n", d.Name, err)
			continue
		}
		fmt.Printf("seeded dialect: %s\n", d.Name)
		out = append(out, &d)
	}
	return out
}

func seedEntries(ctx context.Context, uc *usecase.EntryUseCase, adminID uuid.UUID, dialects []*entity.Dialect) {
	if len(dialects) < 2 {
		return
	}
	mgTengah := dialects[0].ID
	mgTimur := dialects[1].ID

	samples := []usecase.CreateEntryInput{
		{
			BaseForm:     "elong",
			PartOfSpeech: ptr("verba"),
			Notes:        ptr("Verba dasar yang digunakan dalam percakapan sehari-hari"),
			Dialects: []entity.SubmissionDialectInput{
				{
					DialectID:   mgTengah,
					IsAvailable: true,
					Definitions: []entity.SubmissionDefinitionInput{
						{Meaning: "makan", ContextNotes: ptr("Penggunaan umum untuk aktivitas makan"),
							Sentences: []entity.SubmissionSentenceInput{
								{SentenceSource: "Aku elong hang nasi", SentenceTranslation: "Aku makan nasi"},
							}},
					},
				},
				{
					DialectID:     mgTimur,
					LocalSpelling: ptr("ngelong"),
					IsAvailable:   true,
					Definitions: []entity.SubmissionDefinitionInput{
						{Meaning: "makan (lebih formal)",
							Sentences: []entity.SubmissionSentenceInput{
								{SentenceSource: "Hau ngelong wa?", SentenceTranslation: "Kamu sudah makan?"},
							}},
					},
				},
			},
		},
		{
			BaseForm:     "tabe",
			PartOfSpeech: ptr("interjeksi"),
			Notes:        ptr("Salam atau ungkapan hormat"),
			Dialects: []entity.SubmissionDialectInput{
				{
					DialectID:   mgTengah,
					IsAvailable: true,
					Definitions: []entity.SubmissionDefinitionInput{
						{Meaning: "salam, halo",
							Sentences: []entity.SubmissionSentenceInput{
								{SentenceSource: "Tabe morin!", SentenceTranslation: "Halo, tuan!"},
							}},
					},
				},
				{
					DialectID:   mgTimur,
					IsAvailable: true,
					Definitions: []entity.SubmissionDefinitionInput{
						{Meaning: "salam"},
					},
				},
			},
		},
		{
			BaseForm:     "wae",
			PartOfSpeech: ptr("nomina"),
			Dialects: []entity.SubmissionDialectInput{
				{
					DialectID:   mgTengah,
					IsAvailable: true,
					Definitions: []entity.SubmissionDefinitionInput{
						{Meaning: "air",
							Sentences: []entity.SubmissionSentenceInput{
								{SentenceSource: "Wae ho'o nai", SentenceTranslation: "Air ini segar"},
							}},
					},
				},
				{
					DialectID:   mgTimur,
					IsAvailable: true,
					Definitions: []entity.SubmissionDefinitionInput{
						{Meaning: "air"},
					},
				},
			},
		},
	}

	for _, s := range samples {
		entry, err := uc.CreateEntry(ctx, s, adminID)
		if err != nil {
			fmt.Printf("skip seed entry %q: %v\n", s.BaseForm, err)
			continue
		}
		fmt.Printf("seeded entry: %s (slug=%s)\n", entry.BaseForm, entry.Slug)
	}

	fmt.Println("triggering search reindex...")
	if err := uc.ReindexAll(ctx); err != nil {
		fmt.Printf("reindex error (non-fatal): %v\n", err)
	} else {
		fmt.Println("search reindex completed")
	}
}

func ptr(s string) *string { return &s }
