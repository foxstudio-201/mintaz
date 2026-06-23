import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import fastifyStatic from '@fastify/static';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { config, publicBaseUrl } from './config.js';
import { db } from './db/index.js';
import { isMaintenance, maintenancePage } from './services/maintenance.js';

import authPlugin from './plugins/auth.js';
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import deploymentRoutes from './routes/deployments.js';
import envRoutes from './routes/env.js';
import webhookRoutes from './routes/webhooks.js';
import githubRoutes from './routes/github.js';
import cloudflareRoutes from './routes/cloudflare.js';
import adminRoutes from './routes/admin.js';
import systemRoutes from './routes/system.js';
import wsRoutes from './routes/ws.js';
import quotaRoutes from './routes/quotas.js';
import trackRoutes from './routes/track.js';
import analyticsRoutes from './routes/analytics.js';
import { resumeOnBoot } from './services/deploy.js';
import { startMonitor } from './services/monitor.js';
import { startEdgeProxy } from './services/edgeproxy.js';
import { startUsageMonitor } from './services/usage-monitor.js';

mkdirSync(config.dataDir, { recursive: true });
mkdirSync(config.workDir, { recursive: true });

const fastify = Fastify({
  logger: { level: process.env.LOG_LEVEL || 'info' },
  bodyLimit: 10 * 1024 * 1024,
});

fastify.addContentTypeParser('application/json', { parseAs: 'buffer' }, (req, body, done) => {
  req.rawBody = body;
  try {
    done(null, body.length ? JSON.parse(body.toString('utf8')) : {});
  } catch (err) {
    err.statusCode = 400;
    done(err, undefined);
  }
});

await fastify.register(cors, {
  origin: config.corsOrigins.length ? config.corsOrigins : true,
  credentials: true,
});
await fastify.register(websocket);
await fastify.register(authPlugin);

fastify.addHook('onRequest', async (request, reply) => {
  if (!isMaintenance()) return;
  const url = request.raw.url || '';
  if (
    url.startsWith('/api/admin/maintenance') ||
    url.startsWith('/api/auth/login') ||
    url.startsWith('/api/auth/me') ||
    url.startsWith('/api/health')
  ) return;
  try {
    await request.jwtVerify();
    const u = await db.prepare('SELECT role FROM users WHERE id = ?').get(request.user.sub);
    if (u && u.role === 'admin') return;
  } catch { /* not authenticated */ }
  if (url.startsWith('/api') || url.startsWith('/ws')) {
    return reply.code(503).send({ error: 'maintenance' });
  }
  return reply.code(503).type('text/html; charset=utf-8').send(maintenancePage());
});

await fastify.register(authRoutes, { prefix: '/api/auth' });
await fastify.register(projectRoutes, { prefix: '/api/projects' });
await fastify.register(deploymentRoutes, { prefix: '/api/deployments' });
await fastify.register(envRoutes, { prefix: '/api/env' });
await fastify.register(webhookRoutes, { prefix: '/api/webhooks' });
await fastify.register(githubRoutes, { prefix: '/api/github' });
await fastify.register(cloudflareRoutes, { prefix: '/api/cloudflare' });
await fastify.register(adminRoutes, { prefix: '/api/admin' });
await fastify.register(systemRoutes, { prefix: '/api' });
await fastify.register(quotaRoutes, { prefix: '/api/quotas' });
await fastify.register(trackRoutes, { prefix: '/api' });
await fastify.register(analyticsRoutes, { prefix: '/api/analytics' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const publicDir = join(__dirname, '..', 'public');
if (existsSync(publicDir)) {
  await fastify.register(fastifyStatic, {
    root: publicDir,
    prefix: '/public/',
    decorateReply: false,
  });
}

await fastify.register(wsRoutes, { prefix: '/ws' });

if (config.staticDir && existsSync(config.staticDir)) {
  await fastify.register(fastifyStatic, { root: config.staticDir, prefix: '/', index: false });

  const base = publicBaseUrl().replace(/\/+$/, '');
  let indexHtml = readFileSync(join(config.staticDir, 'index.html'), 'utf8');
  indexHtml = indexHtml
    .replace(/(content=")\/(og\.png")/g, `$1${base}/$2`)
    .replace(/(href=")\/(favicon\.svg")/g, `$1${base}/$2`)
    .replace(/(href=")\/(apple-touch-icon\.png")/g, `$1${base}/$2`);
  if (!indexHtml.includes('property="og:url"')) {
    indexHtml = indexHtml.replace(
      '</head>',
      `    <meta property="og:url" content="${base}/" />\n    <link rel="canonical" href="${base}/" />\n  </head>`
    );
  }
  const sendIndex = (reply) => reply.type('text/html; charset=utf-8').send(indexHtml);

  fastify.get('/', (request, reply) => sendIndex(reply));
  fastify.setNotFoundHandler((request, reply) => {
    if (request.raw.url.startsWith('/api') || request.raw.url.startsWith('/ws')) {
      return reply.code(404).send({ error: 'not found' });
    }
    return sendIndex(reply);
  });
} else {
  fastify.get('/', async () => ({
    name: 'Mintaz API',
    status: 'ok',
    dashboard: 'frontend build not found — run `npm --prefix frontend run build`',
  }));
}

try {
  await fastify.listen({ port: config.port, host: config.host });
  fastify.log.info(`Mintaz API on http://${config.host}:${config.port}`);
  await resumeOnBoot();
  startMonitor();
  startUsageMonitor();
  if (config.builtinProxy) startEdgeProxy();
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
