import { nanoid } from 'nanoid';
import { db } from '../db/index.js';

function ownProject(request, reply) {
  const p = db.prepare('SELECT * FROM projects WHERE id = ?').get(request.params.projectId);
  if (!p || p.user_id !== request.user.sub) {
    reply.code(404).send({ error: 'project not found' });
    return null;
  }
  return p;
}

export default async function envRoutes(fastify) {
  fastify.addHook('onRequest', fastify.authenticate);

  fastify.get('/:projectId', async (request, reply) => {
    const p = ownProject(request, reply);
    if (!p) return;
    const rows = db
      .prepare('SELECT id, scope, key, value FROM env_vars WHERE project_id = ? ORDER BY key')
      .all(p.id);
    return { env: rows };
  });

  fastify.put('/:projectId', async (request, reply) => {
    const p = ownProject(request, reply);
    if (!p) return;
    const items = Array.isArray(request.body?.env) ? request.body.env : [];
    const tx = db.transaction(() => {
      db.prepare('DELETE FROM env_vars WHERE project_id = ?').run(p.id);
      const ins = db.prepare(
        'INSERT OR REPLACE INTO env_vars (id, project_id, scope, key, value) VALUES (?, ?, ?, ?, ?)'
      );
      for (const e of items) {
        if (!e.key) continue;
        ins.run(nanoid(), p.id, e.scope || 'all', e.key, String(e.value ?? ''));
      }
    });
    tx();
    const rows = db
      .prepare('SELECT id, scope, key, value FROM env_vars WHERE project_id = ? ORDER BY key')
      .all(p.id);
    return { env: rows };
  });
}
