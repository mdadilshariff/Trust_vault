-- =============================================================================
-- TrustVault: Supabase PostgreSQL Schema & Initial Seed
-- Run this script in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- =============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create Enums
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'userrole') THEN
        CREATE TYPE userrole AS ENUM ('admin', 'user');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'permissionlevel') THEN
        CREATE TYPE permissionlevel AS ENUM ('read', 'edit');
    END IF;
END $$;

-- 3. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(64) NOT NULL UNIQUE,
    hashed_password VARCHAR(512) NOT NULL,
    full_name VARCHAR(128) NOT NULL,
    role userrole NOT NULL DEFAULT 'user',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_users_email ON users (email);
CREATE INDEX IF NOT EXISTS ix_users_username ON users (username);

-- 4. Documents Table
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(64),
    original_filename VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(255) NOT NULL UNIQUE,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(128) NOT NULL,
    file_extension VARCHAR(16) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_documents_owner_id ON documents (owner_id);
CREATE INDEX IF NOT EXISTS ix_documents_category ON documents (category);
CREATE INDEX IF NOT EXISTS ix_documents_owner_created ON documents (owner_id, created_at);

-- 5. Document Permissions Table
CREATE TABLE IF NOT EXISTS document_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission permissionlevel NOT NULL,
    granted_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_document_user_perm UNIQUE (document_id, user_id)
);

CREATE INDEX IF NOT EXISTS ix_permissions_doc ON document_permissions (document_id);
CREATE INDEX IF NOT EXISTS ix_permissions_user ON document_permissions (user_id);

-- 6. Append-Only Cryptographic Audit Events Table
CREATE TABLE IF NOT EXISTS audit_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sequence BIGSERIAL NOT NULL,
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_email VARCHAR(255),
    action VARCHAR(64) NOT NULL,
    resource_type VARCHAR(64),
    resource_id VARCHAR(36),
    outcome VARCHAR(16) NOT NULL,
    metadata_json TEXT,
    ip_address VARCHAR(45),
    prev_hash VARCHAR(64),
    event_hash VARCHAR(64) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_audit_sequence ON audit_events (sequence);
CREATE INDEX IF NOT EXISTS ix_audit_timestamp ON audit_events (timestamp);
CREATE INDEX IF NOT EXISTS ix_audit_actor ON audit_events (actor_id);
CREATE INDEX IF NOT EXISTS ix_audit_action ON audit_events (action);

-- 7. Seed Initial Demo Accounts (with verified Argon2id hashes)
-- Passwords:
-- Admin: Admin1234!
-- Alice: Alice1234!
-- Bob:   Bob12345!

INSERT INTO users (id, email, username, full_name, hashed_password, role, is_active)
VALUES 
    (
        'a0000000-0000-0000-0000-000000000001',
        'admin@trustvault.dev',
        'admin',
        'Admin User',
        '$argon2id$v=19$m=65536,t=3,p=4$Rm3A706RCAPKXHdDd0oRGg$XDW7j6G0oCWzPtv82sTLCvRS6+9aHXDRqIXd3ykGhk8',
        'admin',
        TRUE
    ),
    (
        'a0000000-0000-0000-0000-000000000002',
        'alice@trustvault.dev',
        'alice',
        'Alice Owner',
        '$argon2id$v=19$m=65536,t=3,p=4$TED3+jHUGwr0QKMsOhgB0w$Qcp2jtUfdTVruu/11ILAT8ZSkrWaaxHWqoPJlVIPk88',
        'user',
        TRUE
    ),
    (
        'a0000000-0000-0000-0000-000000000003',
        'bob@trustvault.dev',
        'bob',
        'Bob Viewer',
        '$argon2id$v=19$m=65536,t=3,p=4$DBtp1xppanxvzZv/AQhOBQ$pB3WAnwgYR5XKI2MWaCrwh6eYMm5KH5yA1NSM8K3/Z8',
        'user',
        TRUE
    )
ON CONFLICT (email) DO NOTHING;
