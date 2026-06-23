import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { config } from '../config.js';
import { verifyGithubSignature } from '../util/crypto.js';
import { createDeployment, destroyPreview } from '../services/deploy.js';

async function audit({ projectId, event, action, deliveryId, ref, ok, message }) {
  await db.prepare(
    `INSERT INTO webhooks (id, project_id, event, action, delivery_id, ref, ok, message, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(nanoid(), projectId || null, event, action || null, deliveryId || null, ref || null, ok ? 1 : 0, message || null, Date.now());
}

export default async function webhookRoutes(fastify) {
  fastify.post('/github/:projectId', async (request, reply) => {
    const project = await db.prepare('SELECT * FROM projects WHERE id = ?').get(request.params.projectId);
    const event = request.headers['x-github-event'];
    const deliveryId = request.headers['x-github-delivery'];
    const signature = request.headers['x-hub-signature-256'];

    if (!project) {
      await audit({ event, deliveryId, ok: false, message: 'unknown project' });
      return reply.code(404).send({ error: 'project not found' });
    }

    const secret = project.webhook_secret || config.githubWebhookSecret;
    const raw = request.rawBody || Buffer.from(JSON.stringify(request.body || {}));
    if (!verifyGithubSignature(raw, signature, secret)) {
      await audit({ projectId: project.id, event, deliveryId, ok: false, message: 'bad signature' });
      return reply.code(401).send({ error: 'invalid signature' });
    }

    const payload = request.body || {};

    if (event === 'ping') {
      await audit({ projectId: project.id, event, deliveryId, ok: true, message: 'pong' });
      return { ok: true, pong: true };
    }

    if (event === 'push') {
      const ref = payload.ref || '';
      if (payload.deleted) {
        await audit({ projectId: project.id, event, action: 'deleted', deliveryId, ref, ok: true, message: 'branch deleted' });
        return { ok: true, skipped: 'branch deleted' };
      }
      const branch = ref.replace('refs/heads/', '');
      if (!branch) return { ok: true, skipped: 'non-branch ref' };

      let deployment;
      if (branch === project.branch) {
        deployment = await createDeployment(project, { type: 'production', branch, trigger: 'webhook' });
      } else if (project.preview_enabled) {
        deployment = await createDeployment(project, { type: 'preview', branch, trigger: 'webhook' });
      } else {
        await audit({ projectId: project.id, event, action: 'push', deliveryId, ref, ok: true, message: 'previews disabled' });
        return { ok: true, skipped: 'previews disabled' };
      }
      await audit({ projectId: project.id, event, action: 'push', deliveryId, ref, ok: true, message: `deploy ${deployment.id}` });
      return { ok: true, deployment_id: deployment.id, subdomain: deployment.subdomain };
    }

    if (event === 'pull_request') {
      const action = payload.action;
      const pr = payload.pull_request || {};
      const prNumber = payload.number || pr.number;
      const branch = pr.head?.ref;
      const ref = `pr/${prNumber}`;

      if (!project.preview_enabled) {
        await audit({ projectId: project.id, event, action, deliveryId, ref, ok: true, message: 'previews disabled' });
        return { ok: true, skipped: 'previews disabled' };
      }

      if (['opened', 'synchronize', 'reopened'].includes(action)) {
        const deployment = await createDeployment(project, { type: 'preview', branch, prNumber, trigger: 'webhook' });
        await audit({ projectId: project.id, event, action, deliveryId, ref, ok: true, message: `preview ${deployment.id}` });
        return { ok: true, deployment_id: deployment.id, subdomain: deployment.subdomain };
      }

      if (action === 'closed') {
        if (project.auto_destroy_pr) {
          const res = await destroyPreview(project, { branch, prNumber });
          await audit({ projectId: project.id, event, action, deliveryId, ref, ok: true, message: `destroyed ${res.subdomain}` });
          return { ok: true, destroyed: res };
        }
        await audit({ projectId: project.id, event, action, deliveryId, ref, ok: true, message: 'auto-destroy off' });
        return { ok: true, skipped: 'auto-destroy disabled' };
      }

      return { ok: true, skipped: `unhandled pull_request action: ${action}` };
    }

    await audit({ projectId: project.id, event, deliveryId, ok: true, message: 'ignored event' });
    return { ok: true, skipped: `unhandled event: ${event}` };
  });

  fastify.get('/deliveries/:projectId', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const p = await db.prepare('SELECT user_id FROM projects WHERE id = ?').get(request.params.projectId);
    if (!p || p.user_id !== request.user.sub) return reply.code(404).send({ error: 'not found' });
    const rows = await db
      .prepare('SELECT * FROM webhooks WHERE project_id = ? ORDER BY created_at DESC LIMIT 50')
      .all(request.params.projectId);
    return { deliveries: rows };
  });
}
