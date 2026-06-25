import { db } from '../db/index.js';
import { config, dashUrl } from '../config.js';

// In-progress deploy statuses (a build is running for this subdomain).
const BUILDING = new Set(['queued', 'cloning', 'building', 'deploying']);

function esc(s) {
  return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function shell({ title, accent, heading, body, refresh = false, dashLink = true }) {
  return (
    `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1">` +
    (refresh ? `<meta http-equiv="refresh" content="5">` : '') +
    `<title>${esc(title)}</title></head>` +
    `<body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#0b0f1a;color:#e2e8f0;display:grid;place-items:center;min-height:100vh;margin:0;padding:24px;box-sizing:border-box">` +
    `<div style="max-width:560px;width:100%;text-align:center">` +
    `<div style="display:inline-flex;align-items:center;gap:8px;font-size:.8rem;font-weight:600;letter-spacing:.04em;color:${accent};text-transform:uppercase;margin-bottom:16px">` +
    `<span style="width:8px;height:8px;border-radius:50%;background:${accent};display:inline-block"></span>mintaz</div>` +
    `<h1 style="font-size:1.6rem;line-height:1.25;margin:0 0 12px">${heading}</h1>` +
    body +
    (dashLink
      ? `<p style="margin-top:24px"><a href="${dashUrl()}" style="color:#94a3b8;font-size:.9rem;text-decoration:none;border-bottom:1px solid #334155;padding-bottom:2px">Open dashboard →</a></p>`
      : '') +
    `</div></body></html>`
  );
}

// Render an HTML status page for an app subdomain that has no running container.
// Returns { statusCode, html }. Looks up the most recent deployment for the
// subdomain to explain *why* nothing is being served (failed / building / none).
export async function renderDeploymentStatus(sub) {
  let row = null;
  try {
    row = await db
      .prepare(
        `SELECT d.status, d.error, d.commit_msg, d.commit_sha, d.type, d.created_at,
                p.name AS project_name
           FROM deployments d
           JOIN projects p ON p.id = d.project_id
          WHERE d.subdomain = ?
          ORDER BY d.created_at DESC
          LIMIT 1`
      )
      .get(sub);
  } catch {
    row = null;
  }

  const name = row?.project_name ? esc(row.project_name) : esc(sub);

  // No deployment ever created for this subdomain.
  if (!row) {
    return {
      statusCode: 404,
      html: shell({
        title: '404 · not found',
        accent: '#64748b',
        heading: 'Nothing deployed here yet',
        body: `<p style="color:#94a3b8;margin:0">No deployment is associated with <b style="color:#e2e8f0">${esc(sub)}.${esc(config.baseDomain)}</b>.</p>`,
        dashLink: false,
      }),
    };
  }

  // A build is currently in progress — auto-refresh until it finishes.
  if (BUILDING.has(row.status)) {
    return {
      statusCode: 503,
      html: shell({
        title: 'Deploying…',
        accent: '#38bdf8',
        heading: `Deploying ${name}…`,
        refresh: true,
        body:
          `<p style="color:#94a3b8;margin:0 0 8px">A new deployment is building right now. This page refreshes automatically.</p>` +
          `<p style="color:#64748b;font-size:.85rem;margin:0">Status: <code style="color:#38bdf8">${esc(row.status)}</code></p>`,
      }),
    };
  }

  // The latest deployment failed.
  if (row.status === 'failed') {
    const err = row.error
      ? `<pre style="text-align:left;background:#020617;border:1px solid #1e293b;border-radius:8px;padding:12px 14px;color:#fca5a5;font-size:.82rem;overflow:auto;margin:16px 0 0;white-space:pre-wrap;word-break:break-word">${esc(row.error)}</pre>`
      : '';
    return {
      statusCode: 502,
      html: shell({
        title: 'Deployment failed',
        accent: '#f87171',
        heading: `Deployment failed`,
        body:
          `<p style="color:#94a3b8;margin:0">The latest deployment for <b style="color:#e2e8f0">${name}</b> did not finish successfully, so there is no running app to serve this link.</p>` +
          err,
      }),
    };
  }

  // Stopped / superseded / running-without-container → app simply unavailable.
  return {
    statusCode: 503,
    html: shell({
      title: 'App unavailable',
      accent: '#fbbf24',
      heading: `${name} is not running`,
      body: `<p style="color:#94a3b8;margin:0">There is no active deployment serving this link right now.</p>`,
    }),
  };
}

// Whether a host header points at an app subdomain (not the dashboard / apex).
// Returns the subdomain string, or null.
export function appSubdomainOf(hostHeader) {
  const host = String(hostHeader || '').split(':')[0].toLowerCase();
  const base = config.baseDomain.toLowerCase();
  if (host === base || !host.endsWith('.' + base)) return null;
  const sub = host.slice(0, host.length - base.length - 1);
  if (!sub || sub === config.dashSubdomain) return null;
  return sub;
}
