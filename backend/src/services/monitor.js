import { request as httpRequest } from 'node:http';
import { db } from '../db/index.js';

const INTERVAL_MS = Number(process.env.HEALTH_INTERVAL_MS || 30000);
const TIMEOUT_MS = 5000;
const RETENTION = 500;

function pingPort(hostPort) {
  return new Promise((resolve) => {
    const started = Date.now();
    const req = httpRequest(
      { host: '127.0.0.1', port: hostPort, path: '/', method: 'GET', timeout: TIMEOUT_MS },
      (res) => {
        const latency = Date.now() - started;
        res.resume();
        resolve({ ok: res.statusCode < 500, status_code: res.statusCode, latency_ms: latency });
      }
    );
    req.on('timeout', () => {
      req.destroy();
      resolve({ ok: false, status_code: null, latency_ms: Date.now() - started, error: 'timeout' });
    });
    req.on('error', (err) => {
      resolve({ ok: false, status_code: null, latency_ms: Date.now() - started, error: err.code || err.message });
    });
    req.end();
  });
}

async function tick() {
  const running = await db
    .prepare(`SELECT id, host_port FROM deployments WHERE status = 'running' AND host_port IS NOT NULL`)
    .all();
  for (const d of running) {
    const r = await pingPort(d.host_port);
    await db.prepare(
      `INSERT INTO health_checks (deployment_id, ok, status_code, latency_ms, error, ts)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(d.id, r.ok ? 1 : 0, r.status_code ?? null, r.latency_ms ?? null, r.error ?? null, Date.now());
    await db.prepare(
      `DELETE FROM health_checks WHERE deployment_id = ? AND id NOT IN
        (SELECT id FROM health_checks WHERE deployment_id = ? ORDER BY id DESC LIMIT ?)`
    ).run(d.id, d.id, RETENTION);
  }
}

let timer = null;
export function startMonitor() {
  if (timer) return;
  timer = setInterval(async () => { await tick().catch(() => {}); }, INTERVAL_MS);
  setTimeout(async () => { await tick().catch(() => {}); }, 4000);
}

export async function getHealth(deploymentId, { sinceId = 0, limit = 200 } = {}) {
  return await db
    .prepare(
      `SELECT id, ok, status_code, latency_ms, error, ts FROM health_checks
       WHERE deployment_id = ? AND id > ? ORDER BY id DESC LIMIT ?`
    )
    .all(deploymentId, sinceId, limit);
}

export async function healthSummary(deploymentId) {
  const row = await db
    .prepare(
      `SELECT COUNT(*) total,
              SUM(ok) up,
              AVG(latency_ms) avg_latency,
              MAX(ts) last_ts
       FROM health_checks WHERE deployment_id = ?`
    )
    .get(deploymentId);
  const last = await db
    .prepare(`SELECT ok, status_code, latency_ms, error, ts FROM health_checks WHERE deployment_id = ? ORDER BY id DESC LIMIT 1`)
    .get(deploymentId);
  const total = row?.total || 0;
  return {
    total,
    up: row?.up || 0,
    uptime: total ? Math.round(((row.up || 0) / total) * 1000) / 10 : null,
    avg_latency: row?.avg_latency ? Math.round(row.avg_latency) : null,
    last: last || null,
  };
}
