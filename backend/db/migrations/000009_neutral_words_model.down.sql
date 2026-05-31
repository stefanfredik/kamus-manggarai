-- Reconstruct the entries + senses model from words + translations.

CREATE TABLE entries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manggarai       TEXT NOT NULL,
    slug            VARCHAR(300) UNIQUE NOT NULL,
    homonym_number  INTEGER,
    source          TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'published'
                    CHECK (status IN ('published', 'archived')),
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE senses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id        UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
    indonesian      VARCHAR(255) NOT NULL,
    part_of_speech  VARCHAR(50),
    notes           TEXT,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Each Manggarai word becomes an entry (reusing its id to keep FKs intact).
INSERT INTO entries (id, manggarai, slug, homonym_number, source, status, created_by, created_at, updated_at)
SELECT
    w.id, w.lemma,
    left(w.slug, 300),
    w.homonym_number,
    (SELECT t.source FROM translations t WHERE t.mgr_word_id = w.id AND t.source IS NOT NULL LIMIT 1),
    w.status, w.created_by, w.created_at, w.updated_at
FROM words w
WHERE w.language = 'mgr';

-- Each translation becomes a sense on the Manggarai entry.
INSERT INTO senses (entry_id, indonesian, part_of_speech, notes, sort_order, created_at)
SELECT
    t.mgr_word_id,
    idw.lemma,
    idw.part_of_speech,
    t.notes,
    row_number() OVER (PARTITION BY t.mgr_word_id ORDER BY t.created_at ASC) - 1,
    t.created_at
FROM translations t
JOIN words idw ON idw.id = t.id_word_id AND idw.language = 'id';

-- Re-point dependent tables back to entries.
ALTER TABLE derived_words DROP CONSTRAINT IF EXISTS derived_words_word_id_fkey;
DROP INDEX IF EXISTS idx_derived_words_word_id;
-- Drop derived words whose word is not a Manggarai entry (orphans under the old model).
DELETE FROM derived_words dw WHERE NOT EXISTS (SELECT 1 FROM entries e WHERE e.id = dw.word_id);
ALTER TABLE derived_words RENAME COLUMN word_id TO entry_id;
ALTER TABLE derived_words ADD CONSTRAINT derived_words_entry_id_fkey
    FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE;
CREATE INDEX idx_derived_words_entry_id ON derived_words(entry_id);

ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_entry_id_fkey;
DELETE FROM reports r WHERE NOT EXISTS (SELECT 1 FROM entries e WHERE e.id = r.entry_id);
ALTER TABLE reports ADD CONSTRAINT reports_entry_id_fkey
    FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE;

ALTER TABLE submissions DROP CONSTRAINT IF EXISTS submissions_resulting_entry_id_fkey;
UPDATE submissions SET resulting_entry_id = NULL
WHERE resulting_entry_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM entries e WHERE e.id = submissions.resulting_entry_id);
ALTER TABLE submissions ADD CONSTRAINT submissions_resulting_entry_id_fkey
    FOREIGN KEY (resulting_entry_id) REFERENCES entries(id) ON DELETE SET NULL;

DROP TABLE translations;
DROP TABLE words;

-- Recreate the indexes that the entries/senses model expects.
CREATE INDEX idx_entries_status ON entries(status);
CREATE INDEX idx_entries_created_by ON entries(created_by);
CREATE INDEX idx_senses_entry_id ON senses(entry_id);
CREATE INDEX idx_senses_indonesian_lower ON senses (LOWER(indonesian));
CREATE INDEX idx_entries_manggarai_trgm ON entries
    USING gin (immutable_unaccent(lower(manggarai)) gin_trgm_ops);
CREATE INDEX idx_senses_indonesian_trgm ON senses
    USING gin (immutable_unaccent(lower(indonesian)) gin_trgm_ops);
