import { nanoid } from 'nanoid';
import { db } from '../db/index.js';

async function ownProject(request, reply) {
  const p = await db.prepare('SELECT * FROM projects WHERE id = ?').get(request.params.projectId);
  if (!p || p.user_id !== request.user.sub) {
    reply.code(404).send({ error: 'project not found' });
    return null;
  }
  return p;
}

export default async function envRoutes(fastify) {
  fastify.addHook('onRequest', fastify.authenticate);

  fastify.get('/:projectId', async (request, reply) => {
    const p = await ownProject(request, reply);
    if (!p) return;
    const rows = await db
      .prepare('SELECT id, scope, `key`, value FROM env_vars WHERE project_id = ? ORDER BY `key`')
      .all(p.id);
    return { env: rows };
  });

  fastify.put('/:projectId', async (request, reply) => {
    const p = await ownProject(request, reply);
    if (!p) return;
    const items = Array.isArray(request.body?.env) ? request.body.env : [];
    await db.tx(async (q) => {
      await q.prepare('DELETE FROM env_vars WHERE project_id = ?').run(p.id);
      const ins = q.prepare(
        'INSERT OR REPLACE INTO env_vars (id, project_id, scope, `key`, value) VALUES (?, ?, ?, ?, ?)'
      );
      for (const e of items) {
        if (!e.key) continue;
        await ins.run(nanoid(), p.id, e.scope || 'all', e.key, String(e.value ?? ''));
      }
    });
    const rows = await db
      .prepare('SELECT id, scope, `key`, value FROM env_vars WHERE project_id = ? ORDER BY `key`')
      .all(p.id);
    return { env: rows };
  });
}
