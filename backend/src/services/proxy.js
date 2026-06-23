import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { db } from '../db/index.js';
import { config } from '../config.js';

const pexec = promisify(exec);

function liveRoutes() {
  return db
    .prepare(
      `SELECT subdomain, host_port
       FROM containers
       WHERE status = 'running'
       GROUP BY subdomain
       HAVING created_at = MAX(created_at)
       ORDER BY subdomain`
    )
    .all();
}

function renderCaddy(routes) {
  const port = config.proxyHttpPort;
  const header = `# Managed by Mintaz — do not edit by hand.\n# Imported from the main Caddyfile via: import ${config.caddySnippet}\n\n`;
  const blocks = routes.map(
    (r) => `http://${r.subdomain}.${config.baseDomain}:${port} {
\treverse_proxy 127.0.0.1:${r.host_port}
}\n`
  );
  return header + (blocks.join('\n') || '# (no active deployments)\n');
}

function renderNginx(routes) {
  const port = config.proxyHttpPort;
  const header = `# Managed by Mintaz — do not edit by hand.\n\n`;
  const blocks = routes.map(
    (r) => `server {
    listen ${port};
    server_name ${r.subdomain}.${config.baseDomain};
    location / {
        proxy_pass http://127.0.0.1:${r.host_port};
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}\n`
  );
  return header + (blocks.join('\n') || '# (no active deployments)\n');
}

let pending = false;
let running = false;

export async function syncProxy() {
  if (running) {
    pending = true;
    return;
  }
  running = true;
  try {
    const routes = liveRoutes();
    if (config.proxy === 'nginx') {
      await writeSnippet(config.nginxSnippet, renderNginx(routes));
      await reload(config.nginxReloadCmd);
    } else {
      await writeSnippet(config.caddySnippet, renderCaddy(routes));
      await reload(config.caddyReloadCmd);
    }
  } catch (err) {
    console.error('[proxy] sync failed:', err.message);
  } finally {
    running = false;
    if (pending) {
      pending = false;
      syncProxy();
    }
  }
}

async function writeSnippet(path, contents) {
  try {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, contents, 'utf8');
  } catch (err) {
    console.error(`[proxy] could not write ${path}: ${err.message}`);
  }
}

async function reload(cmd) {
  if (!cmd) return;
  try {
    await pexec(cmd);
  } catch (err) {
    console.error(`[proxy] reload failed (${cmd}): ${err.message}`);
  }
}
