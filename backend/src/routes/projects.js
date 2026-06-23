// Project CRUD + manual deploy trigger.
import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { config, dashUrl } from '../config.js';
import { slugify, makePublicSlug } from '../util/slug.js';
import { randomSecret, encryptSecret } from '../util/crypto.js';
import { createDeployment, stopDeployment } from '../services/deploy.js';
import { checkDeployQuota } from '../services/quotas.js';

function projectView(p) {
  if (!p) return p;
  const counts = db
    .prepare(`SELECT status, COUNT(*) c FROM deployments WHERE project_id = ? GROUP BY status`)
    .all(p.id);
  const latest = db
    .prepare(`SELECT id, status, type, branch, url, commit_sha, commit_msg, created_at FROM deployments WHERE project_id = ? ORDER BY created_at DESC LIMIT 1`)
    .get(p.id);
  const previews = db
    .prepare(`SELECT COUNT(*) c FROM preview_deployments WHERE project_id = ? AND status = 'active'`)
    .get(p.id);
  const { git_token, ...safe } = p;
  return {
    ...safe,
    preview_enabled: !!p.preview_enabled,
    auto_destroy_pr: !!p.auto_destroy_pr,
    has_git_token: !!git_token, // never expose the raw token
    production_url: `https://${p.public_slug || p.slug}.${config.baseDomain}`,
    webhook_url: `${dashUrl()}/api/webhooks/github/${p.id}`,
    statusCounts: Object.fromEntries(counts.map((r) => [r.status, r.c])),
    latestDeployment: latest || null,
    activePreviews: previews.c,
  };
}

function uniqueSlug(base) {
  let slug = slugify(base);
  let n = 1;
  while (db.prepare('SELECT id FROM projects WHERE slug = ?').get(slug)) {
    slug = `${slugify(base)}-${++n}`;
  }
  return slug;
}

export default async function projectRoutes(fastify) {
  fastify.addHook('onRequest', fastify.authenticate);

  fastify.get('/', async (request) => {
    const rows = db
      .prepare('SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC')
      .all(request.user.sub);
    return { projects: rows.map(projectView) };
  });

  fastify.post('/', async (request, reply) => {
    const b = request.body || {};
    if (!b.name || !b.repo_url) {
      return reply.code(400).send({ error: 'name and repo_url are required' });
    }
    // Check project quota before creating.
    const quota = checkDeployQuota(request.user.sub);
    if (!quota.allowed) {
      return reply.code(403).send({ error: quota.reason });
    }
    const id = nanoid();
    const slug = uniqueSlug(b.slug || b.name);
    const ts = Date.now();
    db.prepare(
      `INSERT INTO projects
         (id, user_id, name, slug, public_slug, repo_url, git_token, branch, build_method, framework, output_dir, dockerfile_path,
          install_command, build_command, start_command, internal_port, restart_policy,
          preview_enabled, auto_destroy_pr, webhook_secret, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      request.user.sub,
      b.name,
      slug,
      makePublicSlug(b.name),
      b.repo_url,
      b.git_token ? encryptSecret(b.git_token) : null,
      b.branch || 'main',
      b.build_method || 'auto',
      b.framework || 'auto',
      b.output_dir || null,
      b.dockerfile_path || 'Dockerfile',
      b.install_command || null,
      b.build_command || null,
      b.start_command || null,
      Number(b.internal_port) || 3000,
      b.restart_policy || config.defaultRestartPolicy,
      b.preview_enabled === false ? 0 : 1,
      b.auto_destroy_pr === false ? 0 : 1,
      b.webhook_secret || randomSecret(),
      ts,
      ts
    );

    // Optional env vars on create.
    if (Array.isArray(b.env)) {
      const ins = db.prepare(
        `INSERT INTO env_vars (id, project_id, scope, key, value) VALUES (?, ?, ?, ?, ?)`
      );
      for (const e of b.env) {
        if (e.key) ins.run(nanoid(), id, e.scope || 'all', e.key, String(e.value ?? ''));
      }
    }

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    let deployment = null;
    if (b.deploy_now !== false) {
      deployment = createDeployment(project, { type: 'production', trigger: 'manual' });
    }
    return reply.code(201).send({ project: projectView(project), deployment });
  });

  fastify.get('/:id', async (request, reply) => {
    const p = getOwned(request, reply);
    if (!p) return;
    return { project: projectView(p) };
  });

  fastify.patch('/:id', async (request, reply) => {
    const p = getOwned(request, reply);
    if (!p) return;
    const b = request.body || {};
    const allowed = [
      'name', 'repo_url', 'branch', 'build_method', 'framework', 'output_dir',
      'dockerfile_path', 'install_command', 'build_command', 'start_command',
      'internal_port', 'restart_policy', 'preview_enabled', 'auto_destroy_pr',
    ];
    const fields = [];
    const values = [];
    for (const k of allowed) {
      if (k in b) {
        fields.push(`${k} = ?`);
        if (k === 'preview_enabled' || k === 'auto_destroy_pr') values.push(b[k] ? 1 : 0);
        else if (k === 'internal_port') values.push(Number(b[k]) || 3000);
        else values.push(b[k]);
      }
    }
    // git_token: only change when a non-empty value is provided; an explicit
    // null clears it. Empty string / absent leaves the stored token intact.
    if (typeof b.git_token === 'string' && b.git_token.length) {
      fields.push('git_token = ?');
      values.push(encryptSecret(b.git_token));
    } else if (b.git_token === null) {
      fields.push('git_token = ?');
      values.push(null);
    }
    if (fields.length) {
      fields.push('updated_at = ?');
      values.push(Date.now(), p.id);
      db.prepare(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    }
    return { project: projectView(db.prepare('SELECT * FROM projects WHERE id = ?').get(p.id)) };
  });

  fastify.delete('/:id', async (request, reply) => {
    const p = getOwned(request, reply);
    if (!p) return;
    // Tear down all live deployments first.
    const live = db.prepare(`SELECT id FROM deployments WHERE project_id = ? AND status = 'running'`).all(p.id);
    for (const d of live) await stopDeployment(d.id);
    db.prepare('DELETE FROM projects WHERE id = ?').run(p.id);
    return { ok: true };
  });

  // Manual deploy / redeploy.
  fastify.post('/:id/deploy', async (request, reply) => {
    const p = getOwned(request, reply);
    if (!p) return;
    const b = request.body || {};
    const type = b.branch && b.branch !== p.branch ? 'preview' : 'production';
    const deployment = createDeployment(p, {
      type: b.type || type,
      branch: b.branch || p.branch,
      prNumber: b.pr_number || null,
      trigger: 'manual',
    });
    return reply.code(202).send({ deployment });
  });

  // Rotate webhook secret.
  fastify.post('/:id/rotate-secret', async (request, reply) => {
    const p = getOwned(request, reply);
    if (!p) return;
    const secret = randomSecret();
    db.prepare('UPDATE projects SET webhook_secret = ?, updated_at = ? WHERE id = ?').run(secret, Date.now(), p.id);
    return { webhook_secret: secret };
  });
}

function getOwned(request, reply) {
  const p = db.prepare('SELECT * FROM projects WHERE id = ?').get(request.params.id);
  if (!p || p.user_id !== request.user.sub) {
    reply.code(404).send({ error: 'project not found' });
    return null;
  }
  return p;
}
