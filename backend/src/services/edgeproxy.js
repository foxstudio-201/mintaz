import http from 'node:http';
import net from 'node:net';
import { db } from '../db/index.js';
import { config, dashUrl } from '../config.js';
import { renderDeploymentStatus } from './statuspage.js';

async function resolveTarget(hostHeader) {
  const host = String(hostHeader || '').split(':')[0].toLowerCase();
  const base = config.baseDomain.toLowerCase();
  if (host !== base && !host.endsWith('.' + base)) return null;

  const sub = host === base ? '' : host.slice(0, host.length - base.length - 1);
  if (sub === '' || sub === config.dashSubdomain) return { port: config.port, name: 'dashboard', isApp: false };

  const row = await db
    .prepare(`SELECT c.host_port, c.deployment_id FROM containers c WHERE c.subdomain = ? AND c.status = 'running' ORDER BY c.created_at DESC LIMIT 1`)
    .get(sub);
  if (row?.host_port) return { port: row.host_port, name: sub, isApp: true, deploymentId: row.deployment_id };
  // Valid app subdomain but nothing running — render a deployment status page
  // (failed / building / none) instead of a blank/generic error.
  return { statusSub: sub };
}

async function serveStatus(res, sub) {
  const { statusCode, html } = await renderDeploymentStatus(sub);
  res.writeHead(statusCode, { 'content-type': 'text/html; charset=utf-8' });
  res.end(html);
}

export function startEdgeProxy() {
  const port = config.proxyHttpPort;

  const server = http.createServer(async (req, res) => {
    const t = await resolveTarget(req.headers.host);
    if (!t) {
      res.writeHead(502, { 'content-type': 'text/plain' });
      return res.end('502 unknown host');
    }
    if (t.statusSub) return serveStatus(res, t.statusSub);

    const upstream = http.request(
      { host: '127.0.0.1', port: t.port, method: req.method, path: req.url, headers: req.headers },
      (up) => {
        const contentType = up.headers['content-type'] || '';
        const isHTML = contentType.includes('text/html');

        if (!t.isApp || !isHTML) {
          res.writeHead(up.statusCode || 502, up.headers);
          up.pipe(res);
          return;
        }

        let body = '';
        up.setEncoding('utf8');
        up.on('data', (chunk) => { body += chunk; });
        up.on('end', () => {
          const trackerScript = `
<meta name="mintaz-id" content="${t.deploymentId}" data-api-url="${dashUrl()}">
<script src="${dashUrl()}/public/tracker.js" defer></script>`;

          if (body.includes('</head>')) {
            body = body.replace('</head>', `${trackerScript}</head>`);
          } else if (body.includes('</body>')) {
            body = body.replace('</body>', `${trackerScript}</body>`);
          } else {
            body += trackerScript;
          }

          const newHeaders = { ...up.headers };
          newHeaders['content-length'] = Buffer.byteLength(body);

          res.writeHead(up.statusCode || 502, newHeaders);
          res.end(body);
        });
      }
    );
    upstream.on('error', () => {
      if (!res.headersSent) res.writeHead(502, { 'content-type': 'text/plain' });
      res.end('502 upstream error');
    });
    req.pipe(upstream);
  });

  server.on('upgrade', async (req, socket, head) => {
    const t = await resolveTarget(req.headers.host);
    if (!t || t.statusSub || !t.port) return socket.destroy();
    const up = net.connect(t.port, '127.0.0.1', () => {
      const headerLines = Object.entries(req.headers).map(([k, v]) => `${k}: ${v}`);
      up.write(`${req.method} ${req.url} HTTP/1.1\r\n${headerLines.join('\r\n')}\r\n\r\n`);
      if (head && head.length) up.write(head);
      socket.pipe(up);
      up.pipe(socket);
    });
    up.on('error', () => socket.destroy());
    socket.on('error', () => up.destroy());
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[edgeproxy] port ${port} in use — assuming an external proxy (Caddy/Nginx) handles routing.`);
    } else {
      console.error('[edgeproxy] error:', err.message);
    }
  });

  server.listen(port, '0.0.0.0', () => {
    console.log(`[edgeproxy] routing *.${config.baseDomain} on :${port}`);
  });
  return server;
}
