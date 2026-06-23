CREATE TABLE IF NOT EXISTS user_quotas (
  user_id              TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  max_projects         INTEGER NOT NULL DEFAULT 3,
  max_deployments_mo   INTEGER NOT NULL DEFAULT 10,
  max_running          INTEGER NOT NULL DEFAULT 5,
  max_build_minutes_mo INTEGER NOT NULL DEFAULT 30,
  max_storage_gb       REAL    NOT NULL DEFAULT 5,
  max_bandwidth_gb_mo  REAL    NOT NULL DEFAULT 50,
  max_cpu_hours_mo     REAL    NOT NULL DEFAULT 10,
  max_memory_gbh_mo    REAL    NOT NULL DEFAULT 20
);

CREATE TABLE IF NOT EXISTS usage_records (
  user_id              TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month                TEXT NOT NULL,
  cpu_seconds          REAL NOT NULL DEFAULT 0,
  memory_bytes_seconds REAL NOT NULL DEFAULT 0,
  bandwidth_bytes      REAL NOT NULL DEFAULT 0,
  build_seconds        REAL NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, month)
);
