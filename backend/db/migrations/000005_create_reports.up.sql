CREATE TABLE reports (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id        UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
    reported_by     UUID REFERENCES users(id),
    reason          VARCHAR(50) NOT NULL
                    CHECK (reason IN ('ejaan_salah', 'arti_tidak_tepat',
                                      'contoh_salah', 'konten_tidak_pantas', 'lainnya')),
    description     TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open', 'resolved', 'dismissed')),
    resolved_by     UUID REFERENCES users(id),
    resolved_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reports_entry_id ON reports(entry_id);
CREATE INDEX idx_reports_status ON reports(status);
