import { db } from '../db/index.js';
import { getSetting, setSetting, getSecretSetting, setSecretSetting } from '../services/settings.js';
import { registrationAllowed } from './auth.js';
import { verifyToken, listZones } from '../services/cloudflare.js';
import { hashPassword } from '../util/crypto.js';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import os from 'node:os';

const execAsync = promisify(exec);

function requireAdmin(request, reply) {
  const u = db.prepare('SELECT role FROM users WHERE id = ?').get(request.user.sub);
  if (!u || u.role !== 'admin') {
    reply.code(403).send({ error: 'admin only' });
    return false;
  }
  return true;
}

export default async function adminRoutes(fastify) {
  fastify.addHook('onRequest', fastify.authenticate);

  fastify.get('/defaults', async (request, reply) => {
    if (!requireAdmin(request, reply)) return;
    const zoneName = getSetting('default_zone_name');
    const tunnel = getSetting('default_tunnel_cname');
    const hasToken = Boolean(getSetting('default_cf_token'));
    return {
      configured: Boolean(hasToken && getSetting('default_zone_id') && zoneName && tunnel),
      has_token: hasToken,
      zone_id: getSetting('default_zone_id') || null,
      zone_name: zoneName || null,
      tunnel_cname: tunnel || null,
    };
  });

  fastify.post('/defaults/zones', async (request, reply) => {
    if (!requireAdmin(request, reply)) return;
    const token = String(request.body?.token || '').trim() || getSecretSetting('default_cf_token');
    if (!token) return reply.code(400).send({ error: 'token required' });
    try {
      const status = await verifyToken(token);
      if (status !== 'active') return reply.code(401).send({ error: `token status: ${status}` });
      return { zones: await listZones(token) };
    } catch (err) {
      return reply.code(401).send({ error: err.message });
    }
  });

  fastify.post('/defaults', async (request, reply) => {
    if (!requireAdmin(request, reply)) return;
    const b = request.body || {};
    if (typeof b.token === 'string' && b.token.trim()) setSecretSetting('default_cf_token', b.token.trim());
    if (typeof b.zone_id === 'string') setSetting('default_zone_id', b.zone_id.trim());
    if (typeof b.zone_name === 'string') setSetting('default_zone_name', b.zone_name.trim());
    if (typeof b.tunnel_cname === 'string') setSetting('default_tunnel_cname', b.tunnel_cname.trim().replace(/^https?:\/\//, ''));
    return { ok: true };
  });

  fastify.post('/defaults/clear', async (request, reply) => {
    if (!requireAdmin(request, reply)) return;
    for (const k of ['default_cf_token', 'default_zone_id', 'default_zone_name', 'default_tunnel_cname']) setSetting(k, '');
    return { ok: true };
  });

  fastify.get('/settings', async (request, reply) => {
    if (!requireAdmin(request, reply)) return;
    return { allow_registration: registrationAllowed() };
  });

  fastify.post('/settings', async (request, reply) => {
    if (!requireAdmin(request, reply)) return;
    const b = request.body || {};
    if (typeof b.allow_registration === 'boolean') {
      setSetting('allow_registration', String(b.allow_registration));
    }
    return { ok: true, allow_registration: registrationAllowed() };
  });


  fastify.get('/users', async (request, reply) => {
    if (!requireAdmin(request, reply)) return;
    const users = db.prepare(
      `SELECT id, email, role, created_at, github_login, github_avatar FROM users ORDER BY created_at DESC`
    ).all();
    const enriched = users.map((u) => {
      const projectCount = db.prepare('SELECT COUNT(*) c FROM projects WHERE user_id = ?').get(u.id).c;
      const deployCount = db.prepare(
        `SELECT COUNT(*) c FROM deployments d JOIN projects p ON p.id = d.project_id WHERE p.user_id = ?`
      ).get(u.id).c;
      const runningCount = db.prepare(
        `SELECT COUNT(*) c FROM containers c JOIN projects p ON p.id = c.project_id WHERE p.user_id = ? AND c.status = 'running'`
      ).get(u.id).c;
      const suspended = getSetting(`user_suspended_${u.id}`) === '1';
      return { ...u, projectCount, deployCount, runningCount, suspended };
    });
    return { users: enriched };
  });

  fastify.post('/users/:id/suspend', async (request, reply) => {
    if (!requireAdmin(request, reply)) return;
    const { id } = request.params;
    const current = getSetting(`user_suspended_${id}`);
    const newVal = current === '1' ? '0' : '1';
    setSetting(`user_suspended_${id}`, newVal);
    return { suspended: newVal === '1' };
  });

  fastify.post('/users/:id/password', async (request, reply) => {
    if (!requireAdmin(request, reply)) return;
    const { id } = request.params;
    const { password } = request.body || {};
    if (!password || password.length < 8) return reply.code(400).send({ error: 'password min 8 chars' });
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(password), id);
    return { ok: true };
  });

  fastify.delete('/users/:id', async (request, reply) => {
    if (!requireAdmin(request, reply)) return;
    const { id } = request.params;
    if (id === request.user.sub) return reply.code(400).send({ error: 'cannot delete yourself' });
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    return { ok: true };
  });

  fastify.post('/users/:id/role', async (request, reply) => {
    if (!requireAdmin(request, reply)) return;
    const { id } = request.params;
    const { role } = request.body || {};
    if (!['admin', 'user'].includes(role)) return reply.code(400).send({ error: 'role must be admin or user' });
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
    return { ok: true };
  });


  fastify.get('/system', async (request, reply) => {
    if (!requireAdmin(request, reply)) return;

    const loadAvg = os.loadavg();
    const cpuCores = os.cpus().length;
    const cpuPercent = Math.round((loadAvg[0] / cpuCores) * 100);

    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memPercent = Math.round((usedMem / totalMem) * 100);

    let diskTotal = 0, diskUsed = 0, diskPercent = 0;
    let dockerContainers = { running: 0, stopped: 0, total: 0 };

    const [dfRes, psRes] = await Promise.allSettled([
      execAsync("df -B1 / | tail -1", { timeout: 3000 }),
      execAsync("docker ps -a --format '{{.Status}}'", { timeout: 5000 }),
    ]);

    if (dfRes.status === 'fulfilled') {
      const parts = dfRes.value.stdout.trim().split(/\s+/);
      diskTotal = parseInt(parts[1]) || 0;
      diskUsed = parseInt(parts[2]) || 0;
      diskPercent = diskTotal ? Math.round((diskUsed / diskTotal) * 100) : 0;
    }

    if (psRes.status === 'fulfilled') {
      const lines = psRes.value.stdout.trim().split('\n').filter(Boolean);
      dockerContainers.total = lines.length;
      dockerContainers.running = lines.filter((l) => l.startsWith('Up')).length;
      dockerContainers.stopped = dockerContainers.total - dockerContainers.running;
    }

    const totalUsers = db.prepare('SELECT COUNT(*) c FROM users').get().c;
    const totalProjects = db.prepare('SELECT COUNT(*) c FROM projects').get().c;
    const totalDeployments = db.prepare('SELECT COUNT(*) c FROM deployments').get().c;
    const runningDeployments = db.prepare("SELECT COUNT(*) c FROM deployments WHERE status = 'running'").get().c;

    const uptime = Math.round(os.uptime());

    return {
      cpu: { percent: cpuPercent, cores: cpuCores, loadAvg: loadAvg.map((l) => Math.round(l * 100) / 100) },
      memory: { percent: memPercent, used: usedMem, total: totalMem },
      disk: { percent: diskPercent, used: diskUsed, total: diskTotal },
      docker: dockerContainers,
      platform: { users: totalUsers, projects: totalProjects, deployments: totalDeployments, running: runningDeployments },
      uptime,
    };
  });

  fastify.get('/system/history', async (request, reply) => {
    if (!requireAdmin(request, reply)) return;
    const raw = getSetting('system_metrics_history');
    const history = raw ? JSON.parse(raw) : [];
    return { history };
  });
}
