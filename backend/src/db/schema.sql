PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'admin',
  github_login  TEXT,
  github_token  TEXT,
  github_avatar TEXT,
  created_at    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
  id               TEXT PRIMARY KEY,
  user_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  slug             TEXT UNIQUE NOT NULL,
  public_slug      TEXT,
  repo_url         TEXT NOT NULL,
  git_token        TEXT,
  branch           TEXT NOT NULL DEFAULT 'main',
  build_method     TEXT NOT NULL DEFAULT 'auto',
  framework        TEXT NOT NULL DEFAULT 'auto',
  output_dir       TEXT,
  dockerfile_path  TEXT NOT NULL DEFAULT 'Dockerfile',
  install_command  TEXT,
  build_command    TEXT,
  start_command    TEXT,
  internal_port    INTEGER NOT NULL DEFAULT 3000,
  restart_policy   TEXT NOT NULL DEFAULT 'unless-stopped',
  preview_enabled  INTEGER NOT NULL DEFAULT 1,
  auto_destroy_pr  INTEGER NOT NULL DEFAULT 1,
  webhook_secret   TEXT NOT NULL,
  created_at       INTEGER NOT NULL,
  updated_at       INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS env_vars (
  id         TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  scope      TEXT NOT NULL DEFAULT 'all',
  key        TEXT NOT NULL,
  value      TEXT NOT NULL,
  UNIQUE(project_id, scope, key)
);

CREATE TABLE IF NOT EXISTS deployments (
  id            TEXT PRIMARY KEY,
  project_id    TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type          TEXT NOT NULL DEFAULT 'production',
  branch        TEXT NOT NULL,
  pr_number     INTEGER,
  commit_sha    TEXT,
  commit_msg    TEXT,
  status        TEXT NOT NULL DEFAULT 'queued',
  image_tag     TEXT,
  container_id  TEXT,
  container_name TEXT,
  host_port     INTEGER,
  internal_port INTEGER,
  subdomain     TEXT,
  url           TEXT,
  error         TEXT,
  trigger       TEXT NOT NULL DEFAULT 'manual',
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL,
  finished_at   INTEGER
);

CREATE INDEX IF NOT EXISTS idx_deploy_project ON deployments(project_id);
CREATE INDEX IF NOT EXISTS idx_deploy_status  ON deployments(status);

CREATE TABLE IF NOT EXISTS containers (
  id            TEXT PRIMARY KEY,
  project_id    TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  deployment_id TEXT NOT NULL REFERENCES deployments(id) ON DELETE CASCADE,
  docker_id     TEXT,
  name          TEXT NOT NULL,
  subdomain     TEXT NOT NULL,
  host_port     INTEGER NOT NULL,
  internal_port INTEGER NOT NULL,
  status        TEXT NOT NULL DEFAULT 'running',
  created_at    INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_container_project ON containers(project_id);

CREATE TABLE IF NOT EXISTS preview_deployments (
  id            TEXT PRIMARY KEY,
  project_id    TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  deployment_id TEXT REFERENCES deployments(id) ON DELETE SET NULL,
  kind          TEXT NOT NULL DEFAULT 'branch',
  branch        TEXT NOT NULL,
  pr_number     INTEGER,
  subdomain     TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'active',
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL,
  UNIQUE(project_id, subdomain)
);

CREATE TABLE IF NOT EXISTS logs (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  deployment_id TEXT NOT NULL REFERENCES deployments(id) ON DELETE CASCADE,
  stream        TEXT NOT NULL DEFAULT 'build',
  line          TEXT NOT NULL,
  ts            INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_logs_deploy ON logs(deployment_id, id);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS health_checks (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  deployment_id TEXT NOT NULL REFERENCES deployments(id) ON DELETE CASCADE,
  ok            INTEGER NOT NULL,
  status_code   INTEGER,
  latency_ms    INTEGER,
  error         TEXT,
  ts            INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_health_deploy ON health_checks(deployment_id, id);

CREATE TABLE IF NOT EXISTS webhooks (
  id          TEXT PRIMARY KEY,
  project_id  TEXT REFERENCES projects(id) ON DELETE CASCADE,
  event       TEXT NOT NULL,
  action      TEXT,
  delivery_id TEXT,
  ref         TEXT,
  ok          INTEGER NOT NULL DEFAULT 1,
  message     TEXT,
  created_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS page_views (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  deployment_id   TEXT NOT NULL REFERENCES deployments(id) ON DELETE CASCADE,
  project_id      TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  timestamp       INTEGER NOT NULL,
  path            TEXT NOT NULL,
  referrer        TEXT,
  hostname        TEXT,
  user_agent      TEXT,
  ip_hash         TEXT,
  country         TEXT,
  region          TEXT,
  city            TEXT,
  device_type     TEXT,
  browser         TEXT,
  browser_version TEXT,
  os              TEXT,
  os_version      TEXT,
  screen_width    INTEGER,
  screen_height   INTEGER,
  language        TEXT,
  utm_source      TEXT,
  utm_medium      TEXT,
  utm_campaign    TEXT,
  duration        INTEGER
);

CREATE INDEX IF NOT EXISTS idx_pv_deployment ON page_views(deployment_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_pv_project ON page_views(project_id, timestamp);

CREATE TABLE IF NOT EXISTS custom_events (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  deployment_id TEXT NOT NULL REFERENCES deployments(id) ON DELETE CASCADE,
  project_id    TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  timestamp     INTEGER NOT NULL,
  event_name    TEXT NOT NULL,
  event_data    TEXT,
  path          TEXT,
  ip_hash       TEXT
);

CREATE INDEX IF NOT EXISTS idx_events_deployment ON custom_events(deployment_id, timestamp);

CREATE TABLE IF NOT EXISTS dashboard_views (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp     INTEGER NOT NULL,
  path          TEXT NOT NULL,
  visitor_hash  TEXT,
  ip_hash       TEXT,
  referrer      TEXT,
  country       TEXT,
  region        TEXT,
  city          TEXT,
  device_type   TEXT,
  browser       TEXT,
  os            TEXT,
  language      TEXT
);

CREATE INDEX IF NOT EXISTS idx_dashviews_ts ON dashboard_views(timestamp);

CREATE TABLE IF NOT EXISTS notifications (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL DEFAULT 'info',
  title      TEXT NOT NULL,
  body       TEXT,
  link       TEXT,
  seen       INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, created_at);
