import { db } from '../db/index.js';
import { getQuotas, updateQuotas, computeUsage, checkDeployQuota } from '../services/quotas.js';

export default async function quotaRoutes(fastify) {
  fastify.addHook('onRequest', fastify.authenticate);

  fastify.get('/', async (request) => {
    return { quotas: getQuotas(request.user.sub) };
  });

  fastify.get('/usage', async (request) => {
    return { usage: computeUsage(request.user.sub) };
  });

  fastify.get('/status', async (request) => {
    const check = checkDeployQuota(request.user.sub);
    const quotas = getQuotas(request.user.sub);
    return {
      quotas,
      usage: check.usage,
      allowed: check.allowed,
      warnings: check.warnings || [],
      reason: check.reason || null,
    };
  });

  fastify.patch('/', async (request, reply) => {
    const user = db.prepare('SELECT role FROM users WHERE id = ?').get(request.user.sub);
    if (user?.role !== 'admin') return reply.code(403).send({ error: 'admin only' });

    const { user_id, ...updates } = request.body || {};
    const targetUser = user_id || request.user.sub;
    return { quotas: updateQuotas(targetUser, updates) };
  });
}
