-- Neutral bidirectional model: a "word" exists in either language, and
-- "translations" link an Indonesian word to a Manggarai word (many-to-many).
-- This replaces the headword-Manggarai-centric entries+senses model.

CREATE TABLE words (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    language        VARCHAR(3) NOT NULL CHECK (language IN ('id', 'mgr')),
    lemma           TEXT NOT NULL,
    slug            VARCHAR(320) UNIQUE NOT NULL,
    homonym_number  INTEGER,
    part_of_speech  VARCHAR(50),
    status          VARCHAR(20) NOT NULL DEFAULT 'published'
                    CHECK (status IN ('published', 'archived')),
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE translations (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_word_id   UUID NOT NULL REFERENCES words(id) ON DELETE CASCADE,
    mgr_word_id  UUID NOT NULL REFERENCES words(id) ON DELETE CASCADE,
    notes        TEXT,
    source       TEXT,
    created_by   UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (id_word_id, mgr_word_id)
);

-- ---- Backfill from entries + senses ----
-- Manggarai words reuse the existing entry id so reports/submissions FKs that
-- point at entry ids remain valid after we re-point them at words.
CREATE TEMP TABLE tmp_words AS
SELECT
    e.id                                            AS id,
    'mgr'::varchar                                  AS language,
    e.manggarai                                     AS lemma,
    e.homonym_number                                AS homonym_number,
    NULL::varchar                                   AS part_of_speech,
    e.status                                        AS status,
    e.created_by                                    AS created_by,
    e.created_at                                    AS created_at,
    e.updated_at                                    AS updated_at,
    NULLIF(trim(both '-' from regexp_replace(lower(immutable_unaccent(e.manggarai)), '[^a-z0-9]+', '-', 'g')), '') AS base_slug
FROM entries e
UNION ALL
SELECT
    gen_random_uuid(),
    'id'::varchar,
    idw.lemma,
    NULL::integer,
    idw.part_of_speech,
    'published'::varchar,
    NULL::uuid,
    NOW(),
    NOW(),
    NULLIF(trim(both '-' from regexp_replace(lower(immutable_unaccent(idw.lemma)), '[^a-z0-9]+', '-', 'g')), '')
FROM (
    SELECT
        (array_agg(s.indonesian ORDER BY s.sort_order ASC, s.created_at ASC))[1] AS lemma,
        (array_agg(s.part_of_speech) FILTER (WHERE s.part_of_speech IS NOT NULL))[1] AS part_of_speech
    FROM senses s
    GROUP BY lower(s.indonesian)
) idw;

-- Assign globally-unique slugs, de-duplicating collisions with a numeric suffix.
INSERT INTO words (id, language, lemma, slug, homonym_number, part_of_speech, status, created_by, created_at, updated_at)
SELECT
    id, language, lemma,
    COALESCE(base_slug, 'kata') || CASE WHEN rn = 1 THEN '' ELSE '-' || rn END,
    homonym_number, part_of_speech, status, created_by, created_at, updated_at
FROM (
    SELECT *,
           row_number() OVER (PARTITION BY COALESCE(base_slug, 'kata') ORDER BY language DESC, lemma ASC, id ASC) AS rn
    FROM tmp_words
) x;

-- Build translation links from each sense (Indonesian word <-> entry's Manggarai word).
INSERT INTO translations (id_word_id, mgr_word_id, notes, source, created_by, created_at)
SELECT w.id, s.entry_id, s.notes, e.source, e.created_by, s.created_at
FROM senses s
JOIN entries e ON e.id = s.entry_id
JOIN words w ON w.language = 'id' AND lower(w.lemma) = lower(s.indonesian)
ON CONFLICT (id_word_id, mgr_word_id) DO NOTHING;

-- ---- Re-point dependent tables from entries to words ----
ALTER TABLE derived_words DROP CONSTRAINT IF EXISTS derived_words_entry_id_fkey;
DROP INDEX IF EXISTS idx_derived_words_entry_id;
ALTER TABLE derived_words RENAME COLUMN entry_id TO word_id;
ALTER TABLE derived_words ADD CONSTRAINT derived_words_word_id_fkey
    FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE;
CREATE INDEX idx_derived_words_word_id ON derived_words(word_id);

ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_entry_id_fkey;
ALTER TABLE reports ADD CONSTRAINT reports_entry_id_fkey
    FOREIGN KEY (entry_id) REFERENCES words(id) ON DELETE CASCADE;

ALTER TABLE submissions DROP CONSTRAINT IF EXISTS submissions_resulting_entry_id_fkey;
ALTER TABLE submissions ADD CONSTRAINT submissions_resulting_entry_id_fkey
    FOREIGN KEY (resulting_entry_id) REFERENCES words(id) ON DELETE SET NULL;

-- ---- Drop the old denormalized tables ----
DROP TABLE senses;
DROP TABLE entries;

-- ---- Indexes for the new model ----
CREATE INDEX idx_words_language ON words(language);
CREATE INDEX idx_words_status ON words(status);
CREATE INDEX idx_words_created_by ON words(created_by);
CREATE INDEX idx_words_lemma_lower ON words (language, LOWER(lemma));
CREATE INDEX idx_words_lemma_trgm ON words
    USING gin (immutable_unaccent(lower(lemma)) gin_trgm_ops);
CREATE INDEX idx_translations_id_word ON translations(id_word_id);
CREATE INDEX idx_translations_mgr_word ON translations(mgr_word_id);
