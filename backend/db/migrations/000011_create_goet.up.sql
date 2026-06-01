-- Goet: Manggarai proverbs / figurative sayings that carry advice or meaning.
-- Public read-only content, managed by admins.
CREATE TABLE goet (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manggarai    TEXT NOT NULL,
    meaning      TEXT NOT NULL,
    created_by   UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_goet_created_at ON goet(created_at DESC);
CREATE INDEX idx_goet_manggarai_lower ON goet (LOWER(manggarai));
