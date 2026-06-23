// Quota management — limits, usage computation, and enforcement.
import { db } from '../db/index.js';
import { execSync } from 'node:child_process';
import { config } from '../config.js';

export const DEFAULT_QUOTAS = {
  max_projects: 3,
  max_deployments_mo: 10,
  max_running: 5,
  max_build_minutes_mo: 30,
  max_storage_gb: 5,
  max_bandwidth_gb_mo: 50,
  max_cpu_hours_mo: 10,
  max_memory_gbh_mo: 20,
};

export function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function monthStartTs(month) {
  return new Date((month || currentMonth()) + '-01T00:00:00Z').getTime();
}

// Ensure a user_quotas row exists (INSERT OR IGNORE uses schema defaults).
export function ensureQuotas(userId) {
  db.prepare('INSERT OR IGNORE INTO user_quotas (user_id) VALUES (?)').run(userId);
}

export function getQuotas(userId) {
  ensureQuotas(userId);
  return db.prepare('SELECT * FROM user_quotas WHERE user_id = ?').get(userId);
}

export function updateQuotas(userId, updates) {
  ensureQuotas(userId);
  const fields = [];
  const values = [];
  for (const [key, val] of Object.entries(updates)) {
    if (key in DEFAULT_QUOTAS) {
      fields.push(`${key} = ?`);
      values.push(Number(val));
    }
  }
  if (fields.length) {
    values.push(userId);
    db.prepare(`UPDATE user_quotas SET ${fields.join(', ')} WHERE user_id = ?`).run(...values);
  }
  return getQuotas(userId);
}

// Approximate storage used by the user's checkout directories.
function computeStorageGb(userId) {
  try {
    const projects = db.prepare('SELECT id FROM projects WHERE user_id = ?').all(userId);
    let totalBytes = 0;
    for (const p of projects) {
      const deps = db.prepare('SELECT id FROM deployments WHERE project_id = ?').all(p.id);
      for (const d of deps) {
        try {
          const dir = `${config.workDir}/builds/${d.id}`;
          const out = execSync(`du -sb "${dir}" 2>/dev/null`, { encoding: 'utf8', timeout: 2000 });
          totalBytes += parseInt(out.split('\t')[0]) || 0;
        } catch { /* dir doesn't exist */ }
      }
    }
    return totalBytes / (1024 * 1024 * 1024);
  } catch {
    return 0;
  }
}

// Compute all usage metrics for a user — combines live DB queries + cumulative records.
export function computeUsage(userId) {
  const quotas = getQuotas(userId);
  const month = currentMonth();
  const mStart = monthStartTs(month);

  const usage = db.prepare('SELECT * FROM usage_records WHERE user_id = ? AND month = ?').get(userId, month) || {
    cpu_seconds: 0, memory_bytes_seconds: 0, bandwidth_bytes: 0, build_seconds: 0,
  };

  const projects = db.prepare('SELECT COUNT(*) c FROM projects WHERE user_id = ?').get(userId).c;

  const deploymentsMo = db.prepare(
    `SELECT COUNT(*) c FROM deployments d
     JOIN projects p ON p.id = d.project_id
     WHERE p.user_id = ? AND d.created_at >= ?`
  ).get(userId, mStart).c;

  const running = db.prepare(
    `SELECT COUNT(*) c FROM containers c
     JOIN projects p ON p.id = c.project_id
     WHERE p.user_id = ? AND c.status = 'running'`
  ).get(userId).c;

  const storageGb = computeStorageGb(userId);

  return {
    projects:                  { used: projects, soft: Math.floor(quotas.max_projects * 0.8), limit: quotas.max_projects },
    deployments_monthly:       { used: deploymentsMo, soft: Math.floor(quotas.max_deployments_mo * 0.8), limit: quotas.max_deployments_mo },
    running_containers:        { used: running, soft: Math.floor(quotas.max_running * 0.8), limit: quotas.max_running },
    build_minutes_monthly:     { used: Math.round((usage.build_seconds || 0) / 60), soft: Math.floor(quotas.max_build_minutes_mo * 0.8), limit: quotas.max_build_minutes_mo },
    storage_gb:                { used: Math.round(storageGb * 100) / 100, soft: +(quotas.max_storage_gb * 0.8).toFixed(2), limit: quotas.max_storage_gb },
    bandwidth_gb_monthly:      { used: Math.round(((usage.bandwidth_bytes || 0) / (1024 ** 3)) * 100) / 100, soft: +(quotas.max_bandwidth_gb_mo * 0.8).toFixed(2), limit: quotas.max_bandwidth_gb_mo },
    cpu_hours_monthly:         { used: Math.round(((usage.cpu_seconds || 0) / 3600) * 100) / 100, soft: +(quotas.max_cpu_hours_mo * 0.8).toFixed(2), limit: quotas.max_cpu_hours_mo },
    memory_gb_hours_monthly:   { used: Math.round(((usage.memory_bytes_seconds || 0) / (1024 ** 3) / 3600) * 100) / 100, soft: +(quotas.max_memory_gbh_mo * 0.8).toFixed(2), limit: quotas.max_memory_gbh_mo },
  };
}

// Check if a deploy should be allowed. Returns { allowed, warnings, reason, usage }.
export function checkDeployQuota(userId) {
  const usage = computeUsage(userId);
  const SOFT_THRESHOLD = 0.8;

  // Hard-limit checks — these block deploys.
  const hardChecks = [
    ['projects', 'Maximum project limit reached'],
    ['deployments_monthly', 'Monthly deployment limit reached'],
    ['running_containers', 'Maximum running containers reached'],
  ];
  for (const [key, msg] of hardChecks) {
    if (usage[key].limit > 0 && usage[key].used >= usage[key].limit) {
      return { allowed: false, reason: `${msg}. Upgrade to resume service.`, usage };
    }
  }

  // Soft-limit warnings.
  const warnings = [];
  for (const [key, val] of Object.entries(usage)) {
    if (val.limit > 0 && val.used / val.limit >= SOFT_THRESHOLD) {
      warnings.push({ key, used: val.used, limit: val.limit });
    }
  }

  return { allowed: true, warnings, usage };
}
