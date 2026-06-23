import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const backendRoot = resolve(__dirname, '..');

function loadDotenv() {
  const envPath = join(backendRoot, '.env');
  if (!existsSync(envPath)) return;
  for (const raw of readFileSync(envPath, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}
loadDotenv();

const env = process.env;
const bool = (v, d = false) => (v == null ? d : /^(1|true|yes|on)$/i.test(v));
const num = (v, d) => (v == null || v === '' ? d : Number(v));
const abs = (p) => (p.startsWith('/') ? p : resolve(backendRoot, p));

export const config = {
  port: num(env.PORT, 8080),
  host: env.HOST || '0.0.0.0',

  baseDomain: env.BASE_DOMAIN || 'your-domain.com',
  dashSubdomain: env.DASH_SUBDOMAIN || 'dash',

  jwtSecret: env.JWT_SECRET || 'dev-insecure-secret-change-me',
  tokenTtl: env.TOKEN_TTL || '7d',
  ipHashSalt: env.IP_HASH_SALT || 'mintaz-analytics-salt-change-me',
  secretKey: env.SECRET_KEY || env.JWT_SECRET || 'dev-insecure-secret-change-me',

  corsOrigins: (env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean),

  adminEmail: env.ADMIN_EMAIL || 'admin@your-domain.com',
  adminPassword: env.ADMIN_PASSWORD || 'changeme',
  allowRegistration: bool(env.ALLOW_REGISTRATION, true),

  dataDir: abs(env.DATA_DIR || './data'),
  workDir: abs(env.WORK_DIR || './workdir'),
  dbPath: abs(env.DB_PATH || './data/mintaz.sqlite'),
  staticDir: env.STATIC_DIR ? abs(env.STATIC_DIR) : null,

  dbDriver: env.DB_DRIVER || 'sqlite',
  postgresUrl: env.POSTGRES_URL || null,
  mysql: {
    host: env.DB_HOST || '127.0.0.1',
    port: num(env.DB_PORT, 3306),
    database: env.DB_NAME || 'mintaz',
    user: env.DB_USER || 'mintaz',
    password: env.DB_PASSWORD || '',
  },
  redisUrl: env.REDIS_URL || null,

  dockerBin: env.DOCKER_BIN || 'docker',
  portRangeStart: num(env.PORT_RANGE_START, 21000),
  portRangeEnd: num(env.PORT_RANGE_END, 21999),
  defaultRestartPolicy: env.DEFAULT_RESTART_POLICY || 'unless-stopped',
  autoCleanup: bool(env.AUTO_CLEANUP, true),

  container: {
    memory: env.CONTAINER_MEMORY || '512m',
    cpus: env.CONTAINER_CPUS || '1.0',
    pidsLimit: num(env.CONTAINER_PIDS_LIMIT, 256),
    nofile: num(env.CONTAINER_NOFILE, 1024),
    dropCaps: bool(env.CONTAINER_DROP_CAPS, false),
  },
  buildMemory: env.BUILD_MEMORY || '2g',
  disableInterContainer: bool(env.DISABLE_INTER_CONTAINER, true),

  proxy: (env.PROXY || 'caddy').toLowerCase(),
  proxyHttpPort: num(env.PROXY_HTTP_PORT, 8088),
  builtinProxy: bool(env.BUILTIN_PROXY, true),
  caddySnippet: env.CADDY_SNIPPET || '/etc/caddy/mintaz.routes.caddy',
  caddyReloadCmd: env.CADDY_RELOAD_CMD || 'sudo systemctl reload caddy',
  nginxSnippet: env.NGINX_SNIPPET || '/etc/nginx/conf.d/mintaz.conf',
  nginxReloadCmd: env.NGINX_RELOAD_CMD || 'sudo systemctl reload nginx',

  githubWebhookSecret: env.GITHUB_WEBHOOK_SECRET || '',
  githubToken: env.GITHUB_TOKEN || '',
  githubOAuthClientId: env.GITHUB_OAUTH_CLIENT_ID || '',
  githubOAuthClientSecret: env.GITHUB_OAUTH_CLIENT_SECRET || '',
  publicUrl: env.PUBLIC_URL || '',
  cfTunnelName: env.CF_TUNNEL_NAME || 'mintaz-tunnel',

  appVersion: (() => {
    try {
      return JSON.parse(readFileSync(join(backendRoot, '..', 'package.json'), 'utf8')).version || '0.0.0';
    } catch {
      return '0.0.0';
    }
  })(),
  repo: {
    owner: env.UPDATE_REPO_OWNER || 'foxstudio-201',
    name: env.UPDATE_REPO_NAME || 'mintaz',
    branch: env.UPDATE_BRANCH || 'main',
  },
};

const INSECURE_DEFAULTS = {
  JWT_SECRET: ['dev-insecure-secret-change-me', 'change-me-to-a-long-random-string'],
  ADMIN_PASSWORD: ['changeme'],
  IP_HASH_SALT: ['mintaz-analytics-salt-change-me'],
};
if (!bool(env.ALLOW_INSECURE_DEFAULTS)) {
  const bad = [];
  if (INSECURE_DEFAULTS.JWT_SECRET.includes(config.jwtSecret)) bad.push('JWT_SECRET');
  if (INSECURE_DEFAULTS.ADMIN_PASSWORD.includes(config.adminPassword)) bad.push('ADMIN_PASSWORD');
  if (INSECURE_DEFAULTS.IP_HASH_SALT.includes(config.ipHashSalt)) bad.push('IP_HASH_SALT');
  if (bad.length) {
    throw new Error(
      `Refusing to start: ${bad.join(', ')} still set to an insecure default. ` +
      `Set strong random values in .env (e.g. \`openssl rand -hex 32\`). ` +
      `For local-only dev you may set ALLOW_INSECURE_DEFAULTS=1.`
    );
  }
}

export const dashUrl = () => `https://${config.dashSubdomain}.${config.baseDomain}`;
export const publicBaseUrl = () => config.publicUrl || dashUrl();
