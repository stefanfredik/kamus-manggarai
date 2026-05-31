CREATE TABLE derived_words (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id    UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
    word        VARCHAR(255) NOT NULL,
    translation TEXT NOT NULL,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_derived_words_entry_id ON derived_words(entry_id);
