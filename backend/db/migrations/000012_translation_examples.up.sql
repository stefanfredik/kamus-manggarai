-- Example sentences attached to a translation (a meaning pairing). Each example
-- is a bilingual pair: the Manggarai sentence and its Indonesian rendering.
CREATE TABLE translation_examples (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    translation_id  UUID NOT NULL REFERENCES translations(id) ON DELETE CASCADE,
    manggarai       TEXT NOT NULL,
    indonesian      TEXT NOT NULL,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_translation_examples_translation_id ON translation_examples(translation_id);
