// System status: docker availability, proxy, queue, totals.
import { db } from '../db/index.js';
import { config } from '../config.js';
import { dockerAvailable } from '../services/docker.js';
import { queueStats } from '../services/queue.js';
import { presetList } from '../services/presets.js';

export default async function systemRoutes(fastify) {
  // Public health check.
  fastify.get('/health', async () => ({ ok: true, ts: Date.now() }));

  // Framework presets for the UI picker.
  fastify.get('/frameworks', async () => ({ frameworks: presetList() }));

  fastify.get('/status', { onRequest: [fastify.authenticate] }, async () => {
    const docker = await dockerAvailable();
    const counts = {
      projects: db.prepare('SELECT COUNT(*) c FROM projects').get().c,
      deployments: db.prepare('SELECT COUNT(*) c FROM deployments').get().c,
      running: db.prepare("SELECT COUNT(*) c FROM deployments WHERE status='running'").get().c,
      previews: db.prepare("SELECT COUNT(*) c FROM preview_deployments WHERE status='active'").get().c,
    };
    return {
      docker,
      proxy: config.proxy,
      baseDomain: config.baseDomain,
      tunnel: config.cfTunnelName,
      queue: queueStats(),
      counts,
    };
  });
}
