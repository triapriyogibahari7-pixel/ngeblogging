-- Ngeblogging platform foundation. STAGING ONLY; not an auth-provider cutover.
-- No passwords, sessions, payment credentials or production customer data seeded.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL COLLATE NOCASE UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','active','suspended')),
  email_verified_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '' CHECK(length(display_name)<=120),
  bio TEXT NOT NULL DEFAULT '' CHECK(length(bio)<=2000),
  occupation TEXT NOT NULL DEFAULT '' CHECK(length(occupation)<=120),
  organization TEXT NOT NULL DEFAULT '' CHECK(length(organization)<=160),
  public_location TEXT NOT NULL DEFAULT '' CHECK(length(public_location)<=160),
  website TEXT NOT NULL DEFAULT '',
  avatar_object_key TEXT,
  locale TEXT NOT NULL DEFAULT 'id-ID',
  timezone TEXT NOT NULL DEFAULT 'Asia/Jakarta',
  is_public INTEGER NOT NULL DEFAULT 0 CHECK(is_public IN (0,1)),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS profile_links (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK(provider IN
    ('website','instagram','facebook','x','tiktok','youtube','linkedin','github','threads','mastodon')),
  url TEXT NOT NULL CHECK(length(url)<=2048 AND url LIKE 'https://%'),
  PRIMARY KEY(user_id,provider)
);
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
  tier TEXT NOT NULL DEFAULT 'free' CHECK(tier IN ('free','pro','max')),
  max_sites INTEGER NOT NULL DEFAULT 12 CHECK(max_sites>=12),
  max_articles INTEGER NOT NULL DEFAULT 5000 CHECK(max_articles>=5000),
  -- Uploads stay disabled until a byte budget is deliberately configured.
  storage_budget_bytes INTEGER NOT NULL DEFAULT 0 CHECK(storage_budget_bytes>=0),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS sites (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  slug TEXT NOT NULL COLLATE NOCASE UNIQUE CHECK(length(slug) BETWEEN 3 AND 63),
  name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 160),
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','active','suspended')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(id,account_id)
);
CREATE INDEX IF NOT EXISTS sites_account_idx ON sites(account_id);
CREATE TABLE IF NOT EXISTS site_memberships (
  site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK(role IN ('admin','editor','reader')),
  PRIMARY KEY(site_id,user_id)
);
CREATE TABLE IF NOT EXISTS contents (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  site_id TEXT NOT NULL,
  author_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  kind TEXT NOT NULL CHECK(kind IN ('article','page')),
  slug TEXT NOT NULL CHECK(length(slug) BETWEEN 1 AND 180),
  title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 240),
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','archived')),
  body_object_key TEXT,
  body_sha256 TEXT,
  body_bytes INTEGER NOT NULL DEFAULT 0 CHECK(body_bytes>=0),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY(site_id,account_id) REFERENCES sites(id,account_id) ON DELETE CASCADE,
  UNIQUE(site_id,slug)
);
CREATE INDEX IF NOT EXISTS contents_quota_idx ON contents(account_id,kind);
CREATE INDEX IF NOT EXISTS contents_site_feed_idx ON contents(site_id,status,created_at);
CREATE TABLE IF NOT EXISTS media_assets (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  site_id TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  content_type TEXT NOT NULL,
  bytes INTEGER NOT NULL CHECK(bytes>=0),
  sha256 TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','quarantined','ready','deleted')),
  FOREIGN KEY(site_id,account_id) REFERENCES sites(id,account_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS site_domains (
  hostname TEXT PRIMARY KEY COLLATE NOCASE,
  account_id TEXT NOT NULL,
  site_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK(status IN ('draft','ownership_pending','dns_pending','tls_pending','routing_pending','active','failed')),
  verification_token_hash TEXT,
  provider_id TEXT,
  checked_at TEXT,
  last_error TEXT,
  FOREIGN KEY(site_id,account_id) REFERENCES sites(id,account_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS adsense_settings (
  site_id TEXT PRIMARY KEY REFERENCES sites(id) ON DELETE CASCADE,
  publisher_id TEXT NOT NULL,
  auto_ads INTEGER NOT NULL DEFAULT 0 CHECK(auto_ads IN (0,1)),
  review_status TEXT NOT NULL DEFAULT 'not_submitted'
    CHECK(review_status IN ('not_submitted','pending','approved','rejected')),
  CHECK(length(publisher_id)=23 AND substr(publisher_id,1,7)='ca-pub-'
    AND substr(publisher_id,8) NOT GLOB '*[^0-9]*')
);
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  prefix TEXT NOT NULL,
  secret_hash TEXT NOT NULL UNIQUE,
  scopes_json TEXT NOT NULL CHECK(json_valid(scopes_json)),
  expires_at TEXT,
  revoked_at TEXT
);
CREATE TABLE IF NOT EXISTS payment_orders (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  provider TEXT NOT NULL DEFAULT 'midtrans' CHECK(provider='midtrans'),
  environment TEXT NOT NULL CHECK(environment IN ('sandbox','production')),
  sku TEXT NOT NULL,
  amount_idr INTEGER NOT NULL CHECK(amount_idr>0),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK(status IN ('pending','paid','expired','cancelled','failed','refunded','chargeback')),
  idempotency_key TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(account_id,idempotency_key)
);
CREATE TABLE IF NOT EXISTS payment_events (
  provider_event_id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES payment_orders(id) ON DELETE RESTRICT,
  payload_hash TEXT NOT NULL,
  verified_at TEXT NOT NULL,
  processed_at TEXT
);
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  order_id TEXT NOT NULL UNIQUE REFERENCES payment_orders(id) ON DELETE RESTRICT,
  tier TEXT NOT NULL CHECK(tier IN ('pro','max')),
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('active','expired','revoked'))
);
CREATE TABLE IF NOT EXISTS security_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  request_id TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS notification_outbox (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template TEXT NOT NULL,
  deduplication_key TEXT NOT NULL UNIQUE,
  payload_json TEXT NOT NULL CHECK(json_valid(payload_json)),
  status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','sent','failed','suppressed')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts>=0),
  sent_at TEXT
);
CREATE TABLE IF NOT EXISTS migration_checkpoints (
  job_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  target_id TEXT,
  source_checksum TEXT NOT NULL,
  target_checksum TEXT,
  status TEXT NOT NULL CHECK(status IN ('pending','copied','verified','failed')),
  PRIMARY KEY(job_id,entity_type,source_id)
);

-- Counts are indexed and enforced in the same SQL statement as the insert.
-- All statuses count, preventing archive/unarchive quota bypass.
CREATE TRIGGER IF NOT EXISTS sites_quota_before_insert BEFORE INSERT ON sites
BEGIN
  SELECT RAISE(ABORT,'SITE_QUOTA_EXCEEDED')
  WHERE (SELECT COUNT(*) FROM sites WHERE account_id=NEW.account_id)
    >= (SELECT max_sites FROM accounts WHERE id=NEW.account_id);
END;
CREATE TRIGGER IF NOT EXISTS contents_quota_before_insert BEFORE INSERT ON contents
WHEN NEW.kind='article'
BEGIN
  SELECT RAISE(ABORT,'ARTICLE_QUOTA_EXCEEDED')
  WHERE (SELECT COUNT(*) FROM contents WHERE account_id=NEW.account_id AND kind='article')
    >= (SELECT max_articles FROM accounts WHERE id=NEW.account_id);
END;
CREATE TRIGGER IF NOT EXISTS contents_quota_before_kind_update BEFORE UPDATE OF kind ON contents
WHEN NEW.kind='article' AND OLD.kind!='article'
BEGIN
  SELECT RAISE(ABORT,'ARTICLE_QUOTA_EXCEEDED')
  WHERE (SELECT COUNT(*) FROM contents WHERE account_id=NEW.account_id AND kind='article')
    >= (SELECT max_articles FROM accounts WHERE id=NEW.account_id);
END;
CREATE TRIGGER IF NOT EXISTS sites_account_immutable BEFORE UPDATE OF account_id ON sites
WHEN NEW.account_id!=OLD.account_id
BEGIN
  SELECT RAISE(ABORT,'ACCOUNT_TRANSFER_REQUIRES_MIGRATION');
END;
CREATE TRIGGER IF NOT EXISTS contents_tenant_immutable BEFORE UPDATE OF account_id,site_id ON contents
WHEN NEW.account_id!=OLD.account_id OR NEW.site_id!=OLD.site_id
BEGIN
  SELECT RAISE(ABORT,'CONTENT_TRANSFER_REQUIRES_MIGRATION');
END;

INSERT OR IGNORE INTO schema_migrations(version) VALUES('0001_platform');
