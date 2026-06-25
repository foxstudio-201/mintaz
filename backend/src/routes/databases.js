import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { encryptSecret } from '../util/crypto.js';
import {
  ENGINES,
  ENGINE_KEYS,
  isValidEngine,
  normalizePrefix,
  parseConnectionUrl,
  testConnection,
  envKeysFor,
} from '../services/databases.js';

function now() {
  return Date.now();
}

// Serialize a stored database row, stripping secrets.
function databaseView(d) {
  if (!d) return d;
  const { password, connection_url, ...safe } = d;
  return {
    ...safe,
    ssl: !!d.ssl,
    has_password: !!password,
    has_connection_url: !!connection_url,
  };
}

async function ownDatabase(request, reply) {
  const d = await db.prepare('SELECT * FROM databases WHERE id = ?').get(request.params.id);
  if (!d || d.user_id !== request.user.sub) {
    reply.code(404).send({ error: 'database not found' });
    return null;
  }
  return d;
}

async function ownProject(request, reply, projectId) {
  const p = await db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
  if (!p || p.user_id !== request.user.sub) {
    reply.code(404).send({ error: 'project not found' });
    return null;
  }
  return p;
}

export default async function databaseRoutes(fastify) {
  fastify.addHook('onRequest', fastify.authenticate);

  // List engine metadata (for the create UI).
  fastify.get('/engines', async () => ({
    engines: ENGINE_KEYS.map((id) => ({
      id,
      label: ENGINES[id].label,
      defaultPort: ENGINES[id].defaultPort,
      defaultPrefix: ENGINES[id].defaultPrefix,
    })),
  }));

  // List the user's databases.
  fastify.get('/', async (request) => {
    const rows = await db
      .prepare('SELECT * FROM databases WHERE user_id = ? ORDER BY created_at DESC')
      .all(request.user.sub);
    return { databases: rows.map(databaseView) };
  });

  // Create a database. Accepts discrete fields or a raw connection_url (or both —
  // a connection_url is used to backfill empty fields for display/test).
  fastify.post('/', async (request, reply) => {
    const b = request.body || {};
    const engine = String(b.engine || '').toLowerCase();
    if (!b.name || !isValidEngine(engine)) {
      return reply.code(400).send({ error: 'name and a valid engine are required' });
    }

    let fields = {
      host: b.host || '',
      port: b.port != null && b.port !== '' ? Number(b.port) : null,
      database_name: b.database_name || '',
      username: b.username || '',
      password: b.password || '',
      ssl: b.ssl ? 1 : 0,
    };
    const connUrl = (b.connection_url || '').trim();
    if (connUrl) {
      const parsed = parseConnectionUrl(engine, connUrl);
      // Only backfill fields the user did not supply explicitly.
      fields = {
        host: fields.host || parsed.host,
        port: fields.port ?? parsed.port,
        database_name: fields.database_name || parsed.database_name,
        username: fields.username || parsed.username,
        password: fields.password || parsed.password,
        ssl: b.ssl != null ? (b.ssl ? 1 : 0) : parsed.ssl,
      };
    }

    if (!connUrl && !fields.host) {
      return reply.code(400).send({ error: 'host or a connection_url is required' });
    }

    const id = nanoid();
    const ts = now();
    await db
      .prepare(
        `INSERT INTO databases
           (id, user_id, name, engine, host, port, database_name, username, password, ssl, connection_url, options, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        request.user.sub,
        b.name,
        engine,
        fields.host,
        fields.port,
        fields.database_name,
        fields.username,
        fields.password ? encryptSecret(fields.password) : null,
        fields.ssl,
        connUrl ? encryptSecret(connUrl) : null,
        b.options ? JSON.stringify(b.options) : null,
        ts,
        ts
      );
    const row = await db.prepare('SELECT * FROM databases WHERE id = ?').get(id);
    return { database: databaseView(row) };
  });

  // Update a database. Secrets are only re-encrypted when provided.
  fastify.patch('/:id', async (request, reply) => {
    const d = await ownDatabase(request, reply);
    if (!d) return;
    const b = request.body || {};

    const sets = [];
    const vals = [];
    const set = (col, val) => {
      sets.push(`${col} = ?`);
      vals.push(val);
    };

    if (b.name != null) set('name', b.name);
    if (b.host != null) set('host', b.host);
    if (b.port !== undefined) set('port', b.port === '' || b.port == null ? null : Number(b.port));
    if (b.database_name != null) set('database_name', b.database_name);
    if (b.username != null) set('username', b.username);
    if (b.ssl != null) set('ssl', b.ssl ? 1 : 0);
    // Only overwrite secrets when a non-empty value is sent.
    if (b.password) set('password', encryptSecret(b.password));
    if (b.connection_url !== undefined) {
      set('connection_url', b.connection_url ? encryptSecret(b.connection_url.trim()) : null);
    }
    if (b.options !== undefined) set('options', b.options ? JSON.stringify(b.options) : null);

    if (sets.length) {
      set('updated_at', now());
      vals.push(d.id);
      await db.prepare(`UPDATE databases SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
    }
    const row = await db.prepare('SELECT * FROM databases WHERE id = ?').get(d.id);
    return { database: databaseView(row) };
  });

  fastify.delete('/:id', async (request, reply) => {
    const d = await ownDatabase(request, reply);
    if (!d) return;
    await db.prepare('DELETE FROM databases WHERE id = ?').run(d.id);
    return { ok: true };
  });

  // Test a stored database connection.
  fastify.post('/:id/test', async (request, reply) => {
    const d = await ownDatabase(request, reply);
    if (!d) return;
    const result = await testConnection(d);
    return result;
  });

  // List a project's attached databases + the env KEYS each injects (read-only
  // managed-vars preview) and any cross-attachment key collisions.
  fastify.get('/project/:projectId/attachments', async (request, reply) => {
    const p = await ownProject(request, reply, request.params.projectId);
    if (!p) return;
    const rows = await db
      .prepare(
        `SELECT pd.id AS attachment_id, pd.scope, pd.env_prefix, pd.created_at AS attached_at, d.*
           FROM project_databases pd
           JOIN databases d ON d.id = pd.database_id
          WHERE pd.project_id = ?
          ORDER BY pd.created_at, pd.id`
      )
      .all(p.id);

    const seen = new Map(); // key -> first attachment name
    const attachments = rows.map((r) => {
      const keys = envKeysFor(r, r.env_prefix);
      const collisions = [];
      for (const k of keys) {
        if (seen.has(k)) collisions.push(k);
        else seen.set(k, r.name);
      }
      return {
        attachment_id: r.attachment_id,
        database_id: r.id,
        name: r.name,
        engine: r.engine,
        scope: r.scope,
        env_prefix: r.env_prefix,
        attached_at: r.attached_at,
        keys,
        collisions,
      };
    });
    return { attachments };
  });

  // Attach a database to a project. Enforces no env-key collisions at attach time
  // (a 2nd same-engine attach must carry a non-empty env_prefix).
  fastify.post('/project/:projectId/attach', async (request, reply) => {
    const p = await ownProject(request, reply, request.params.projectId);
    if (!p) return;
    const b = request.body || {};
    const databaseId = b.database_id;
    if (!databaseId) return reply.code(400).send({ error: 'database_id is required' });

    const d = await db.prepare('SELECT * FROM databases WHERE id = ?').get(databaseId);
    if (!d || d.user_id !== request.user.sub) {
      return reply.code(404).send({ error: 'database not found' });
    }

    const exists = await db
      .prepare('SELECT id FROM project_databases WHERE project_id = ? AND database_id = ?')
      .get(p.id, databaseId);
    if (exists) return reply.code(409).send({ error: 'database already attached' });

    const scope = ['all', 'production', 'preview'].includes(b.scope) ? b.scope : 'all';
    const envPrefix = normalizePrefix(b.env_prefix) || null;

    // Collision check against already-attached databases.
    const existing = await db
      .prepare(
        `SELECT pd.env_prefix, d.* FROM project_databases pd
           JOIN databases d ON d.id = pd.database_id
          WHERE pd.project_id = ?`
      )
      .all(p.id);
    const usedKeys = new Set();
    for (const e of existing) for (const k of envKeysFor(e, e.env_prefix)) usedKeys.add(k);
    const newKeys = envKeysFor(d, envPrefix);
    const collisions = newKeys.filter((k) => usedKeys.has(k));
    if (collisions.length) {
      return reply.code(400).send({
        error: `env var name collision: ${collisions.join(', ')}. Set a unique env prefix for this database.`,
        collisions,
      });
    }

    const id = nanoid();
    await db
      .prepare(
        `INSERT INTO project_databases (id, project_id, database_id, scope, env_prefix, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(id, p.id, databaseId, scope, envPrefix, now());
    return { ok: true, attachment_id: id, keys: newKeys };
  });

  // Detach a database from a project.
  fastify.delete('/project/:projectId/attach/:databaseId', async (request, reply) => {
    const p = await ownProject(request, reply, request.params.projectId);
    if (!p) return;
    await db
      .prepare('DELETE FROM project_databases WHERE project_id = ? AND database_id = ?')
      .run(p.id, request.params.databaseId);
    return { ok: true };
  });
}
