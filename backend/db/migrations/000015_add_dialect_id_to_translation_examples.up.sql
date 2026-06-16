ALTER TABLE translation_examples ADD COLUMN dialect_id UUID REFERENCES dialects(id) ON DELETE SET NULL;
