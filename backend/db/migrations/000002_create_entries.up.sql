CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- IMMUTABLE wrapper so unaccent can be used in functional indexes
CREATE OR REPLACE FUNCTION immutable_unaccent(text) RETURNS text
    LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
    SET search_path = public, pg_catalog AS
    $$ SELECT unaccent('unaccent', $1) $$;

CREATE TABLE entries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    indonesian      VARCHAR(255) NOT NULL,
    manggarai       TEXT NOT NULL,
    slug            VARCHAR(300) UNIQUE NOT NULL,
    homonym_number  INTEGER,
    part_of_speech  VARCHAR(50),
    notes           TEXT,
    source          TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'published'
                    CHECK (status IN ('published', 'archived')),
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_entries_status ON entries(status);
CREATE INDEX idx_entries_created_by ON entries(created_by);
CREATE INDEX idx_entries_indonesian_lower ON entries (LOWER(indonesian));

-- Trigram indexes for typo-tolerant, accent-insensitive bidirectional search
CREATE INDEX idx_entries_indonesian_trgm ON entries
    USING gin (immutable_unaccent(lower(indonesian)) gin_trgm_ops);
CREATE INDEX idx_entries_manggarai_trgm ON entries
    USING gin (immutable_unaccent(lower(manggarai)) gin_trgm_ops);
