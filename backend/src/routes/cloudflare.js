import { db } from '../db/index.js';
import { config } from '../config.js';
import { getSetting, setSetting } from '../services/settings.js';
import { encryptSecret, decryptSecret } from '../util/crypto.js';
import {
  verifyToken,
  listZones,
  upsertCname,
  deleteRecord,
  tunnelCname,
} from '../services/cloudflare.js';

function conn(userId) {
  const row = db.prepare('SELECT cf_token, cf_account FROM users WHERE id = ?').get(userId);
  if (row?.cf_token) row.cf_token = decryptSecret(row.cf_token);
  return row;
}
function ownProject(request, reply) {
  const p = db.prepare('SELECT * FROM projects WHERE id = ?').get(request.params.id);
  if (!p || p.user_id !== request.user.sub) {
    reply.code(404).send({ error: 'project not found' });
    return null;
  }
  return p;
}

async function resolveTunnelTarget(token, account) {
  const manual = getSetting('cf_tunnel_cname');
  if (manual) return manual;
  const auto = await tunnelCname(token, account, config.cfTunnelName).catch(() => null);
  return auto;
}

export default async function cloudflareRoutes(fastify) {
  fastify.addHook('onRequest', fastify.authenticate);

  fastify.get('/status', async (request) => {
    const c = conn(request.user.sub);
    return {
      connected: Boolean(c?.cf_token),
      account: c?.cf_account || null,
      tunnel_cname: getSetting('cf_tunnel_cname') || null,
      tunnel_name: config.cfTunnelName,
    };
  });

  fastify.post('/connect', async (request, reply) => {
    const token = String(request.body?.token || '').trim();
    if (!token) return reply.code(400).send({ error: 'token required' });
    try {
      const status = await verifyToken(token);
      if (status !== 'active') return reply.code(401).send({ error: `token status: ${status}` });
      const zones = await listZones(token);
      const account = zones[0]?.account || null;
      db.prepare('UPDATE users SET cf_token = ?, cf_account = ? WHERE id = ?').run(encryptSecret(token), account, request.user.sub);
      return { ok: true, account, zones };
    } catch (err) {
      return reply.code(401).send({ error: err.message });
    }
  });

  fastify.post('/disconnect', async (request) => {
    db.prepare('UPDATE users SET cf_token = NULL, cf_account = NULL WHERE id = ?').run(request.user.sub);
    return { ok: true };
  });

  fastify.get('/zones', async (request, reply) => {
    const c = conn(request.user.sub);
    if (!c?.cf_token) return reply.code(400).send({ error: 'Cloudflare not connected' });
    try {
      return { zones: await listZones(c.cf_token) };
    } catch (err) {
      return reply.code(502).send({ error: err.message });
    }
  });

  fastify.post('/tunnel', async (request) => {
    const cname = String(request.body?.tunnel_cname || '').trim();
    setSetting('cf_tunnel_cname', cname);
    return { ok: true, tunnel_cname: cname };
  });

  fastify.post('/project/:id/domain', async (request, reply) => {
    const p = ownProject(request, reply);
    if (!p) return;
    const c = conn(request.user.sub);
    if (!c?.cf_token) return reply.code(400).send({ error: 'Cloudflare not connected' });

    const zoneId = request.body?.zone_id;
    const zoneName = request.body?.zone_name;
    if (!zoneId || !zoneName) return reply.code(400).send({ error: 'zone_id and zone_name required' });

    const target = await resolveTunnelTarget(c.cf_token, c.cf_account);
    if (!target) {
      return reply.code(400).send({
        error: 'tunnel CNAME target unknown — set it in Settings → Cloudflare (e.g. <tunnel-uuid>.cfargotunnel.com)',
      });
    }

    const hostname = `${p.slug}.${zoneName}`;
    try {
      const { recordId, updated } = await upsertCname(c.cf_token, zoneId, hostname, target);
      db.prepare(
        'UPDATE projects SET cf_zone_id = ?, cf_zone_name = ?, cf_record_id = ?, cf_tunnel_cname = ?, updated_at = ? WHERE id = ?'
      ).run(zoneId, zoneName, recordId, target, Date.now(), p.id);
      return { ok: true, hostname, target, updated, url: `https://${hostname}` };
    } catch (err) {
      return reply.code(502).send({ error: err.message });
    }
  });

  fastify.delete('/project/:id/domain', async (request, reply) => {
    const p = ownProject(request, reply);
    if (!p) return;
    const c = conn(request.user.sub);
    if (c?.cf_token && p.cf_zone_id && p.cf_record_id) {
      await deleteRecord(c.cf_token, p.cf_zone_id, p.cf_record_id);
    }
    db.prepare('UPDATE projects SET cf_zone_id = NULL, cf_zone_name = NULL, cf_record_id = NULL WHERE id = ?').run(p.id);
    return { ok: true };
  });
}
