CREATE TABLE IF NOT EXISTS users (
  id            VARCHAR(64) PRIMARY KEY,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name          VARCHAR(255),
  role          VARCHAR(32) NOT NULL DEFAULT 'admin',
  github_login  VARCHAR(255),
  github_token  TEXT,
  github_avatar VARCHAR(512),
  cf_token      TEXT,
  cf_account    VARCHAR(255),
  created_at    BIGINT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS projects (
  id               VARCHAR(64) PRIMARY KEY,
  user_id          VARCHAR(64) NOT NULL,
  name             VARCHAR(255) NOT NULL,
  slug             VARCHAR(191) UNIQUE NOT NULL,
  public_slug      VARCHAR(191),
  repo_url         VARCHAR(512) NOT NULL,
  git_token        TEXT,
  branch           VARCHAR(255) NOT NULL DEFAULT 'main',
  build_method     VARCHAR(32) NOT NULL DEFAULT 'auto',
  framework        VARCHAR(64) NOT NULL DEFAULT 'auto',
  output_dir       VARCHAR(255),
  dockerfile_path  VARCHAR(255) NOT NULL DEFAULT 'Dockerfile',
  install_command  VARCHAR(512),
  build_command    VARCHAR(512),
  start_command    VARCHAR(512),
  internal_port    INT NOT NULL DEFAULT 3000,
  restart_policy   VARCHAR(32) NOT NULL DEFAULT 'unless-stopped',
  preview_enabled  TINYINT NOT NULL DEFAULT 1,
  auto_destroy_pr  TINYINT NOT NULL DEFAULT 1,
  webhook_secret   VARCHAR(255) NOT NULL,
  cf_zone_id       VARCHAR(255),
  cf_zone_name     VARCHAR(255),
  cf_record_id     VARCHAR(255),
  cf_tunnel_cname  VARCHAR(255),
  created_at       BIGINT NOT NULL,
  updated_at       BIGINT NOT NULL,
  CONSTRAINT fk_projects_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS env_vars (
  id         VARCHAR(64) PRIMARY KEY,
  project_id VARCHAR(64) NOT NULL,
  scope      VARCHAR(32) NOT NULL DEFAULT 'all',
  `key`      VARCHAR(191) NOT NULL,
  value      TEXT NOT NULL,
  UNIQUE KEY uniq_env (project_id, scope, `key`),
  CONSTRAINT fk_env_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS deployments (
  id            VARCHAR(64) PRIMARY KEY,
  project_id    VARCHAR(64) NOT NULL,
  type          VARCHAR(32) NOT NULL DEFAULT 'production',
  branch        VARCHAR(255) NOT NULL,
  pr_number     INT,
  commit_sha    VARCHAR(64),
  commit_msg    TEXT,
  status        VARCHAR(32) NOT NULL DEFAULT 'queued',
  image_tag     VARCHAR(255),
  container_id  VARCHAR(128),
  container_name VARCHAR(255),
  host_port     INT,
  internal_port INT,
  subdomain     VARCHAR(255),
  url           VARCHAR(512),
  error         TEXT,
  `trigger`     VARCHAR(32) NOT NULL DEFAULT 'manual',
  created_at    BIGINT NOT NULL,
  updated_at    BIGINT NOT NULL,
  finished_at   BIGINT,
  KEY idx_deploy_project (project_id),
  KEY idx_deploy_status (status),
  CONSTRAINT fk_deploy_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS containers (
  id            VARCHAR(64) PRIMARY KEY,
  project_id    VARCHAR(64) NOT NULL,
  deployment_id VARCHAR(64) NOT NULL,
  docker_id     VARCHAR(128),
  name          VARCHAR(255) NOT NULL,
  subdomain     VARCHAR(255) NOT NULL,
  host_port     INT NOT NULL,
  internal_port INT NOT NULL,
  status        VARCHAR(32) NOT NULL DEFAULT 'running',
  created_at    BIGINT NOT NULL,
  KEY idx_container_project (project_id),
  CONSTRAINT fk_container_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_container_deploy FOREIGN KEY (deployment_id) REFERENCES deployments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS preview_deployments (
  id            VARCHAR(64) PRIMARY KEY,
  project_id    VARCHAR(64) NOT NULL,
  deployment_id VARCHAR(64),
  kind          VARCHAR(32) NOT NULL DEFAULT 'branch',
  branch        VARCHAR(255) NOT NULL,
  pr_number     INT,
  subdomain     VARCHAR(255) NOT NULL,
  status        VARCHAR(32) NOT NULL DEFAULT 'active',
  created_at    BIGINT NOT NULL,
  updated_at    BIGINT NOT NULL,
  UNIQUE KEY uniq_preview (project_id, subdomain),
  CONSTRAINT fk_preview_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_preview_deploy FOREIGN KEY (deployment_id) REFERENCES deployments(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS logs (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  deployment_id VARCHAR(64) NOT NULL,
  stream        VARCHAR(32) NOT NULL DEFAULT 'build',
  line          TEXT NOT NULL,
  ts            BIGINT NOT NULL,
  KEY idx_logs_deploy (deployment_id, id),
  CONSTRAINT fk_logs_deploy FOREIGN KEY (deployment_id) REFERENCES deployments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS settings (
  `key` VARCHAR(191) PRIMARY KEY,
  value TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS health_checks (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  deployment_id VARCHAR(64) NOT NULL,
  ok            TINYINT NOT NULL,
  status_code   INT,
  latency_ms    INT,
  error         TEXT,
  ts            BIGINT NOT NULL,
  KEY idx_health_deploy (deployment_id, id),
  CONSTRAINT fk_health_deploy FOREIGN KEY (deployment_id) REFERENCES deployments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS webhooks (
  id          VARCHAR(64) PRIMARY KEY,
  project_id  VARCHAR(64),
  event       VARCHAR(64) NOT NULL,
  action      VARCHAR(64),
  delivery_id VARCHAR(128),
  ref         VARCHAR(255),
  ok          TINYINT NOT NULL DEFAULT 1,
  message     TEXT,
  created_at  BIGINT NOT NULL,
  CONSTRAINT fk_webhooks_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS page_views (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  deployment_id   VARCHAR(64) NOT NULL,
  project_id      VARCHAR(64) NOT NULL,
  `timestamp`     BIGINT NOT NULL,
  path            VARCHAR(512) NOT NULL,
  referrer        VARCHAR(512),
  hostname        VARCHAR(255),
  user_agent      VARCHAR(512),
  ip_hash         VARCHAR(64),
  country         VARCHAR(64),
  region          VARCHAR(128),
  city            VARCHAR(128),
  device_type     VARCHAR(32),
  browser         VARCHAR(64),
  browser_version VARCHAR(64),
  os              VARCHAR(64),
  os_version      VARCHAR(64),
  screen_width    INT,
  screen_height   INT,
  language        VARCHAR(32),
  utm_source      VARCHAR(255),
  utm_medium      VARCHAR(255),
  utm_campaign    VARCHAR(255),
  duration        INT,
  KEY idx_pv_deployment (deployment_id, `timestamp`),
  KEY idx_pv_project (project_id, `timestamp`),
  CONSTRAINT fk_pv_deploy FOREIGN KEY (deployment_id) REFERENCES deployments(id) ON DELETE CASCADE,
  CONSTRAINT fk_pv_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS custom_events (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  deployment_id VARCHAR(64) NOT NULL,
  project_id    VARCHAR(64) NOT NULL,
  `timestamp`   BIGINT NOT NULL,
  event_name    VARCHAR(128) NOT NULL,
  event_data    TEXT,
  path          VARCHAR(512),
  ip_hash       VARCHAR(64),
  KEY idx_events_deployment (deployment_id, `timestamp`),
  CONSTRAINT fk_events_deploy FOREIGN KEY (deployment_id) REFERENCES deployments(id) ON DELETE CASCADE,
  CONSTRAINT fk_events_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS dashboard_views (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  `timestamp`   BIGINT NOT NULL,
  path          VARCHAR(512) NOT NULL,
  visitor_hash  VARCHAR(64),
  ip_hash       VARCHAR(64),
  referrer      VARCHAR(512),
  country       VARCHAR(64),
  region        VARCHAR(128),
  city          VARCHAR(128),
  device_type   VARCHAR(32),
  browser       VARCHAR(64),
  os            VARCHAR(64),
  language      VARCHAR(32),
  KEY idx_dashviews_ts (`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS notifications (
  id         VARCHAR(64) PRIMARY KEY,
  user_id    VARCHAR(64) NOT NULL,
  type       VARCHAR(32) NOT NULL DEFAULT 'info',
  title      VARCHAR(255) NOT NULL,
  body       TEXT,
  link       VARCHAR(255),
  seen       TINYINT NOT NULL DEFAULT 0,
  created_at BIGINT NOT NULL,
  KEY idx_notif_user (user_id, created_at),
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
