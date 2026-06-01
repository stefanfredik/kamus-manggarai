package http

import (
	"github.com/gofiber/fiber/v3"
	"github.com/kamus-manggarai/backend/config"
	"github.com/kamus-manggarai/backend/internal/delivery/http/handler"
	"github.com/kamus-manggarai/backend/internal/delivery/http/middleware"
	"github.com/kamus-manggarai/backend/internal/domain/repository"
	"github.com/kamus-manggarai/backend/internal/usecase"
)

type Handlers struct {
	Auth       *handler.AuthHandler
	Dictionary *handler.DictionaryHandler
	Submission *handler.SubmissionHandler
	Review     *handler.ReviewHandler
	Admin      *handler.AdminHandler
	Goet       *handler.GoetHandler
}

func RegisterRoutes(app *fiber.App, h Handlers, authUC *usecase.AuthUseCase, cache repository.CacheRepository, cfg *config.Config) {
	app.Get("/health", func(c fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok", "service": "kamus-manggarai"})
	})

	api := app.Group("/api/v1")
	api.Use(middleware.CORS(cfg.App.FrontendURL))

	authGroup := api.Group("/auth")
	authGroup.Use(middleware.RateLimit(cache, middleware.RateLimitConfig{
		WindowSeconds: 60,
		Max:           cfg.RateLimit.Auth,
		KeyPrefix:     "rl:auth",
	}))
	authGroup.Get("/google", h.Auth.GoogleStart)
	authGroup.Get("/google/callback", h.Auth.GoogleCallback)
	authGroup.Post("/register", h.Auth.Register)
	authGroup.Post("/login", h.Auth.Login)
	authGroup.Post("/refresh", h.Auth.Refresh)

	authProtected := authGroup.Group("", middleware.AuthRequired(authUC))
	authProtected.Post("/logout", h.Auth.Logout)
	authProtected.Get("/me", h.Auth.Me)

	publicGroup := api.Group("")
	publicGroup.Use(middleware.RateLimit(cache, middleware.RateLimitConfig{
		WindowSeconds: 60,
		Max:           cfg.RateLimit.Public,
		KeyPrefix:     "rl:public",
	}))
	publicGroup.Use(middleware.AuthOptional(authUC))

	publicGroup.Get("/entries", h.Dictionary.ListEntries)
	publicGroup.Get("/entries/:slug", h.Dictionary.GetEntryDetail)
	publicGroup.Post("/entries/:slug/reports", h.Dictionary.ReportEntry)
	publicGroup.Get("/search", h.Dictionary.Search)
	publicGroup.Get("/goet", h.Goet.List)
	publicGroup.Get("/goet/:id", h.Goet.GetByID)

	contributor := api.Group("", middleware.AuthRequired(authUC), middleware.RequireContributor())
	contributor.Post("/submissions", h.Submission.Submit)
	contributor.Get("/submissions", h.Submission.ListMine)
	contributor.Get("/submissions/:id", h.Submission.GetByID)
	contributor.Put("/submissions/:id", h.Submission.Edit)
	contributor.Get("/notifications", h.Submission.ListNotifications)
	contributor.Patch("/notifications/:id/read", h.Submission.MarkNotificationRead)
	contributor.Patch("/notifications/read-all", h.Submission.MarkAllNotificationsRead)

	review := api.Group("/review", middleware.AuthRequired(authUC), middleware.RequireValidatorOrAdmin())
	review.Get("/queue", h.Review.Queue)
	review.Get("/queue/:id", h.Submission.GetByID)
	review.Post("/queue/:id/approve", h.Review.Approve)
	review.Post("/queue/:id/reject", h.Review.Reject)
	review.Put("/queue/:id/revise", h.Review.Revise)

	admin := api.Group("/admin", middleware.AuthRequired(authUC), middleware.RequireAdmin())
	admin.Get("/users", h.Admin.ListUsers)
	admin.Post("/users", h.Admin.CreateUser)
	admin.Put("/users/:id", h.Admin.UpdateUser)
	admin.Patch("/users/:id/password", h.Admin.ResetPassword)
	admin.Delete("/users/:id", h.Admin.DeleteUser)
	admin.Patch("/users/:id/toggle-validator", h.Admin.ToggleValidator)
	admin.Patch("/users/:id/toggle-suspend", h.Admin.ToggleSuspend)
	admin.Get("/reports", h.Admin.ListReports)
	admin.Patch("/reports/:id", h.Admin.HandleReport)
	admin.Get("/analytics", h.Admin.Analytics)
	admin.Put("/words/:id", h.Admin.UpdateWord)
	admin.Delete("/words/:id", h.Admin.DeleteWord)
	admin.Post("/goet", h.Goet.Create)
	admin.Put("/goet/:id", h.Goet.Update)
	admin.Delete("/goet/:id", h.Goet.Delete)
}
