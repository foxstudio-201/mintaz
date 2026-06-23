import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { config } from '../config.js';
import { enqueue } from './queue.js';
import { logger, appendLog } from './logs.js';
import { cloneRepo, cleanupCheckout, checkoutDir } from './git.js';
import { resolveBuild } from './dockerfile.js';
import { subdomainFor } from '../util/slug.js';
import {
  ensureNetwork,
  allocateHostPort,
  buildImage,
  runContainer,
  stopContainer,
  removeContainer,
  removeImage,
  followLogs,
  dockerAvailable,
} from './docker.js';
import { syncProxy } from './proxy.js';
import { upsertCname } from './cloudflare.js';
import { importRepoEnv } from './envscan.js';
import { getSetting, getSecretSetting } from './settings.js';
import { decryptSecret } from '../util/crypto.js';
import { checkDeployQuota } from './quotas.js';
import { recordBuildTime } from './usage-monitor.js';

const runtimeFollowers = new Map();

async function ensureProjectDns(project, subdomain, log) {
  if (project.cf_zone_id && project.cf_tunnel_cname) {
    const owner = db.prepare('SELECT cf_token FROM users WHERE id = ?').get(project.user_id);
    const ownerCfToken = owner?.cf_token ? decryptSecret(owner.cf_token) : null;
    if (ownerCfToken) {
      const hostname = `${project.slug}.${project.cf_zone_name}`;
      log(`▶ Cloudflare DNS: ${hostname} → ${project.cf_tunnel_cname}`);
      const { recordId } = await upsertCname(ownerCfToken, project.cf_zone_id, hostname, project.cf_tunnel_cname);
      if (recordId && recordId !== project.cf_record_id) {
        db.prepare('UPDATE projects SET cf_record_id = ? WHERE id = ?').run(recordId, project.id);
      }
      log(`✓ DNS ready: https://${hostname}`);
      return;
    }
  }

  const token = getSecretSetting('default_cf_token');
  const zoneId = getSetting('default_zone_id');
  const zoneName = getSetting('default_zone_name');
  const tunnel = getSetting('default_tunnel_cname');
  if (token && zoneId && zoneName && tunnel) {
    const hostname = `${subdomain}.${zoneName}`;
    log(`▶ Cloudflare DNS (default domain): ${hostname} → ${tunnel}`);
    await upsertCname(token, zoneId, hostname, tunnel);
    log(`✓ DNS ready: https://${hostname}`);
  }
}

function now() {
  return Date.now();
}

function setStatus(id, status, extra = {}) {
  const fields = ['status = ?', 'updated_at = ?'];
  const values = [status, now()];
  for (const [k, v] of Object.entries(extra)) {
    fields.push(`${k} = ?`);
    values.push(v);
  }
  values.push(id);
  db.prepare(`UPDATE deployments SET ${fields.join(', ')} WHERE id = ?`).run(...values);
}

function envFor(project, type) {
  const rows = db
    .prepare(`SELECT scope, key, value FROM env_vars WHERE project_id = ?`)
    .all(project.id);
  const env = {};
  for (const r of rows) {
    if (r.scope === 'all' || r.scope === type) env[r.key] = r.value;
  }
  return env;
}

export function createDeployment(project, { type = 'production', branch, prNumber = null, trigger = 'manual' } = {}) {
  const quotaCheck = checkDeployQuota(project.user_id);
  if (!quotaCheck.allowed) {
    throw new Error(quotaCheck.reason);
  }

  const b = branch || project.branch;
  const subdomain = subdomainFor({ slug: project.public_slug || project.slug, type, branch: b, prNumber });
  const id = nanoid();
  const ts = now();

  db.prepare(
    `INSERT INTO deployments
       (id, project_id, type, branch, pr_number, status, internal_port, subdomain, trigger, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'queued', ?, ?, ?, ?, ?)`
  ).run(id, project.id, type, b, prNumber, project.internal_port, subdomain, trigger, ts, ts);

  if (type === 'preview') {
    const pid = nanoid();
    const kind = prNumber != null ? 'pr' : 'branch';
    db.prepare(
      `INSERT INTO preview_deployments (id, project_id, deployment_id, kind, branch, pr_number, subdomain, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
       ON CONFLICT(project_id, subdomain) DO UPDATE SET
         deployment_id = excluded.deployment_id, status = 'active', updated_at = excluded.updated_at`
    ).run(pid, project.id, id, kind, b, prNumber, subdomain, ts, ts);
  }

  const deployment = db.prepare(`SELECT * FROM deployments WHERE id = ?`).get(id);
  enqueue(() => runPipeline(deployment.id), { type: 'deploy', id });
  return deployment;
}

export async function runPipeline(deploymentId) {
  const deployment = db.prepare(`SELECT * FROM deployments WHERE id = ?`).get(deploymentId);
  if (!deployment) return;
  const project = db.prepare(`SELECT * FROM projects WHERE id = ?`).get(deployment.project_id);
  const log = logger(deploymentId, 'build');

  try {
    if (!(await dockerAvailable())) {
      throw new Error('Docker is not available — is the daemon running and is this user in the docker group?');
    }
    await ensureNetwork();

    setStatus(deploymentId, 'cloning');
    log(`▶ Cloning ${project.repo_url} @ ${deployment.branch}`);
    const owner = db.prepare('SELECT github_token FROM users WHERE id = ?').get(project.user_id);
    const cloneToken =
      (project.git_token && decryptSecret(project.git_token)) ||
      (owner?.github_token && decryptSecret(owner.github_token)) ||
      config.githubToken;
    const { dir, sha, message } = await cloneRepo({
      repoUrl: project.repo_url,
      branch: deployment.branch,
      deploymentId,
      token: cloneToken,
      onLine: log,
    });
    setStatus(deploymentId, 'cloning', { commit_sha: sha, commit_msg: message });
    log(`✓ Checked out ${sha.slice(0, 8)} — ${message}`);

    importRepoEnv(project.id, dir, log);

    const { mode, dockerfile, internalPort: effPort, framework } = resolveBuild(project, dir);
    const internalPort = effPort || project.internal_port;
    log(
      `▶ Build strategy: ${
        mode === 'generated' ? `generated (${framework || 'node'}) → port ${internalPort}` : `repo ${dockerfile} → port ${internalPort}`
      }`
    );

    setStatus(deploymentId, 'building');
    const tag = `mintaz/${project.slug}:${deploymentId.slice(0, 12)}`;
    await buildImage({ contextDir: dir, dockerfile, tag, onLine: log });
    log(`✓ Image built: ${tag}`);

    setStatus(deploymentId, 'deploying', { image_tag: tag });
    const hostPort = await allocateHostPort();
    const containerName = `mintaz_${project.slug}_${deployment.subdomain}`.replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 60);
    const env = envFor(project, deployment.type);
    const containerId = await runContainer({
      tag,
      name: containerName,
      hostPort,
      internalPort,
      env,
      restartPolicy: project.restart_policy || config.defaultRestartPolicy,
      labels: { 'mintaz.project': project.slug, 'mintaz.deployment': deploymentId },
      onLine: log,
    });

    const url = `https://${deployment.subdomain}.${config.baseDomain}`;
    setStatus(deploymentId, 'running', {
      container_id: containerId,
      container_name: containerName,
      host_port: hostPort,
      internal_port: internalPort,
      url,
      finished_at: now(),
    });

    await supersedeContainers(project.id, deployment.subdomain, deploymentId);
    db.prepare(
      `INSERT INTO containers (id, project_id, deployment_id, docker_id, name, subdomain, host_port, internal_port, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'running', ?)`
    ).run(nanoid(), project.id, deploymentId, containerId, containerName, deployment.subdomain, hostPort, internalPort, now());

    log(`▶ Updating reverse proxy → ${deployment.subdomain}.${config.baseDomain} → 127.0.0.1:${hostPort}`);
    await syncProxy();

    await ensureProjectDns(project, deployment.subdomain, log).catch((e) =>
      log(`! Cloudflare DNS skipped: ${e.message}`)
    );

    log(`✅ Live at ${url}`);

    recordBuildTime(deploymentId);

    attachRuntimeLogs(deploymentId, containerName);

  } catch (err) {
    appendLog(deploymentId, `✖ Deployment failed: ${err.message}`, 'system');
    setStatus(deploymentId, 'failed', { error: err.message, finished_at: now() });
    recordBuildTime(deploymentId);
  }
}

async function supersedeContainers(projectId, subdomain, keepDeploymentId) {
  const old = db
    .prepare(
      `SELECT * FROM containers WHERE project_id = ? AND subdomain = ? AND deployment_id != ? AND status = 'running'`
    )
    .all(projectId, subdomain, keepDeploymentId);
  for (const c of old) {
    await stopContainer(c.name);
    await removeContainer(c.name);
    db.prepare(`UPDATE containers SET status = 'stopped' WHERE id = ?`).run(c.id);
    db.prepare(`UPDATE deployments SET status = 'stopped' WHERE id = ? AND status = 'running'`).run(c.deployment_id);
    stopRuntimeLogs(c.deployment_id);
    if (config.autoCleanup && c.deployment_id) {
      const dep = db.prepare(`SELECT image_tag FROM deployments WHERE id = ?`).get(c.deployment_id);
      if (dep?.image_tag) await removeImage(dep.image_tag);
      await cleanupCheckout(c.deployment_id).catch(() => {});
    }
  }
}

function attachRuntimeLogs(deploymentId, containerName) {
  stopRuntimeLogs(deploymentId);
  const child = followLogs(containerName, (line) => appendLog(deploymentId, line, 'runtime'));
  runtimeFollowers.set(deploymentId, child);
}

function stopRuntimeLogs(deploymentId) {
  const child = runtimeFollowers.get(deploymentId);
  if (child) {
    try { child.kill(); } catch { }
    runtimeFollowers.delete(deploymentId);
  }
}

export async function stopDeployment(deploymentId) {
  const dep = db.prepare(`SELECT * FROM deployments WHERE id = ?`).get(deploymentId);
  if (!dep) return;
  if (dep.container_name) {
    await stopContainer(dep.container_name);
    await removeContainer(dep.container_name);
  }
  db.prepare(`UPDATE containers SET status = 'stopped' WHERE deployment_id = ?`).run(deploymentId);
  setStatus(deploymentId, 'stopped', { finished_at: now() });
  stopRuntimeLogs(deploymentId);
  if (config.autoCleanup && dep.image_tag) await removeImage(dep.image_tag);
  await cleanupCheckout(deploymentId).catch(() => {});
  await syncProxy();
}

export async function destroyPreview(project, { branch, prNumber }) {
  const subdomain = subdomainFor({ slug: project.slug, type: 'preview', branch, prNumber });
  const containers = db
    .prepare(`SELECT * FROM containers WHERE project_id = ? AND subdomain = ? AND status = 'running'`)
    .all(project.id, subdomain);
  for (const c of containers) {
    await stopContainer(c.name);
    await removeContainer(c.name);
    db.prepare(`UPDATE containers SET status = 'stopped' WHERE id = ?`).run(c.id);
    db.prepare(`UPDATE deployments SET status = 'stopped' WHERE id = ?`).run(c.deployment_id);
    stopRuntimeLogs(c.deployment_id);
  }
  db.prepare(
    `UPDATE preview_deployments SET status = 'destroyed', updated_at = ? WHERE project_id = ? AND subdomain = ?`
  ).run(now(), project.id, subdomain);
  await syncProxy();
  return { subdomain, destroyed: containers.length };
}

export async function resumeOnBoot() {
  const live = db.prepare(`SELECT * FROM deployments WHERE status = 'running'`).all();
  for (const d of live) {
    if (d.container_name) attachRuntimeLogs(d.id, d.container_name);
  }
  await syncProxy().catch(() => {});
}
