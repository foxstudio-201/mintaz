import net from 'node:net';
import { decryptSecret } from '../util/crypto.js';

// Engine registry — defines default port, URL scheme and the env-var key set
// (Vercel-style) each engine injects when attached to a project.
export const ENGINES = {
  postgres: {
    label: 'PostgreSQL',
    defaultPort: 5432,
    scheme: 'postgresql',
    defaultPrefix: 'POSTGRES',
    urlAlias: true, // also emit DATABASE_URL
  },
  mysql: {
    label: 'MySQL / MariaDB',
    defaultPort: 3306,
    scheme: 'mysql',
    defaultPrefix: 'MYSQL',
    urlAlias: true,
  },
  redis: {
    label: 'Redis',
    defaultPort: 6379,
    scheme: 'redis',
    defaultPrefix: 'REDIS',
    urlAlias: false,
  },
  mongodb: {
    label: 'MongoDB',
    defaultPort: 27017,
    scheme: 'mongodb',
    defaultPrefix: 'MONGODB',
    urlAlias: true,
  },
};

export const ENGINE_KEYS = Object.keys(ENGINES);

export function isValidEngine(engine) {
  return Object.prototype.hasOwnProperty.call(ENGINES, engine);
}

export function normalizePrefix(s) {
  if (!s) return '';
  return String(s)
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, '_')
    .replace(/_+$/g, '')
    .replace(/^_+/g, '');
}

// Build a connection URL from the stored (already-decrypted) fields.
// A raw connection_url, if present, always wins.
export function buildConnectionUrl(db) {
  if (db.connection_url) return db.connection_url;
  const spec = ENGINES[db.engine];
  if (!spec) return '';

  const ssl = !!db.ssl;
  let scheme = spec.scheme;
  if (db.engine === 'redis' && ssl) scheme = 'rediss';

  const user = db.username ? encodeURIComponent(db.username) : '';
  const pass = db.password ? encodeURIComponent(db.password) : '';
  // Supports user+pass, user-only, and pass-only (e.g. Redis `:pass@host`).
  const auth = user || pass ? `${user}${pass ? `:${pass}` : ''}@` : '';
  const host = db.host || 'localhost';
  const port = db.port || spec.defaultPort;
  const path = db.database_name ? `/${encodeURIComponent(db.database_name)}` : '';

  let url = `${scheme}://${auth}${host}:${port}${path}`;

  const params = [];
  if (ssl) {
    if (db.engine === 'postgres') params.push('sslmode=require');
    else if (db.engine === 'mysql') params.push('ssl=true');
    else if (db.engine === 'mongodb') params.push('tls=true');
  }
  if (params.length) url += `?${params.join('&')}`;
  return url;
}

// Parse a connection URL into discrete fields so the user can paste a URL
// instead of filling every field. Returns a partial { host, port, ... }.
export function parseConnectionUrl(engine, raw) {
  const out = { host: '', port: null, database_name: '', username: '', password: '', ssl: 0 };
  if (!raw) return out;
  try {
    const u = new URL(raw.trim());
    out.host = u.hostname || '';
    out.port = u.port ? Number(u.port) : (ENGINES[engine]?.defaultPort ?? null);
    out.username = u.username ? decodeURIComponent(u.username) : '';
    out.password = u.password ? decodeURIComponent(u.password) : '';
    const path = (u.pathname || '').replace(/^\//, '');
    out.database_name = path ? decodeURIComponent(path) : '';
    const proto = u.protocol.replace(':', '');
    const params = u.searchParams;
    if (
      proto === 'rediss' ||
      proto === 'https' ||
      params.get('sslmode') === 'require' ||
      params.get('ssl') === 'true' ||
      params.get('tls') === 'true'
    ) {
      out.ssl = 1;
    }
  } catch {
    // leave defaults on parse failure
  }
  return out;
}

// Decrypt the at-rest secrets of a stored row into a plain object usable by
// buildConnectionUrl / envVarsFor.
function decoded(db) {
  return {
    ...db,
    password: db.password ? decryptSecret(db.password) : '',
    connection_url: db.connection_url ? decryptSecret(db.connection_url) : '',
  };
}

// Compute the env-var map a database injects. `prefix` is the per-attachment
// override (already-normalized or empty). The relational DATABASE_URL alias is
// only emitted with the bare name when there is NO custom prefix, so two DBs of
// the same engine cannot clobber each other.
export function envVarsFor(db, prefix) {
  const d = decoded(db);
  const spec = ENGINES[d.engine];
  if (!spec) return {};

  const custom = normalizePrefix(prefix);
  const P = custom || spec.defaultPrefix;
  const url = buildConnectionUrl(d);
  const out = {};

  out[`${P}_URL`] = url;

  if (spec.urlAlias) {
    out[custom ? `${P}_DATABASE_URL` : 'DATABASE_URL'] = url;
  }
  if (d.engine === 'mongodb') {
    out[`${P}_URI`] = url; // MONGODB_URI is the conventional name
  }

  // Discrete fields (skip for pure-URL records where fields are unknown).
  if (d.host) out[`${P}_HOST`] = d.host;
  const port = d.port || spec.defaultPort;
  if (port) out[`${P}_PORT`] = String(port);
  if (d.username) out[`${P}_USER`] = d.username;
  if (d.password) out[`${P}_PASSWORD`] = d.password;
  if (d.database_name) out[`${P}_DATABASE`] = d.database_name;

  return out;
}

// The env-var KEYS only (for the read-only managed-vars preview shown in the UI;
// never leaks values).
export function envKeysFor(db, prefix) {
  return Object.keys(envVarsFor(db, prefix));
}

function scrub(message, db) {
  let m = String(message || 'connection failed');
  const secrets = [db.password, decryptSecret(db.password || ''), db.connection_url].filter(Boolean);
  for (const s of secrets) {
    if (s && s.length > 2) m = m.split(s).join('***');
  }
  return m;
}

// TCP reachability check — proves host:port is open, not credentials.
function tcpProbe(host, port, timeout = 5000) {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port });
    let done = false;
    const finish = (ok, message) => {
      if (done) return;
      done = true;
      socket.destroy();
      resolve({ ok, message });
    };
    socket.setTimeout(timeout);
    socket.once('connect', () => finish(true, 'reachable'));
    socket.once('timeout', () => finish(false, 'timed out'));
    socket.once('error', (e) => finish(false, e.message));
  });
}

// Test a database connection. Returns { ok, level, message, latencyMs }.
// level: 'authenticated' when credentials were verified, 'reachable' when only
// the TCP port could be probed.
export async function testConnection(stored) {
  const db = decoded(stored);
  const spec = ENGINES[db.engine];
  const startedAt = Date.now();
  const elapsed = () => Date.now() - startedAt;

  if (!spec) {
    return { ok: false, level: 'reachable', message: 'unknown engine', latencyMs: 0 };
  }

  const host = db.host || 'localhost';
  const port = db.port || spec.defaultPort;
  const url = buildConnectionUrl(db);

  try {
    if (db.engine === 'mysql') {
      const mysql = (await import('mysql2/promise')).default;
      const conn = await mysql.createConnection({
        uri: url,
        connectTimeout: 5000,
      });
      try {
        await conn.query('SELECT 1');
      } finally {
        await conn.end().catch(() => {});
      }
      return { ok: true, level: 'authenticated', message: 'connected', latencyMs: elapsed() };
    }

    if (db.engine === 'redis') {
      const Redis = (await import('ioredis')).default;
      const client = new Redis(url, {
        lazyConnect: true,
        connectTimeout: 5000,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null,
      });
      try {
        await client.connect();
        await client.ping();
      } finally {
        client.disconnect();
      }
      return { ok: true, level: 'authenticated', message: 'connected', latencyMs: elapsed() };
    }

    if (db.engine === 'postgres') {
      let Client;
      try {
        ({ Client } = await import('pg'));
      } catch {
        const probe = await tcpProbe(host, port);
        return { ...probe, level: 'reachable', latencyMs: elapsed() };
      }
      const client = new Client({ connectionString: url, connectionTimeoutMillis: 5000 });
      try {
        await client.connect();
        await client.query('SELECT 1');
      } finally {
        await client.end().catch(() => {});
      }
      return { ok: true, level: 'authenticated', message: 'connected', latencyMs: elapsed() };
    }

    // mongodb (and any fallback) → TCP reachability only
    const probe = await tcpProbe(host, port);
    return { ...probe, level: 'reachable', latencyMs: elapsed() };
  } catch (e) {
    return { ok: false, level: 'authenticated', message: scrub(e.message, db), latencyMs: elapsed() };
  }
}
