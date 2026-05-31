-- Restore the denormalized columns on entries.
ALTER TABLE entries ADD COLUMN indonesian VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE entries ADD COLUMN part_of_speech VARCHAR(50);
ALTER TABLE entries ADD COLUMN notes TEXT;

-- Collapse senses back into the single-translation columns, keeping the first sense.
UPDATE entries e
SET indonesian = s.indonesian,
    part_of_speech = s.part_of_speech,
    notes = s.notes
FROM (
    SELECT DISTINCT ON (entry_id) entry_id, indonesian, part_of_speech, notes
    FROM senses
    ORDER BY entry_id, sort_order ASC, created_at ASC
) s
WHERE s.entry_id = e.id;

ALTER TABLE entries ALTER COLUMN indonesian DROP DEFAULT;

-- Recreate the indexes that existed before this migration.
CREATE INDEX idx_entries_indonesian_lower ON entries (LOWER(indonesian));
CREATE INDEX idx_entries_indonesian_trgm ON entries
    USING gin (immutable_unaccent(lower(indonesian)) gin_trgm_ops);

DROP TABLE senses;
