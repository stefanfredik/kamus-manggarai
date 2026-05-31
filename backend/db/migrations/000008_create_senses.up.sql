-- Normalize translations: an entry (Manggarai headword) can have many senses
-- (meanings), each with its own Indonesian translation, part of speech, and notes.

CREATE TABLE senses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id        UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
    indonesian      VARCHAR(255) NOT NULL,
    part_of_speech  VARCHAR(50),
    notes           TEXT,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_senses_entry_id ON senses(entry_id);
CREATE INDEX idx_senses_indonesian_lower ON senses (LOWER(indonesian));

-- Backfill: turn each existing entry's single translation into its first sense.
INSERT INTO senses (entry_id, indonesian, part_of_speech, notes, sort_order)
SELECT id, indonesian, part_of_speech, notes, 0
FROM entries;

-- Trigram index for typo-tolerant, accent-insensitive search on the Indonesian side.
CREATE INDEX idx_senses_indonesian_trgm ON senses
    USING gin (immutable_unaccent(lower(indonesian)) gin_trgm_ops);

-- The translation data now lives in senses; drop the denormalized columns.
DROP INDEX IF EXISTS idx_entries_indonesian_trgm;
DROP INDEX IF EXISTS idx_entries_indonesian_lower;

ALTER TABLE entries DROP COLUMN indonesian;
ALTER TABLE entries DROP COLUMN part_of_speech;
ALTER TABLE entries DROP COLUMN notes;
