// Background poller: collect docker stats → accumulate into usage_records.
// Also collects system metrics (CPU, RAM, disk) for admin dashboard charts.
import { execSync } from 'node:child_process';
import os from 'node:os';
import { db } from '../db/index.js';
import { currentMonth } from './quotas.js';
import { getSetting, setSetting } from './settings.js';

const POLL_INTERVAL_MS = Number(process.env.USAGE_POLL_INTERVAL_MS || 60000);

function collectDockerStats() {
  let stdout;
  try {
    stdout = execSync(
      'docker stats --no-stream --format "{{.ID}}\t{{.CPUPerc}}\t{{.MemUsage}}"',
      { encoding: 'utf8', timeout: 10000 },
    );
  } catch {
    return; // Docker not available or no containers running.
  }

  const deltaSec = POLL_INTERVAL_MS / 1000;
  const month = currentMonth();
  const acc = new Map(); // userId -> { cpuSeconds, memBytesSeconds }

  for (const line of stdout.trim().split('\n')) {
    if (!line) continue;
    const parts = line.split('\t');
    if (parts.length < 3) continue;
    const [dockerIdShort, cpuPerc, memUsage] = parts;

    // Docker stats shows short ID (first 12 chars).
    const container = db.prepare(
      `SELECT c.*, p.user_id FROM containers c
       JOIN projects p ON p.id = c.project_id
       WHERE (c.docker_id LIKE ? OR c.docker_id = ?) AND c.status = 'running'
       LIMIT 1`
    ).get(`${dockerIdShort}%`, dockerIdShort);
    if (!container) continue;

    const cpuFraction = parseFloat(cpuPerc) / 100 || 0;
    const cpuSeconds = cpuFraction * deltaSec;

    let memBytes = 0;
    const memStr = (memUsage.split('/')[0] || '').trim();
    if (memStr.endsWith('GiB')) memBytes = parseFloat(memStr) * 1024 ** 3;
    else if (memStr.endsWith('MiB')) memBytes = parseFloat(memStr) * 1024 ** 2;
    else if (memStr.endsWith('KiB')) memBytes = parseFloat(memStr) * 1024;
    else memBytes = parseFloat(memStr) || 0;
    const memBytesSeconds = memBytes * deltaSec;

    const cur = acc.get(container.user_id) || { cpuSeconds: 0, memBytesSeconds: 0 };
    cur.cpuSeconds += cpuSeconds;
    cur.memBytesSeconds += memBytesSeconds;
    acc.set(container.user_id, cur);
  }

  const stmt = db.prepare(
    `INSERT INTO usage_records (user_id, month, cpu_seconds, memory_bytes_seconds)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id, month) DO UPDATE SET
       cpu_seconds = cpu_seconds + excluded.cpu_seconds,
       memory_bytes_seconds = memory_bytes_seconds + excluded.memory_bytes_seconds`
  );

  for (const [userId, vals] of acc) {
    stmt.run(userId, month, vals.cpuSeconds, vals.memBytesSeconds);
  }
}

// Called when a deployment finishes (success or failure) to record build time.
export function recordBuildTime(deploymentId) {
  const dep = db.prepare(
    `SELECT d.*, p.user_id FROM deployments d
     JOIN projects p ON p.id = d.project_id
     WHERE d.id = ?`
  ).get(deploymentId);
  if (!dep || !dep.finished_at || !dep.created_at) return;

  const buildSeconds = Math.max(0, (dep.finished_at - dep.created_at) / 1000);
  const month = currentMonth();

  db.prepare(
    `INSERT INTO usage_records (user_id, month, build_seconds)
     VALUES (?, ?, ?)
     ON CONFLICT(user_id, month) DO UPDATE SET
       build_seconds = build_seconds + excluded.build_seconds`
  ).run(dep.user_id, month, buildSeconds);
}

// Collect system metrics snapshot for admin dashboard charts.
function collectSystemMetrics() {
  const loadAvg = os.loadavg();
  const cpuCores = os.cpus().length;
  const cpuPercent = Math.round((loadAvg[0] / cpuCores) * 100);

  const totalMem = os.totalmem();
  const usedMem = totalMem - os.freemem();
  const memPercent = Math.round((usedMem / totalMem) * 100);

  let diskPercent = 0;
  try {
    const dfOut = execSync("df -B1 / | tail -1", { encoding: 'utf8', timeout: 3000 });
    const parts = dfOut.trim().split(/\s+/);
    const diskTotal = parseInt(parts[1]) || 1;
    const diskUsed = parseInt(parts[2]) || 0;
    diskPercent = Math.round((diskUsed / diskTotal) * 100);
  } catch { /* ignore */ }

  const point = { t: Date.now(), cpu: cpuPercent, ram: memPercent, disk: diskPercent };
  const raw = getSetting('system_metrics_history');
  const history = raw ? JSON.parse(raw) : [];
  history.push(point);
  // Keep last 360 points (~6h at 1/min).
  if (history.length > 360) history.splice(0, history.length - 360);
  setSetting('system_metrics_history', JSON.stringify(history));
}

let timer = null;
export function startUsageMonitor() {
  if (timer) return;
  timer = setInterval(() => {
    try { collectDockerStats(); } catch (e) { console.error('Usage monitor error:', e.message); }
  }, POLL_INTERVAL_MS);
  // System metrics every 60s.
  setInterval(() => {
    try { collectSystemMetrics(); } catch { /* ignore */ }
  }, 60000);
  // Initial collection after 10s.
  setTimeout(() => {
    try { collectDockerStats(); } catch { /* ignore */ }
    try { collectSystemMetrics(); } catch { /* ignore */ }
  }, 10000);
}
