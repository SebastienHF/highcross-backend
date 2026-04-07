-- Adviser workspace database schema
-- Run once against your Supabase project to initialise tables.

CREATE TABLE IF NOT EXISTS users (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email         TEXT        NOT NULL UNIQUE,
    password_hash TEXT        NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clients (
    id            TEXT        PRIMARY KEY,
    name          TEXT        NOT NULL,
    initials      TEXT        NOT NULL,
    fact_find     JSONB       NOT NULL DEFAULT '{}',
    soft_knowledge TEXT       NOT NULL DEFAULT '',
    open_items    JSONB       NOT NULL DEFAULT '[]',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recommendations (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id    TEXT        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    type         TEXT        NOT NULL,
    summary      TEXT        NOT NULL DEFAULT '',
    confirmed_at TIMESTAMPTZ NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS artifacts (
    id              TEXT        PRIMARY KEY,
    client_id       TEXT        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    type            TEXT        NOT NULL,
    content         TEXT        NOT NULL DEFAULT '',
    structured_data JSONB,
    confirmed       BOOLEAN     NOT NULL DEFAULT FALSE,
    confirmed_at    TIMESTAMPTZ,
    saved_to_file   BOOLEAN     NOT NULL DEFAULT FALSE,
    saved_to_file_at TIMESTAMPTZ,
    version         INTEGER     NOT NULL DEFAULT 1,
    supersedes      TEXT        REFERENCES artifacts(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id  TEXT        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    role       TEXT        NOT NULL CHECK (role IN ('user', 'assistant')),
    content    TEXT        NOT NULL DEFAULT '',
    artifacts  JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recommendations_client ON recommendations(client_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_client       ON artifacts(client_id);
CREATE INDEX IF NOT EXISTS idx_messages_client        ON messages(client_id, created_at DESC);
