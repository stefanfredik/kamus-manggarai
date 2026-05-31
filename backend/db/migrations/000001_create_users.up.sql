CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    google_id     VARCHAR(255),
    email         VARCHAR(255) UNIQUE NOT NULL,
    name          VARCHAR(255) NOT NULL,
    avatar_url    TEXT,
    password_hash VARCHAR(255),
    role          VARCHAR(20) NOT NULL DEFAULT 'contributor'
                  CHECK (role IN ('admin', 'validator', 'contributor')),
    is_suspended  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE UNIQUE INDEX users_google_id_unique_idx ON users (google_id) WHERE google_id IS NOT NULL;
CREATE INDEX idx_users_role ON users(role);
