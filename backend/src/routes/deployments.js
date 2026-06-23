import { db } from '../db/index.js';
import { stopDeployment, destroyPreview } from '../services/deploy.js';
import { getLogs } from '../services/logs.js';
import { getHealth, healthSummary } from '../services/monitor.js';
import { listDir, readFileSafe } from '../services/files.js';
import { getScreenshot, screenshotAvailable } from '../services/screenshot.js';
import { createReadStream } from 'fs';

async function ownProject(request, reply, projectId) {
  const p = await db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
  if (!p || p.user_id !== request.user.sub) {
    reply.code(404).send({ error: 'project not found' });
    return null;
  }
  return p;
}

async function ownDeployment(request, reply) {
  const d = await db.prepare('SELECT * FROM deployments WHERE id = ?').get(request.params.id);
  if (!d) {
    reply.code(404).send({ error: 'deployment not found' });
    return null;
  }
  const p = await db.prepare('SELECT user_id FROM projects WHERE id = ?').get(d.project_id);
  if (!p || p.user_id !== request.user.sub) {
    reply.code(404).send({ error: 'deployment not found' });
    return null;
  }
  return d;
}

export default async function deploymentRoutes(fastify) {
  fastify.addHook('onRequest', fastify.authenticate);

  fastify.get('/project/:projectId', async (request, reply) => {
    const p = await ownProject(request, reply, request.params.projectId);
    if (!p) return;
    const limit = Math.min(Number(request.query.limit) || 50, 200);
    const rows = await db
      .prepare('SELECT * FROM deployments WHERE project_id = ? ORDER BY created_at DESC LIMIT ?')
      .all(p.id, limit);
    return { deployments: rows };
  });

  fastify.get('/project/:projectId/previews', async (request, reply) => {
    const p = await ownProject(request, reply, request.params.projectId);
    if (!p) return;
    const rows = await db
      .prepare(`SELECT * FROM preview_deployments WHERE project_id = ? ORDER BY updated_at DESC`)
      .all(p.id);
    return { previews: rows };
  });

  fastify.get('/:id', async (request, reply) => {
    const d = await ownDeployment(request, reply);
    if (!d) return;
    return { deployment: d };
  });

  fastify.get('/:id/logs', async (request, reply) => {
    const d = await ownDeployment(request, reply);
    if (!d) return;
    const sinceId = Number(request.query.since) || 0;
    return { logs: await getLogs(d.id, { sinceId, stream: request.query.stream }) };
  });

  fastify.post('/:id/stop', async (request, reply) => {
    const d = await ownDeployment(request, reply);
    if (!d) return;
    await stopDeployment(d.id);
    return { ok: true };
  });

  fastify.get('/:id/screenshot', async (request, reply) => {
    const d = await ownDeployment(request, reply);
    if (!d) return;
    if (!screenshotAvailable()) return reply.code(503).send({ error: 'screenshot unavailable' });
    if (d.status !== 'running' || !d.url) return reply.code(409).send({ error: 'deployment not running' });
    const force = request.query.refresh === '1';
    const path = await getScreenshot(d.id, d.url, force);
    if (!path) return reply.code(502).send({ error: 'capture failed' });
    reply.header('Cache-Control', 'no-store');
    return reply.type('image/png').send(createReadStream(path));
  });

  fastify.get('/:id/health', async (request, reply) => {
    const d = await ownDeployment(request, reply);
    if (!d) return;
    const sinceId = Number(request.query.since) || 0;
    return { summary: await healthSummary(d.id), checks: await getHealth(d.id, { sinceId }) };
  });

  fastify.get('/:id/files', async (request, reply) => {
    const d = await ownDeployment(request, reply);
    if (!d) return;
    try {
      return await listDir(d.id, request.query.path || '');
    } catch (err) {
      const code = err.code === 'ETRAVERSE' ? 400 : err.code === 'ENOENT' ? 404 : 500;
      return reply.code(code).send({ error: err.message });
    }
  });

  fastify.get('/:id/file', async (request, reply) => {
    const d = await ownDeployment(request, reply);
    if (!d) return;
    if (!request.query.path) return reply.code(400).send({ error: 'path required' });
    try {
      return await readFileSafe(d.id, request.query.path);
    } catch (err) {
      const code = err.code === 'ETRAVERSE' ? 400 : err.code === 'ENOFILE' ? 404 : 500;
      return reply.code(code).send({ error: err.message });
    }
  });

  fastify.delete('/preview/:previewId', async (request, reply) => {
    const pv = await db.prepare('SELECT * FROM preview_deployments WHERE id = ?').get(request.params.previewId);
    if (!pv) return reply.code(404).send({ error: 'preview not found' });
    const p = await ownProject(request, reply, pv.project_id);
    if (!p) return;
    const res = await destroyPreview(p, { branch: pv.branch, prNumber: pv.pr_number });
    return { ok: true, ...res };
  });
}
