package postgres

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/kamus-manggarai/backend/internal/usecase"
)

type analyticsDB struct {
	db *pgxpool.Pool
}

func NewAnalyticsDB(db *pgxpool.Pool) usecase.AnalyticsDB {
	return &analyticsDB{db: db}
}

func (a *analyticsDB) LoadAnalytics(ctx context.Context) (*usecase.Analytics, error) {
	out := &usecase.Analytics{
		SubmissionsByStatus: map[string]int64{},
	}

	if err := a.db.QueryRow(ctx, `SELECT COUNT(*) FROM entries WHERE status = 'published'`).Scan(&out.TotalEntries); err != nil {
		return nil, err
	}

	statusRows, err := a.db.Query(ctx, `SELECT status, COUNT(*) FROM submissions GROUP BY status`)
	if err != nil {
		return nil, err
	}
	for statusRows.Next() {
		var st string
		var c int64
		if err := statusRows.Scan(&st, &c); err != nil {
			statusRows.Close()
			return nil, err
		}
		out.SubmissionsByStatus[st] = c
	}
	statusRows.Close()

	contribRows, err := a.db.Query(ctx, `
		SELECT u.id, u.name, COUNT(e.id) AS total
		FROM users u
		JOIN entries e ON e.created_by = u.id AND e.status = 'published'
		GROUP BY u.id, u.name
		ORDER BY total DESC
		LIMIT 10`)
	if err != nil {
		return nil, err
	}
	for contribRows.Next() {
		c := usecase.ContributorRow{}
		if err := contribRows.Scan(&c.UserID, &c.Name, &c.Total); err != nil {
			contribRows.Close()
			return nil, err
		}
		out.TopContributors = append(out.TopContributors, c)
	}
	contribRows.Close()

	growthRows, err := a.db.Query(ctx, `
		SELECT TO_CHAR(date_trunc('month', created_at), 'YYYY-MM') AS month, COUNT(*) AS total
		FROM entries
		WHERE status = 'published' AND created_at >= NOW() - INTERVAL '12 months'
		GROUP BY month
		ORDER BY month ASC`)
	if err != nil {
		return nil, err
	}
	for growthRows.Next() {
		m := usecase.MonthlyCount{}
		if err := growthRows.Scan(&m.Month, &m.Total); err != nil {
			growthRows.Close()
			return nil, err
		}
		out.GrowthByMonth = append(out.GrowthByMonth, m)
	}
	growthRows.Close()

	return out, nil
}
