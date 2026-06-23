// Centralised, validated configuration loaded from environment.
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const backendRoot = resolve(__dirname, '..');

// Tiny .env loader (no dependency) — only sets keys not already in process.env.
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
  // Key for encrypting stored third-party tokens at rest. Falls back to the
  // JWT secret so a single strong secret is enough; set separately to rotate
  // signing and encryption keys independently.
  secretKey: env.SECRET_KEY || env.JWT_SECRET || 'dev-insecure-secret-change-me',

  // Comma-separated allowlist of browser origins for CORS. Empty = reflect any
  // origin (convenient for dev; tighten to your dashboard URL in production).
  corsOrigins: (env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean),

  adminEmail: env.ADMIN_EMAIL || 'admin@your-domain.com',
  adminPassword: env.ADMIN_PASSWORD || 'changeme',
  // Allow public self-registration. Disable to lock down an instance to
  // existing accounts (new users must be created by an admin).
  allowRegistration: bool(env.ALLOW_REGISTRATION, true),

  dataDir: abs(env.DATA_DIR || './data'),
  workDir: abs(env.WORK_DIR || './workdir'),
  dbPath: abs(env.DB_PATH || './data/mintaz.sqlite'),
  staticDir: env.STATIC_DIR ? abs(env.STATIC_DIR) : null,

  dbDriver: env.DB_DRIVER || 'sqlite',
  postgresUrl: env.POSTGRES_URL || null,

  dockerBin: env.DOCKER_BIN || 'docker',
  portRangeStart: num(env.PORT_RANGE_START, 21000),
  portRangeEnd: num(env.PORT_RANGE_END, 21999),
  defaultRestartPolicy: env.DEFAULT_RESTART_POLICY || 'unless-stopped',
  autoCleanup: bool(env.AUTO_CLEANUP, true),

  // Per-container resource caps + hardening. On a public instance these bound
  // the blast radius of any single tenant's container (OOM, CPU hog, fork bomb,
  // privilege escalation). Tune per host capacity.
  container: {
    memory: env.CONTAINER_MEMORY || '512m', // hard RAM cap (also caps swap)
    cpus: env.CONTAINER_CPUS || '1.0',       // fractional CPU cap
    pidsLimit: num(env.CONTAINER_PIDS_LIMIT, 256), // anti fork-bomb
    nofile: num(env.CONTAINER_NOFILE, 1024), // open-file ulimit
    // Drop all Linux capabilities (keep only NET_BIND_SERVICE + the few nginx
    // needs). Off by default since some images expect more; enable for stricter
    // isolation once you've confirmed your deployments still run.
    dropCaps: bool(env.CONTAINER_DROP_CAPS, false),
  },
  // RAM cap for the build step so a heavy `npm run build` can't exhaust the host.
  buildMemory: env.BUILD_MEMORY || '2g',
  // Block container↔container traffic on the shared bridge (tenant isolation).
  disableInterContainer: bool(env.DISABLE_INTER_CONTAINER, true),

  proxy: (env.PROXY || 'caddy').toLowerCase(),
  // Port Mintaz's own reverse proxy listens on (the Cloudflare tunnel points
  // *.domain here). Kept off :80 so it never clashes with an existing webserver.
  proxyHttpPort: num(env.PROXY_HTTP_PORT, 8088),
  // Built-in Node reverse proxy on PROXY_HTTP_PORT (routes *.domain by Host to
  // containers). Set false if you front everything with Caddy/Nginx instead.
  builtinProxy: bool(env.BUILTIN_PROXY, true),
  caddySnippet: env.CADDY_SNIPPET || '/etc/caddy/mintaz.routes.caddy',
  caddyReloadCmd: env.CADDY_RELOAD_CMD || 'sudo systemctl reload caddy',
  nginxSnippet: env.NGINX_SNIPPET || '/etc/nginx/conf.d/mintaz.conf',
  nginxReloadCmd: env.NGINX_RELOAD_CMD || 'sudo systemctl reload nginx',

  githubWebhookSecret: env.GITHUB_WEBHOOK_SECRET || '',
  // Global fallback token for cloning private repos (per-project token wins).
  githubToken: env.GITHUB_TOKEN || '',
  // GitHub OAuth App (for "Connect GitHub" / repo import).
  githubOAuthClientId: env.GITHUB_OAUTH_CLIENT_ID || '',
  githubOAuthClientSecret: env.GITHUB_OAUTH_CLIENT_SECRET || '',
  // Public base URL the browser uses (for OAuth redirect_uri). Dev: http://localhost:5173
  publicUrl: env.PUBLIC_URL || '',
  cfTunnelName: env.CF_TUNNEL_NAME || 'mintaz-tunnel',
};

// Refuse to start with the shipped placeholder secrets — on a public instance
// these would let anyone forge tokens or log in as the seeded admin. Set
// ALLOW_INSECURE_DEFAULTS=1 only for throwaway local development.
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
// Base URL the browser hits; used to build the OAuth callback.
export const publicBaseUrl = () => config.publicUrl || dashUrl();
