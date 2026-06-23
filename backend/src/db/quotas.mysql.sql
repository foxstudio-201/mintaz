CREATE TABLE IF NOT EXISTS user_quotas (
  user_id              VARCHAR(64) PRIMARY KEY,
  max_projects         INT NOT NULL DEFAULT 3,
  max_deployments_mo   INT NOT NULL DEFAULT 10,
  max_running          INT NOT NULL DEFAULT 5,
  max_build_minutes_mo INT NOT NULL DEFAULT 30,
  max_storage_gb       DOUBLE NOT NULL DEFAULT 5,
  max_bandwidth_gb_mo  DOUBLE NOT NULL DEFAULT 50,
  max_cpu_hours_mo     DOUBLE NOT NULL DEFAULT 10,
  max_memory_gbh_mo    DOUBLE NOT NULL DEFAULT 20,
  CONSTRAINT fk_quota_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS usage_records (
  user_id              VARCHAR(64) NOT NULL,
  month                VARCHAR(16) NOT NULL,
  cpu_seconds          DOUBLE NOT NULL DEFAULT 0,
  memory_bytes_seconds DOUBLE NOT NULL DEFAULT 0,
  bandwidth_bytes      DOUBLE NOT NULL DEFAULT 0,
  build_seconds        DOUBLE NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, month),
  CONSTRAINT fk_usage_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
