# Checklist Implementasi Bertahap
## Kamus Digital Bahasa Manggarai – Bahasa Indonesia

---

## 📋 Panduan Penggunaan

> **Konvensi Status:**
> - `[ ]` — Belum dikerjakan
> - `[~]` — Sedang dikerjakan
> - `[x]` — Selesai
>
> **Urutan fase bersifat sekuensial.** Fase berikutnya sebaiknya dimulai setelah fase sebelumnya selesai minimal 80%.

---

## 🗂️ FASE 0 — Project Setup & Infrastruktur Dasar

### 0.1 Inisialisasi Repository

- [ ] Buat monorepo atau dua repo terpisah (`backend/`, `frontend/`)
- [ ] Setup `.gitignore` untuk Go, Node.js, dan environment files
- [ ] Buat `README.md` dengan instruksi setup lokal
- [ ] Setup branch strategy (`main`, `develop`, `feature/*`)

### 0.2 Setup Backend (Go)

- [ ] Inisialisasi Go module (`go mod init`)
- [ ] Buat struktur direktori sesuai SRS section 7.2:
  - [ ] `cmd/api/`
  - [ ] `config/`
  - [ ] `internal/domain/entity/`
  - [ ] `internal/domain/repository/`
  - [ ] `internal/domain/service/`
  - [ ] `internal/usecase/`
  - [ ] `internal/repository/postgres/`
  - [ ] `internal/repository/redis/`
  - [ ] `internal/delivery/http/handler/`
  - [ ] `internal/delivery/http/middleware/`
  - [ ] `internal/infrastructure/`
  - [ ] `pkg/`
  - [ ] `db/migrations/`
  - [ ] `db/queries/`
  - [ ] `docs/`
  - [ ] `scripts/`
- [ ] Install dependensi utama:
  - [ ] `github.com/gofiber/fiber/v3`
  - [ ] `github.com/jackc/pgx/v5`
  - [ ] `github.com/sqlc-dev/sqlc`
  - [ ] `github.com/golang-jwt/jwt/v5`
  - [ ] `github.com/meilisearch/meilisearch-go`
  - [ ] `github.com/redis/go-redis/v9`
  - [ ] `github.com/golang-migrate/migrate/v4`
  - [ ] `github.com/rs/zerolog`
  - [ ] `golang.org/x/oauth2`
- [ ] Buat `config/config.go` dan `config/loader.go` (load dari env)
- [ ] Buat `.env.example` sesuai section 12.2
- [ ] Setup `main.go` entry point dasar (server start, graceful shutdown)

### 0.3 Setup Frontend (React)

- [ ] Inisialisasi project Vite + React + TypeScript
- [ ] Install dependensi utama:
  - [ ] `react-router-dom` v7
  - [ ] `@tanstack/react-query` v5
  - [ ] `zustand`
  - [ ] `axios`
  - [ ] `tailwindcss` v4
  - [ ] `shadcn/ui`
- [ ] Buat struktur direktori sesuai SRS section 8.2:
  - [ ] `src/app/`
  - [ ] `src/features/dictionary/`
  - [ ] `src/features/auth/`
  - [ ] `src/features/contribution/`
  - [ ] `src/features/review/`
  - [ ] `src/features/admin/`
  - [ ] `src/shared/`
  - [ ] `src/lib/`
  - [ ] `src/types/`
- [ ] Konfigurasi Tailwind CSS
- [ ] Setup shadcn/ui (init + theme)
- [ ] Konfigurasi `tsconfig.json` (strict mode, path alias `@/`)
- [ ] Setup ESLint + Prettier
- [ ] Buat `src/lib/axios.ts` (Axios instance + interceptors placeholder)
- [ ] Buat `src/lib/queryClient.ts` (TanStack Query config)

### 0.4 Setup Docker & Infrastruktur

- [ ] Buat `docker-compose.yml` sesuai section 12.1 dengan service:
  - [ ] `postgres` (dengan healthcheck)
  - [ ] `redis` (dengan healthcheck)
  - [ ] `meilisearch`
  - [ ] `backend`
  - [ ] `frontend`
  - [ ] `nginx`
- [ ] Buat `backend/Dockerfile` (multi-stage build sesuai section 12.3)
- [ ] Buat `frontend/Dockerfile` (multi-stage build)
- [ ] Buat `nginx/nginx.conf` (reverse proxy ke backend:8080 dan frontend:3000)
- [ ] Test `docker-compose up` — semua service berjalan
- [ ] Verifikasi PostgreSQL dapat diakses dari backend container
- [ ] Verifikasi Redis dapat diakses dari backend container
- [ ] Verifikasi Meilisearch dapat diakses dari backend container

---

## 🗂️ FASE 1 — Database & Domain Layer

### 1.1 Database Migration

- [ ] Setup `golang-migrate` di project
- [ ] Buat migration file `000001_create_users.up.sql`:
  - [ ] Tabel `users` dengan semua kolom sesuai section 9.3
  - [ ] Index: `idx_users_email`, `idx_users_google_id`, `idx_users_role`
- [ ] Buat migration file `000002_create_dialects.up.sql`:
  - [ ] Tabel `dialects` dengan semua kolom
  - [ ] Index: `idx_dialects_slug`, `idx_dialects_is_active`
- [ ] Buat migration file `000003_create_entries.up.sql`:
  - [ ] Tabel `entries` dengan semua kolom dan constraints
  - [ ] Index: `idx_entries_slug`, `idx_entries_base_form`, `idx_entries_status`, `idx_entries_created_by`
- [ ] Buat migration file `000004_create_entry_dialects.up.sql`:
  - [ ] Tabel `entry_dialects` dengan kolom dan UNIQUE constraint
  - [ ] Index: `idx_entry_dialects_entry_id`, `idx_entry_dialects_dialect_id`
- [ ] Buat migration file `000005_create_definitions.up.sql`:
  - [ ] Tabel `definitions` dengan semua kolom
  - [ ] Index: `idx_definitions_entry_dialect_id`
- [ ] Buat migration file `000006_create_example_sentences.up.sql`:
  - [ ] Tabel `example_sentences`
  - [ ] Index: `idx_example_sentences_definition_id`
- [ ] Buat migration file `000007_create_word_relations.up.sql`:
  - [ ] Tabel `word_relations` dengan CHECK constraints
  - [ ] Index: `idx_word_relations_from`, `idx_word_relations_to`
- [ ] Buat migration file `000008_create_submissions.up.sql`:
  - [ ] Tabel `submissions` dengan kolom JSONB `payload`
  - [ ] Index: `idx_submissions_submitted_by`, `idx_submissions_status`, `idx_submissions_reviewed_by`
- [ ] Buat migration file `000009_create_reports.up.sql`:
  - [ ] Tabel `reports`
  - [ ] Index: `idx_reports_entry_id`, `idx_reports_status`
- [ ] Buat migration file `000010_create_refresh_tokens.up.sql`:
  - [ ] Tabel `refresh_tokens`
  - [ ] Index: `idx_refresh_tokens_user_id`, `idx_refresh_tokens_token_hash`
- [ ] Buat migration file `000011_create_notifications.up.sql`:
  - [ ] Tabel `notifications`
  - [ ] Index: `idx_notifications_user_id`, `idx_notifications_is_read`
- [ ] Buat semua file `.down.sql` yang berkorespondensi
- [ ] Jalankan `migrate up` dan verifikasi semua tabel terbuat
- [ ] Buat database seeder (`scripts/seed.go`) untuk:
  - [ ] User Admin awal
  - [ ] Data dialek awal (minimal 3 dialek Manggarai)
  - [ ] Beberapa kosakata contoh

### 1.2 sqlc Setup & Query Files

- [ ] Buat `db/sqlc.yaml` (konfigurasi sqlc)
- [ ] Buat query file `db/queries/users.sql`:
  - [ ] `GetUserByID`
  - [ ] `GetUserByEmail`
  - [ ] `GetUserByGoogleID`
  - [ ] `CreateUser`
  - [ ] `UpdateUserRole`
  - [ ] `UpdateUserSuspendStatus`
  - [ ] `ListUsers`
- [ ] Buat query file `db/queries/dialects.sql`:
  - [ ] `GetDialectByID`
  - [ ] `GetDialectBySlug`
  - [ ] `ListActiveDialects`
  - [ ] `ListAllDialects`
  - [ ] `CreateDialect`
  - [ ] `UpdateDialect`
  - [ ] `ToggleDialectActive`
- [ ] Buat query file `db/queries/entries.sql`:
  - [ ] `GetEntryByID`
  - [ ] `GetEntryBySlug`
  - [ ] `ListPublishedEntries`
  - [ ] `CreateEntry`
  - [ ] `UpdateEntry`
  - [ ] `GetEntryWithDialectsAndDefinitions`
- [ ] Buat query file `db/queries/entry_dialects.sql`:
  - [ ] `CreateEntryDialect`
  - [ ] `GetEntryDialectsByEntryID`
- [ ] Buat query file `db/queries/definitions.sql`:
  - [ ] `CreateDefinition`
  - [ ] `GetDefinitionsByEntryDialectID`
- [ ] Buat query file `db/queries/example_sentences.sql`:
  - [ ] `CreateExampleSentence`
  - [ ] `GetSentencesByDefinitionID`
- [ ] Buat query file `db/queries/word_relations.sql`:
  - [ ] `CreateWordRelation`
  - [ ] `GetRelationsByEntryID`
  - [ ] `DeleteWordRelation`
- [ ] Buat query file `db/queries/submissions.sql`:
  - [ ] `CreateSubmission`
  - [ ] `GetSubmissionByID`
  - [ ] `GetSubmissionsByUserID`
  - [ ] `ListPendingSubmissions`
  - [ ] `UpdateSubmissionStatus`
  - [ ] `UpdateSubmissionPayload`
- [ ] Buat query file `db/queries/reports.sql`:
  - [ ] `CreateReport`
  - [ ] `ListOpenReports`
  - [ ] `UpdateReportStatus`
- [ ] Buat query file `db/queries/refresh_tokens.sql`:
  - [ ] `CreateRefreshToken`
  - [ ] `GetRefreshTokenByHash`
  - [ ] `RevokeRefreshToken`
  - [ ] `DeleteExpiredTokens`
- [ ] Buat query file `db/queries/notifications.sql`:
  - [ ] `CreateNotification`
  - [ ] `ListNotificationsByUserID`
  - [ ] `MarkNotificationAsRead`
  - [ ] `MarkAllNotificationsAsRead`
- [ ] Jalankan `sqlc generate` dan verifikasi kode generated

### 1.3 Domain Entity Layer

- [ ] Buat `internal/domain/entity/user.go`:
  - [ ] Struct `User` dengan semua field
  - [ ] Konstanta role: `RoleAdmin`, `RoleValidator`, `RoleContributor`
  - [ ] Method `IsAdmin()`, `IsValidator()`, `IsContributor()`
  - [ ] Method `IsSuspended()`
- [ ] Buat `internal/domain/entity/dialect.go`:
  - [ ] Struct `Dialect`
- [ ] Buat `internal/domain/entity/entry.go`:
  - [ ] Struct `Entry`
  - [ ] Struct `EntryDetail` (entry + dialects + definitions + sentences + relations)
  - [ ] Struct `PaginatedEntries`
  - [ ] Konstanta status: `StatusPublished`, `StatusArchived`
- [ ] Buat `internal/domain/entity/definition.go`:
  - [ ] Struct `Definition`
  - [ ] Struct `ExampleSentence`
- [ ] Buat `internal/domain/entity/submission.go`:
  - [ ] Struct `Submission`
  - [ ] Struct `SubmissionPayload` (JSONB payload)
  - [ ] Konstanta status: `StatusPending`, `StatusApproved`, `StatusRejected`
  - [ ] Method `NewSubmission()`
  - [ ] Method `ToEntry()` (konversi payload ke entry)
- [ ] Buat `internal/domain/entity/relation.go`:
  - [ ] Struct `WordRelation`
  - [ ] Konstanta tipe: `RelSinonim`, `RelAntonim`, `RelTurunan`, `RelBerkaitan`

### 1.4 Domain Repository Interface Layer

- [ ] Buat `internal/domain/repository/entry_repository.go`:
  - [ ] Interface `EntryRepository` sesuai contoh di section 7.4
  - [ ] Struct `EntryFilter`
- [ ] Buat `internal/domain/repository/dialect_repository.go`:
  - [ ] Interface `DialectRepository`
- [ ] Buat `internal/domain/repository/user_repository.go`:
  - [ ] Interface `UserRepository`
- [ ] Buat `internal/domain/repository/submission_repository.go`:
  - [ ] Interface `SubmissionRepository`
- [ ] Buat `internal/domain/repository/report_repository.go`:
  - [ ] Interface `ReportRepository`
- [ ] Buat `internal/domain/repository/notification_repository.go`:
  - [ ] Interface `NotificationRepository`
- [ ] Buat `internal/domain/repository/token_repository.go`:
  - [ ] Interface `TokenRepository`

### 1.5 Domain Service Interface Layer

- [ ] Buat `internal/domain/service/entry_service.go`:
  - [ ] Interface `EntryService` sesuai section 7.4
  - [ ] Struct input/output (`CreateEntryInput`, `UpdateEntryInput`, dll)
- [ ] Buat `internal/domain/service/search_service.go`:
  - [ ] Interface `SearchService`
  - [ ] Struct `SearchInput`, `SearchResult`
- [ ] Buat `internal/domain/service/submission_service.go`:
  - [ ] Interface `SubmissionService`
- [ ] Buat `internal/domain/service/auth_service.go`:
  - [ ] Interface `AuthService`

### 1.6 Package Utilities

- [ ] Buat `pkg/apperror/errors.go`:
  - [ ] Struct `AppError` dengan field `Code`, `Message`, `StatusCode`
  - [ ] Semua error variable: `ErrNotFound`, `ErrUnauthorized`, `ErrForbidden`, `ErrBadRequest`, `ErrConflict`, `ErrInternal`
- [ ] Buat `pkg/response/response.go`:
  - [ ] Struct `SuccessResponse`, `ErrorResponse`, `PaginatedResponse`
  - [ ] Helper function `Success()`, `Error()`, `Paginated()`
- [ ] Buat `pkg/validator/validator.go`:
  - [ ] Setup validator (disarankan `go-playground/validator`)
  - [ ] Custom validation rules jika perlu
- [ ] Buat `pkg/logger/logger.go`:
  - [ ] Setup zerolog dengan JSON format
  - [ ] Helper function `Info()`, `Error()`, `Debug()`
- [ ] Buat `pkg/pagination/pagination.go`:
  - [ ] Struct `Pagination`
  - [ ] Function `NewPagination()` dari query params
  - [ ] Function `GetOffset()`

---

## 🗂️ FASE 2 — Infrastructure & Repository Implementation

### 2.1 Infrastructure Layer

- [ ] Buat `internal/infrastructure/database/postgres.go`:
  - [ ] Function connect PostgreSQL via pgx
  - [ ] Connection pool configuration (max open conns, max idle conns)
  - [ ] Ping health check
- [ ] Buat `internal/infrastructure/database/redis.go`:
  - [ ] Function connect Redis via go-redis
  - [ ] Ping health check
- [ ] Buat `internal/infrastructure/search/meilisearch.go`:
  - [ ] Function connect Meilisearch client
  - [ ] Function `CreateOrUpdateIndex()` — setup index `entries`
  - [ ] Function `ConfigureIndexSettings()` — set searchable, filterable, sortable attributes sesuai section 9.5
  - [ ] Function `IndexEntry()` — tambah/update dokumen
  - [ ] Function `DeleteEntry()` — hapus dokumen
  - [ ] Function `Search()` — full-text search dengan filter
- [ ] Buat `internal/infrastructure/oauth/google.go`:
  - [ ] Setup Google OAuth2 config
  - [ ] Function `GetAuthURL()` — generate OAuth URL
  - [ ] Function `ExchangeCode()` — tukar code dengan token
  - [ ] Function `GetUserInfo()` — fetch user info dari Google API

### 2.2 Repository Implementation (PostgreSQL)

- [ ] Buat `internal/repository/postgres/user_repo.go`:
  - [ ] Implement semua method `UserRepository` interface
  - [ ] `FindByID()`, `FindByEmail()`, `FindByGoogleID()`
  - [ ] `Create()`, `UpdateRole()`, `UpdateSuspendStatus()`
  - [ ] `ListAll()` dengan pagination
- [ ] Buat `internal/repository/postgres/dialect_repo.go`:
  - [ ] Implement semua method `DialectRepository` interface
  - [ ] `FindByID()`, `FindBySlug()`, `ListActive()`, `ListAll()`
  - [ ] `Create()`, `Update()`, `ToggleActive()`
- [ ] Buat `internal/repository/postgres/entry_repo.go`:
  - [ ] Implement semua method `EntryRepository` interface
  - [ ] `FindByID()`, `FindBySlug()`, `FindPublished()` dengan filter dialek
  - [ ] `FindDetailBySlug()` — join dengan entry_dialects, definitions, sentences, relations
  - [ ] `Create()` dengan transaction (entry + entry_dialects + definitions + sentences)
  - [ ] `Update()`, `Delete()`
- [ ] Buat `internal/repository/postgres/submission_repo.go`:
  - [ ] Implement semua method `SubmissionRepository` interface
  - [ ] `Create()`, `FindByID()`, `FindByUserID()`
  - [ ] `ListPending()`, `UpdateStatus()`, `UpdatePayload()`
- [ ] Buat `internal/repository/postgres/report_repo.go`:
  - [ ] Implement semua method `ReportRepository` interface
- [ ] Buat `internal/repository/postgres/notification_repo.go`:
  - [ ] Implement semua method `NotificationRepository` interface
- [ ] Buat `internal/repository/postgres/token_repo.go`:
  - [ ] Implement semua method `TokenRepository` interface
  - [ ] `Create()`, `FindByHash()`, `Revoke()`, `DeleteExpired()`

### 2.3 Repository Implementation (Redis)

- [ ] Buat `internal/repository/redis/cache_repo.go`:
  - [ ] Interface `CacheRepository` dengan method `Get()`, `Set()`, `Delete()`, `Exists()`
  - [ ] Implement method dengan key prefix per resource type
  - [ ] TTL configuration per tipe cache
  - [ ] Cache key strategy: `entry:{slug}`, `search:{hash}`, dll

### 2.4 Unit Test — Repository Layer

- [ ] Setup test database (PostgreSQL test container atau mock)
- [ ] Test `user_repo.go` — CRUD operations
- [ ] Test `dialect_repo.go` — CRUD operations
- [ ] Test `entry_repo.go` — termasuk join query kompleks
- [ ] Test `submission_repo.go` — status transitions
- [ ] Test `cache_repo.go` — get/set/delete

---

## 🗂️ FASE 3 — Business Logic (UseCase Layer)

### 3.1 Auth UseCase

- [ ] Buat `internal/usecase/auth_usecase.go`:
  - [ ] Implement `AuthUseCase` interface
  - [ ] Method `GoogleLogin()`:
    - [ ] Generate Google OAuth URL
    - [ ] Return redirect URL
  - [ ] Method `GoogleCallback()`:
    - [ ] Exchange code dengan token Google
    - [ ] Fetch user info dari Google
    - [ ] Cek apakah user sudah ada (`FindByGoogleID`)
    - [ ] Jika baru: buat user baru dengan role `contributor`
    - [ ] Cek apakah user suspended — jika ya, return `ErrForbidden`
    - [ ] Generate JWT access token (expire 15 menit)
    - [ ] Generate refresh token (expire 7 hari)
    - [ ] Simpan hash refresh token ke database
    - [ ] Return access token + refresh token
  - [ ] Method `RefreshToken()`:
    - [ ] Validasi refresh token dari cookie
    - [ ] Cek token tidak di-revoke dan belum expired
    - [ ] Generate access token baru
    - [ ] Return access token baru
  - [ ] Method `Logout()`:
    - [ ] Revoke refresh token di database
  - [ ] Method `GetCurrentUser()`:
    - [ ] Return user info dari JWT claims

### 3.2 Entry UseCase

- [ ] Buat `internal/usecase/entry_usecase.go`:
  - [ ] Method `GetEntryDetail()`:
    - [ ] Cek cache Redis terlebih dahulu
    - [ ] Jika miss: query dari database
    - [ ] Set ke cache dengan TTL
    - [ ] Return `EntryDetail`
  - [ ] Method `ListEntries()`:
    - [ ] Query dari database dengan filter dan pagination
    - [ ] Return `PaginatedEntries`
  - [ ] Method `CreateEntry()` (dipakai oleh Admin/Validator auto-publish):
    - [ ] Validasi input
    - [ ] Generate slug dari `base_form`
    - [ ] Cek slug tidak duplikat
    - [ ] Simpan ke database dalam transaction
    - [ ] Index ke Meilisearch
    - [ ] Invalidate cache terkait
    - [ ] Return entry yang dibuat
  - [ ] Method `UpdateEntry()`:
    - [ ] Validasi akses (hanya Admin/Validator)
    - [ ] Update database
    - [ ] Update index Meilisearch
    - [ ] Invalidate cache

### 3.3 Search UseCase

- [ ] Buat `internal/usecase/search_usecase.go`:
  - [ ] Method `Search()`:
    - [ ] Parse input: `q`, `direction`, `dialect_ids`, `page`, `limit`
    - [ ] Cek cache untuk query populer
    - [ ] Arahkan ke Meilisearch dengan filter yang sesuai
    - [ ] Untuk mode `indonesia_to_manggarai`: search di field `meanings`
    - [ ] Untuk mode `manggarai_to_indonesia`: search di field `base_form`, `dialect_spellings`
    - [ ] Apply filter dialek jika ada
    - [ ] Cache hasil pencarian populer
    - [ ] Return hasil terstruktur

### 3.4 Submission UseCase

- [ ] Buat `internal/usecase/submission_usecase.go`:
  - [ ] Method `Submit()`:
    - [ ] Validasi input form submission
    - [ ] Cek user tidak suspended
    - [ ] Jika user `validator` atau `admin`:
      - [ ] Langsung buat entry (auto-publish) via `EntryUseCase.CreateEntry()`
      - [ ] Return submission dengan status `published`
    - [ ] Jika user `contributor`:
      - [ ] Simpan ke tabel `submissions` dengan status `pending`
      - [ ] Return submission dengan status `pending`
  - [ ] Method `GetMySubmissions()`:
    - [ ] Query submissions by `user_id` dengan pagination
  - [ ] Method `GetSubmissionDetail()`:
    - [ ] Validasi akses (hanya pemilik atau reviewer)
    - [ ] Return detail submission
  - [ ] Method `EditSubmission()`:
    - [ ] Validasi user adalah pemilik submission
    - [ ] Validasi status masih `pending`
    - [ ] Update payload submission
    - [ ] Return submission terupdate

### 3.5 Review UseCase

- [ ] Buat `internal/usecase/review_usecase.go`:
  - [ ] Method `GetReviewQueue()`:
    - [ ] Query semua submissions berstatus `pending`
    - [ ] Return list dengan pagination
  - [ ] Method `ApproveSubmission()`:
    - [ ] Validasi reviewer adalah Validator atau Admin
    - [ ] Parse payload submission
    - [ ] Buat entry dari payload via `EntryUseCase.CreateEntry()`
    - [ ] Update status submission menjadi `approved`
    - [ ] Set `resulting_entry_id`
    - [ ] Set `reviewed_by` dan `reviewed_at`
    - [ ] Kirim notifikasi `submission_approved` ke contributor
  - [ ] Method `RejectSubmission()`:
    - [ ] Validasi reviewer adalah Validator atau Admin
    - [ ] Validasi `review_notes` tidak kosong
    - [ ] Update status submission menjadi `rejected`
    - [ ] Set review metadata
    - [ ] Kirim notifikasi `submission_rejected` ke contributor
  - [ ] Method `ReviseAndPublish()`:
    - [ ] Validasi reviewer adalah Validator atau Admin
    - [ ] Update payload submission dengan konten baru
    - [ ] Set `was_edited = true`
    - [ ] Buat entry dari payload terevisi via `EntryUseCase.CreateEntry()`
    - [ ] Update status submission menjadi `approved`
    - [ ] Kirim notifikasi `submission_edited_then_published` ke contributor

### 3.6 Admin UseCase

- [ ] Buat `internal/usecase/admin_usecase.go`:
  - [ ] Method `ListUsers()` — list semua user dengan pagination
  - [ ] Method `ToggleValidator()` — assign/cabut role validator
  - [ ] Method `ToggleSuspend()` — suspend/unsuspend user
  - [ ] Method `ListAllDialects()` — termasuk yang nonaktif
  - [ ] Method `CreateDialect()` — tambah dialek baru
  - [ ] Method `UpdateDialect()` — edit dialek
  - [ ] Method `ToggleDialectActive()` — aktif/nonaktif dialek
  - [ ] Method `ListReports()` — laporan kosakata
  - [ ] Method `HandleReport()` — resolve/dismiss laporan
  - [ ] Method `GetAnalytics()`:
    - [ ] Query total kosakata per dialek
    - [ ] Query jumlah submission per status
    - [ ] Query top contributors
    - [ ] Query pertumbuhan kosakata per bulan

### 3.7 Notification UseCase

- [ ] Buat helper/usecase untuk notifikasi:
  - [ ] Method `SendNotification()` — buat record notifikasi
  - [ ] Method `GetMyNotifications()` — list notifikasi user
  - [ ] Method `MarkAsRead()` — tandai satu notifikasi dibaca
  - [ ] Method `MarkAllAsRead()` — tandai semua dibaca

### 3.8 Unit Test — UseCase Layer

- [ ] Test `auth_usecase.go` — login flow, refresh, logout
- [ ] Test `submission_usecase.go` — submit sebagai contributor vs validator
- [ ] Test `review_usecase.go` — approve, reject, revise flow
- [ ] Test `search_usecase.go` — dua arah pencarian, filter dialek
- [ ] Test `admin_usecase.go` — manajemen user dan dialek
- [ ] Verifikasi total test coverage business logic ≥ 70%

---

## 🗂️ FASE 4 — HTTP Delivery Layer (API)

### 4.1 Middleware

- [ ] Buat `internal/delivery/http/middleware/cors.go`:
  - [ ] Konfigurasi CORS hanya izinkan origin frontend resmi
  - [ ] Allow methods dan headers yang diperlukan
- [ ] Buat `internal/delivery/http/middleware/auth_middleware.go`:
  - [ ] Parse dan validasi JWT dari Authorization header
  - [ ] Inject user info ke Fiber context
  - [ ] Handle token expired vs invalid
- [ ] Buat `internal/delivery/http/middleware/role_middleware.go`:
  - [ ] Factory function `RequireRole(roles ...string)` → return middleware
  - [ ] Cek user role dari context
  - [ ] Return `ErrForbidden` jika role tidak mencukupi
  - [ ] Cek user tidak suspended
- [ ] Buat `internal/delivery/http/middleware/rate_limiter.go`:
  - [ ] Rate limit untuk endpoint publik
  - [ ] Rate limit lebih ketat untuk endpoint auth
  - [ ] Gunakan Redis sebagai store (distributed rate limiting)

### 4.2 Auth Handler

- [ ] Buat `internal/delivery/http/handler/auth_handler.go`:
  - [ ] `GET /auth/google` — redirect ke Google OAuth URL
  - [ ] `GET /auth/google/callback` — proses callback, set refresh token cookie (HTTP-only), return access token
  - [ ] `POST /auth/refresh` — refresh access token dari cookie
  - [ ] `POST /auth/logout` — revoke refresh token, clear cookie
  - [ ] `GET /auth/me` — return user info (protected)

### 4.3 Dictionary Handler (Public)

- [ ] Buat `internal/delivery/http/handler/entry_handler.go`:
  - [ ] `GET /entries` — list kosakata dengan pagination dan filter dialek
  - [ ] `GET /entries/:slug` — detail kosakata
  - [ ] `POST /entries/:slug/reports` — laporkan kosakata (tanpa auth)
- [ ] Buat `internal/delivery/http/handler/search_handler.go`:
  - [ ] `GET /search` — pencarian dengan parameter `q`, `direction`, `dialect_ids`, `page`, `limit`
  - [ ] Validasi parameter
  - [ ] Response dengan suggestion jika tidak ada hasil
- [ ] Buat `internal/delivery/http/handler/dialect_handler.go` (public endpoint):
  - [ ] `GET /dialects` — list semua dialek aktif

### 4.4 Contribution Handler

- [ ] Buat `internal/delivery/http/handler/submission_handler.go`:
  - [ ] `POST /submissions` — submit kosakata baru (Contributor+)
  - [ ] `GET /submissions` — list submission milik sendiri
  - [ ] `GET /submissions/:id` — detail submission
  - [ ] `PUT /submissions/:id` — edit submission pending
  - [ ] `GET /notifications` — list notifikasi
  - [ ] `PATCH /notifications/:id/read` — tandai dibaca

### 4.5 Review Handler

- [ ] Buat `internal/delivery/http/handler/review_handler.go`:
  - [ ] `GET /review/queue` — list submission pending (Validator+)
  - [ ] `GET /review/queue/:id` — detail submission
  - [ ] `POST /review/queue/:id/approve` — approve
  - [ ] `POST /review/queue/:id/reject` — reject (dengan `review_notes` wajib)
  - [ ] `PUT /review/queue/:id/revise` — revisi dan publish

### 4.6 Admin Handler

- [ ] Buat `internal/delivery/http/handler/admin_handler.go`:
  - [ ] `GET /admin/users` — list semua user
  - [ ] `PATCH /admin/users/:id/toggle-validator` — assign/cabut validator
  - [ ] `PATCH /admin/users/:id/toggle-suspend` — suspend/unsuspend
  - [ ] `GET /admin/dialects` — list semua dialek
  - [ ] `POST /admin/dialects` — tambah dialek
  - [ ] `PUT /admin/dialects/:id` — edit dialek
  - [ ] `PATCH /admin/dialects/:id/toggle-active` — toggle aktif
  - [ ] `GET /admin/reports` — list laporan
  - [ ] `PATCH /admin/reports/:id` — tindak lanjut laporan
  - [ ] `GET /admin/analytics` — data analytics

### 4.7 Router

- [ ] Buat `internal/delivery/http/router.go`:
  - [ ] Setup semua route group sesuai section 10.3
  - [ ] Apply middleware yang tepat per route group
  - [ ] Health check endpoint `GET /health`
  - [ ] Inject semua handler via dependency injection
- [ ] Setup `cmd/api/main.go`:
  - [ ] Init database connection
  - [ ] Run migrations otomatis saat startup
  - [ ] Init Redis connection
  - [ ] Init Meilisearch connection + index setup
  - [ ] Init repository implementations
  - [ ] Init use cases dengan repository injection
  - [ ] Init handlers dengan use case injection
  - [ ] Init router
  - [ ] Start Fiber server
  - [ ] Setup graceful shutdown (OS signal handler)

### 4.8 API Documentation

- [ ] Buat `docs/swagger.yaml` (OpenAPI 3.0):
  - [ ] Info dan server config
  - [ ] Security scheme (Bearer JWT)
  - [ ] Semua endpoint terdokumentasi
  - [ ] Request/response schema untuk setiap endpoint
  - [ ] Error response schema
- [ ] Serve Swagger UI via endpoint `/docs` (development mode)

### 4.9 Integration Test — API Layer

- [ ] Test Auth flow end-to-end (mock Google OAuth)
- [ ] Test Search endpoint — berbagai skenario query
- [ ] Test Submission flow — submit → pending → approve
- [ ] Test Submission flow — submit → pending → reject
- [ ] Test Submission flow — submit → pending → revise & publish
- [ ] Test Auto-publish untuk Validator dan Admin
- [ ] Test Role-based access control untuk setiap endpoint protected
- [ ] Test Rate limiting

---

## 🗂️ FASE 5 — Frontend Core

### 5.1 App Foundation

- [ ] Buat `src/app/providers.tsx`:
  - [ ] Wrap app dengan `QueryClientProvider`
  - [ ] Wrap dengan theme provider (dark mode support)
- [ ] Buat `src/app/router.tsx`:
  - [ ] Definisi semua route sesuai section 8.4
  - [ ] Setup `ProtectedRoute` component
  - [ ] Lazy loading untuk route dashboard, validator, admin
- [ ] Buat `src/app/App.tsx`:
  - [ ] Render router dengan providers
- [ ] Buat `src/lib/axios.ts`:
  - [ ] Axios instance dengan baseURL dari env
  - [ ] Request interceptor: tambah Authorization header
  - [ ] Response interceptor: handle 401 → refresh token otomatis
  - [ ] Response interceptor: handle error global
- [ ] Buat `src/types/api.types.ts`:
  - [ ] Generic `ApiResponse<T>`
  - [ ] `PaginatedResponse<T>`
  - [ ] `ApiError`
- [ ] Buat `src/shared/utils/cn.ts` — Tailwind className merger
- [ ] Buat `src/shared/utils/formatters.ts` — format tanggal, dll
- [ ] Buat `src/shared/hooks/useDebounce.ts`
- [ ] Buat `src/shared/hooks/useNotification.ts`

### 5.2 Auth Feature

- [ ] Buat `src/features/auth/store/authStore.ts` (Zustand):
  - [ ] State: `user`, `accessToken`, `isAuthenticated`, `isLoading`
  - [ ] Actions: `login()`, `logout()`, `setUser()`, `refreshToken()`
- [ ] Buat `src/features/auth/api/authApi.ts`:
  - [ ] `getMe()` — fetch current user
  - [ ] `refreshToken()` — refresh access token
  - [ ] `logout()` — logout
- [ ] Buat `src/features/auth/hooks/useAuth.ts`:
  - [ ] Expose auth state dan actions dari Zustand
  - [ ] Auto-refresh token saat expired
- [ ] Buat `src/features/auth/components/LoginButton.tsx`:
  - [ ] Button "Login dengan Google"
  - [ ] Redirect ke `GET /auth/google`
- [ ] Buat halaman `/auth/callback`:
  - [ ] Handle OAuth callback
  - [ ] Extract token dari URL params atau cookie
  - [ ] Set ke auth store
  - [ ] Redirect ke halaman sebelumnya atau dashboard
- [ ] Buat `src/shared/components/ProtectedRoute.tsx`:
  - [ ] Cek `isAuthenticated`
  - [ ] Cek role requirement
  - [ ] Redirect ke login jika tidak memenuhi

### 5.3 Layout & Shared Components

- [ ] Buat `src/shared/components/layout/Header.tsx`:
  - [ ] Logo dan nama platform
  - [ ] Search bar singkat (opsional di header)
  - [ ] Navigation link (Kamus, Dialek)
  - [ ] Auth section: Login button atau User avatar + dropdown
  - [ ] Notifikasi bell icon (jika login)
  - [ ] Dark mode toggle
- [ ] Buat `src/shared/components/layout/Footer.tsx`:
  - [ ] Copyright, link tentang, kontribusi
- [ ] Buat `src/shared/components/layout/PageLayout.tsx`:
  - [ ] Wrapper dengan Header + main content + Footer
- [ ] Buat `src/shared/components/Pagination.tsx`:
  - [ ] Komponen pagination reusable
- [ ] Buat `src/shared/components/EmptyState.tsx`:
  - [ ] Komponen untuk state kosong dengan icon dan pesan

---

## 🗂️ FASE 6 — Frontend Dictionary Feature (Public)

### 6.1 Dictionary API & Types

- [ ] Buat `src/features/dictionary/types/dictionary.types.ts`:
  - [ ] `Dialect`, `Entry`, `EntryDetail`, `Definition`, `ExampleSentence`
  - [ ] `WordRelation`, `SearchResult`
  - [ ] `SearchParams`
- [ ] Buat `src/features/dictionary/api/dictionaryApi.ts`:
  - [ ] `searchEntries(params: SearchParams)`
  - [ ] `getEntryDetail(slug: string)`
  - [ ] `listDialects()`
  - [ ] `reportEntry(slug: string, payload: ReportPayload)`

### 6.2 Dictionary Hooks

- [ ] Buat `src/features/dictionary/hooks/useSearch.ts`:
  - [ ] State: `query`, `direction`, `selectedDialects`
  - [ ] TanStack Query untuk fetch hasil pencarian
  - [ ] Debounce query input 300ms
  - [ ] Handle loading dan error state
- [ ] Buat `src/features/dictionary/hooks/useEntryDetail.ts`:
  - [ ] TanStack Query untuk fetch detail kosakata by slug
  - [ ] Handle loading, error, not found

### 6.3 Dictionary Components

- [ ] Buat `src/features/dictionary/components/SearchBar.tsx`:
  - [ ] Input field dengan debounce
  - [ ] Toggle arah pencarian (Manggarai ↔ Indonesia)
  - [ ] Dropdown filter dialek (multi-select)
  - [ ] Clear button
  - [ ] Loading indicator saat fetching
- [ ] Buat `src/features/dictionary/components/SearchResult.tsx`:
  - [ ] List hasil pencarian
  - [ ] State loading (skeleton)
  - [ ] State kosong dengan pesan informatif
  - [ ] Saran kata terdekat saat tidak ada hasil
- [ ] Buat `src/features/dictionary/components/EntryCard.tsx`:
  - [ ] Card ringkas untuk item hasil pencarian
  - [ ] Tampilkan: kata, arti ringkas, badge dialek
  - [ ] Klik → navigasi ke halaman detail
- [ ] Buat `src/features/dictionary/components/DialectBadge.tsx`:
  - [ ] Badge dengan nama dialek
  - [ ] Warna berbeda per dialek (opsional)
- [ ] Buat `src/features/dictionary/components/EntryDetail.tsx`:
  - [ ] Tampilkan semua informasi sesuai FR-02.1
  - [ ] Ejaan utama + variasi per dialek
  - [ ] Kelas kata
  - [ ] Arti per dialek dengan label dialek yang jelas
  - [ ] Catatan penggunaan
  - [ ] Daftar dialek yang memiliki kata ini
  - [ ] Handle kata yang tidak tersedia di dialek tertentu (FR-02.3)
- [ ] Buat `src/features/dictionary/components/ExampleSentences.tsx`:
  - [ ] List contoh kalimat dengan terjemahannya
- [ ] Buat `src/features/dictionary/components/RelatedWords.tsx`:
  - [ ] Chip/card per kata terkait
  - [ ] Label tipe relasi (sinonim, antonim, dll)
  - [ ] Klik → navigasi ke detail kata terkait
- [ ] Buat `src/features/dictionary/components/ReportButton.tsx`:
  - [ ] Button "Laporkan"
  - [ ] Modal form laporan:
    - [ ] Pilihan alasan (dropdown/radio)
    - [ ] Textarea deskripsi opsional
    - [ ] Submit button
    - [ ] Success/error state

### 6.4 Dictionary Pages

- [ ] Buat halaman `/` (Halaman Utama):
  - [ ] Hero section dengan `SearchBar`
  - [ ] Tampilkan hasil pencarian secara inline (tanpa page reload)
  - [ ] Instant search experience
- [ ] Buat halaman `/kata/:slug` (Detail Kosakata):
  - [ ] Render `EntryDetail`
  - [ ] SEO meta tags (title, description dari konten kata)
  - [ ] Breadcrumb navigasi
- [ ] Buat halaman `/dialek/:dialect` (Browse per Dialek):
  - [ ] List kosakata yang tersedia di dialek tersebut
  - [ ] Pagination

---

## 🗂️ FASE 7 — Frontend Contribution Feature

### 7.1 Contribution API & Types

- [ ] Buat `src/features/contribution/types/`:
  - [ ] `SubmissionPayload`, `Submission`, `SubmissionStatus`
- [ ] Buat `src/features/contribution/api/contributionApi.ts`:
  - [ ] `submitWord(payload)`
  - [ ] `getMySubmissions(page, limit)`
  - [ ] `getSubmissionDetail(id)`
  - [ ] `editSubmission(id, payload)`
  - [ ] `getNotifications()`
  - [ ] `markNotificationRead(id)`

### 7.2 Contribution Hooks

- [ ] Buat `src/features/contribution/hooks/useSubmission.ts`:
  - [ ] Submit mutation dengan TanStack Query
  - [ ] Edit mutation
  - [ ] Query untuk list submissions
  - [ ] Query untuk detail submission

### 7.3 Contribution Components

- [ ] Buat `src/features/contribution/components/SubmissionForm.tsx`:
  - [ ] Field sesuai FR-04.2:
    - [ ] Input kata (ejaan utama) — required
    - [ ] Variasi ejaan per dialek — opsional, dinamis per dialek dipilih
    - [ ] Multi-select pilihan dialek — minimal satu
    - [ ] Pilihan kelas kata (dropdown)
    - [ ] Arti dalam Bahasa Indonesia per dialek
    - [ ] Contoh kalimat per dialek (opsional)
    - [ ] Relasi kata (opsional, searchable)
    - [ ] Catatan tambahan (opsional)
  - [ ] Validasi client-side sebelum submit
  - [ ] Loading state saat submit
  - [ ] Success/error feedback
- [ ] Buat `src/features/contribution/components/SubmissionList.tsx`:
  - [ ] Tabel/list riwayat submission user
  - [ ] Badge status (pending, approved, rejected)
  - [ ] Link ke detail submission
- [ ] Buat `src/features/contribution/components/SubmissionStatus.tsx`:
  - [ ] Detail submission dengan status badge
  - [ ] Alasan penolakan jika rejected
  - [ ] Form edit jika status pending
  - [ ] Catatan jika direvisi sebelum publish

### 7.4 Dashboard Pages (Contributor)

- [ ] Buat halaman `/dashboard`:
  - [ ] Summary statistik (total submit, pending, approved, rejected)
  - [ ] Shortcut ke submit baru dan riwayat
- [ ] Buat halaman `/dashboard/submit`:
  - [ ] Render `SubmissionForm`
- [ ] Buat halaman `/dashboard/submissions`:
  - [ ] Render `SubmissionList` dengan pagination

### 7.5 Notification Component

- [ ] Buat komponen `NotificationBell` di Header:
  - [ ] Badge jumlah notifikasi belum dibaca
  - [ ] Dropdown list notifikasi terbaru
  - [ ] Klik item → navigasi ke submission terkait
  - [ ] Mark as read saat dibuka

---

## 🗂️ FASE 8 — Frontend Review Feature (Validator)

### 8.1 Review API & Hooks

- [ ] Buat `src/features/review/api/reviewApi.ts`:
  - [ ] `getReviewQueue(page, limit)`
  - [ ] `getReviewDetail(id)`
  - [ ] `approveSubmission(id)`
  - [ ] `rejectSubmission(id, notes)`
  - [ ] `reviseAndPublish(id, payload)`
- [ ] Buat `src/features/review/hooks/useReview.ts`:
  - [ ] Queries dan mutations untuk semua aksi review

### 8.2 Review Components

- [ ] Buat `src/features/review/components/ReviewQueue.tsx`:
  - [ ] Tabel submission pending
  - [ ] Info: kata, kontributor, tanggal submit
  - [ ] Link ke halaman review detail
- [ ] Buat `src/features/review/components/ReviewForm.tsx`:
  - [ ] Tampilkan data submission secara detail
  - [ ] Panel aksi review
- [ ] Buat `src/features/review/components/ReviewActions.tsx`:
  - [ ] Button Approve
  - [ ] Button Reject (dengan modal input `review_notes` wajib)
  - [ ] Button Revisi (buka form edit submission)
  - [ ] Konfirmasi sebelum setiap aksi
  - [ ] Loading state

### 8.3 Review Pages

- [ ] Buat halaman `/validator`:
  - [ ] Render `ReviewQueue`
- [ ] Buat halaman `/validator/:id`:
  - [ ] Render detail submission
  - [ ] Render `ReviewActions`

---

## 🗂️ FASE 9 — Frontend Admin Feature

### 9.1 Admin API & Hooks

- [ ] Buat `src/features/admin/api/adminApi.ts`:
  - [ ] `listUsers(page, limit)`
  - [ ] `toggleValidator(userId)`
  - [ ] `toggleSuspend(userId)`
  - [ ] `listDialects()`
  - [ ] `createDialect(payload)`
  - [ ] `updateDialect(id, payload)`
  - [ ] `toggleDialectActive(id)`
  - [ ] `listReports(page, limit)`
  - [ ] `handleReport(id, action)`
  - [ ] `getAnalytics()`
- [ ] Buat `src/features/admin/hooks/useAdmin.ts`:
  - [ ] Queries dan mutations untuk semua fungsi admin

### 9.2 Admin Components

- [ ] Buat `src/features/admin/components/UserManagement.tsx`:
  - [ ] Tabel user dengan kolom: nama, email, role, status, aksi
  - [ ] Toggle Validator dengan konfirmasi
  - [ ] Toggle Suspend dengan konfirmasi
  - [ ] Filter dan search user
- [ ] Buat `src/features/admin/components/DialectManagement.tsx`:
  - [ ] Tabel dialek dengan kolom: nama, region, status aktif, urutan
  - [ ] Form tambah dialek (modal)
  - [ ] Form edit dialek (modal)
  - [ ] Toggle aktif/nonaktif
- [ ] Buat `src/features/admin/components/ReportManagement.tsx`:
  - [ ] Tabel laporan dengan info: kata, alasan, deskripsi, status
  - [ ] Aksi: resolve (edit kata), dismiss (abaikan)
- [ ] Buat `src/features/admin/components/AnalyticsDashboard.tsx`:
  - [ ] Card statistik: total kata per dialek
  - [ ] Card: submission pending/approved/rejected
  - [ ] Tabel top contributors
  - [ ] Chart pertumbuhan kosakata per bulan

### 9.3 Admin Pages

- [ ] Buat halaman `/admin`:
  - [ ] Render `AnalyticsDashboard` ringkas + link ke sub-menu
- [ ] Buat halaman `/admin/users`:
  - [ ] Render `UserManagement`
- [ ] Buat halaman `/admin/dialects`:
  - [ ] Render `DialectManagement`
- [ ] Buat halaman `/admin/reports`:
  - [ ] Render `ReportManagement`
- [ ] Buat halaman `/admin/analytics`:
  - [ ] Render `AnalyticsDashboard` lengkap

---

## 🗂️ FASE 10 — Quality Assurance & Polish

### 10.1 Backend QA

- [ ] Pastikan semua unit test lulus
- [ ] Pastikan semua integration test lulus
- [ ] Verifikasi test coverage ≥ 70% untuk business logic layer
- [ ] Jalankan `gofmt` dan `golint` — nol error
- [ ] Audit error handling — semua path return `AppError` yang sesuai
- [ ] Audit logging — semua request & error ter-log dengan JSON format
- [ ] Verifikasi structured logging siap untuk log aggregator
- [ ] Audit security:
  - [ ] Semua input ter-validasi dan ter-sanitasi
  - [ ] CORS hanya mengizinkan origin resmi
  - [ ] Rate limiting aktif di semua endpoint publik dan auth
  - [ ] Tidak ada secret/credential di codebase
  - [ ] JWT access token 15 menit, refresh token 7 hari
  - [ ] Refresh token sebagai HTTP-only cookie
- [ ] Test graceful shutdown

### 10.2 Frontend QA

- [ ] Jalankan ESLint — nol error
- [ ] Verifikasi TypeScript strict mode — nol type error
- [ ] Test semua user flow sesuai section 11:
  - [ ] Flow 11.1: Public User — Pencarian Kosakata
  - [ ] Flow 11.2: Contributor — Submit Kosakata
  - [ ] Flow 11.3: Validator — Review Submission
  - [ ] Flow 11.4: Validator — Submit Kosakata Sendiri (auto-publish)
  - [ ] Flow 11.5: Admin — Manajemen Platform
- [ ] Test protected routes — redirect jika tidak memenuhi role
- [ ] Test responsive design (mobile, tablet, desktop)
- [ ] Test dark mode — semua komponen
- [ ] Audit accessibility (WCAG 2.1 AA):
  - [ ] Semua gambar punya alt text
  - [ ] Semua form punya label
  - [ ] Keyboard navigation berfungsi
  - [ ] Contrast ratio memenuhi standar
  - [ ] Screen reader friendly

### 10.3 Performance

- [ ] Backend — test response time pencarian (target p95 < 300ms)
- [ ] Backend — test response time API umum (target p95 < 500ms)
- [ ] Frontend — ukur First Contentful Paint (target < 1.5 detik)
- [ ] Verifikasi cache Redis berfungsi untuk pencarian populer
- [ ] Verifikasi Meilisearch fuzzy search (typo tolerance aktif)
- [ ] Optimasi query database yang lambat (tambah index jika perlu)
- [ ] Konfigurasi lazy loading untuk route-level code splitting

### 10.4 Database & Search QA

- [ ] Verifikasi skenario multi-dialek (section 9.4) berfungsi benar
- [ ] Test pencarian dua arah (Manggarai → Indonesia & sebaliknya)
- [ ] Test filter dialek pada pencarian
- [ ] Test typo tolerance pada Meilisearch
- [ ] Verifikasi index Meilisearch ter-update saat entry baru dipublish
- [ ] Test re-index Meilisearch dari PostgreSQL (disaster recovery)

---

## 🗂️ FASE 11 — Deployment

### 11.1 Pre-deployment Checklist

- [ ] Semua environment variable sudah terdefinisi di server
- [ ] SSL certificate sudah dikonfigurasi di Nginx
- [ ] File `nginx.conf` sudah benar (reverse proxy, SSL termination)
- [ ] Semua secret sudah di-rotate (tidak gunakan nilai development)
- [ ] Database backup strategy sudah dikonfigurasi (cron `pg_dump`)
- [ ] Health check endpoint `GET /health` berfungsi
- [ ] `docker-compose.yml` production sudah dicek

### 11.2 Deployment

- [ ] Pull code terbaru ke server
- [ ] Build Docker images: `docker-compose build`
- [ ] Jalankan database migration: `docker-compose run backend ./api migrate up`
- [ ] Jalankan seeder untuk data awal (dialek + admin user): `docker-compose run backend ./api seed`
- [ ] Start semua service: `docker-compose up -d`
- [ ] Verifikasi semua container berjalan: `docker-compose ps`
- [ ] Cek logs untuk error: `docker-compose logs -f backend`
- [ ] Test health check endpoint dari luar
- [ ] Test pencarian dari browser (end-to-end smoke test)
- [ ] Test login Google SSO di production
- [ ] Test submit kosakata sebagai Contributor
- [ ] Test review dan approve submission
- [ ] Setup cron job untuk `pg_dump` backup harian
- [ ] Setup monitoring/alerting (opsional: UptimeRobot atau sejenisnya)

### 11.3 Post-deployment

- [ ] Verifikasi target uptime monitoring aktif
- [ ] Dokumentasikan prosedur rollback
- [ ] Buat runbook untuk operasi umum (restart service, re-index search, backup restore)

---

## 🗂️ FASE 12 — Fondasi Fitur Masa Depan (v2/v3 Prep)

> Fase ini dilakukan setelah v1 stabil. Hanya menyiapkan fondasi database dan API placeholder, belum diaktifkan di UI publik.

### 12.1 Phrase Book — Database Foundation (F-15)

- [ ] Buat migration `sentence_categories`:
  - [ ] Tabel `sentence_categories` (id, name, slug, description, sort_order)
- [ ] Buat migration `phrase_book`:
  - [ ] Tabel `phrase_book_entries` (id, category_id, dialect_id, source_sentence, translated_sentence, created_by, created_at)
  - [ ] Index pada `category_id`, `dialect_id`
- [ ] Buat query sqlc untuk `phrase_book_entries`
- [ ] Buat repository interface dan implementation (belum diexpose di API publik)
- [ ] Seed data kategori awal (salam, arah, angka, perkenalan, dll)

### 12.2 Parallel Corpus — Database Foundation (F-16)

- [ ] Buat migration `parallel_corpus`:
  - [ ] Tabel `corpus_sentences` (id, source_text, translated_text, dialect_id, source_lang, verified, created_by, created_at)
  - [ ] Index pada `dialect_id`, `verified`
- [ ] Buat query sqlc untuk `corpus_sentences`
- [ ] Buat repository interface dan implementation (belum diexpose di API publik)

### 12.3 Dokumentasi Roadmap

- [ ] Dokumentasikan struktur tabel Phrase Book dan Parallel Corpus
- [ ] Dokumentasikan rencana API endpoint untuk v2 dan v3
- [ ] Update `README.md` dengan roadmap fitur

---

## 📊 Ringkasan Progress

| Fase | Nama | Status | Estimasi |
|------|------|--------|----------|
| 0 | Project Setup & Infrastruktur | `[ ]` | 2–3 hari |
| 1 | Database & Domain Layer | `[ ]` | 3–5 hari |
| 2 | Infrastructure & Repository | `[ ]` | 3–4 hari |
| 3 | Business Logic (UseCase) | `[ ]` | 4–6 hari |
| 4 | HTTP Delivery Layer (API) | `[ ]` | 3–5 hari |
| 5 | Frontend Core | `[ ]` | 2–3 hari |
| 6 | Frontend Dictionary Feature | `[ ]` | 3–4 hari |
| 7 | Frontend Contribution Feature | `[ ]` | 3–4 hari |
| 8 | Frontend Review Feature | `[ ]` | 2–3 hari |
| 9 | Frontend Admin Feature | `[ ]` | 3–4 hari |
| 10 | QA & Polish | `[ ]` | 3–5 hari |
| 11 | Deployment | `[ ]` | 1–2 hari |
| 12 | Fondasi Fitur v2/v3 | `[ ]` | 2–3 hari |

> **Total estimasi**: ~34–51 hari kerja (1–2 developer)

---

*Checklist ini bersifat living document. Sesuaikan dengan kondisi tim dan temuan selama implementasi.*