import { db } from '../db/index.js';
import { hashIP } from '../util/crypto.js';
import { parseUserAgent, isBot } from '../services/useragent.js';
import { getGeoFromIP } from '../services/geoip.js';
import { getClientIp } from '../util/clientip.js';

export default async function trackRoutes(fastify) {
  fastify.post('/track', async (request, reply) => {
    const {
      deployment_id,
      path,
      referrer,
      hostname,
      user_agent,
      screen_width,
      screen_height,
      language,
      utm_source,
      utm_medium,
      utm_campaign,
    } = request.body || {};

    if (!deployment_id || !path) {
      return reply.code(400).send({ error: 'deployment_id and path required' });
    }

    if (isBot(user_agent)) {
      return { ok: true, filtered: 'bot' };
    }

    const ua = parseUserAgent(user_agent);

    const ip = getClientIp(request);
    const geo = getGeoFromIP(ip);

    const ip_hash = hashIP(ip);

    const deployment = db.prepare('SELECT project_id FROM deployments WHERE id = ?').get(deployment_id);
    if (!deployment) {
      return reply.code(404).send({ error: 'deployment not found' });
    }

    db.prepare(`
      INSERT INTO page_views (
        deployment_id, project_id, timestamp, path, referrer, hostname,
        user_agent, ip_hash, country, region, city, device_type,
        browser, browser_version, os, os_version,
        screen_width, screen_height, language,
        utm_source, utm_medium, utm_campaign
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      deployment_id,
      deployment.project_id,
      Date.now(),
      path,
      referrer || null,
      hostname || null,
      user_agent || null,
      ip_hash,
      geo.country,
      geo.region,
      geo.city,
      ua.device,
      ua.browser,
      ua.browserVersion,
      ua.os,
      ua.osVersion,
      screen_width || null,
      screen_height || null,
      language || null,
      utm_source || null,
      utm_medium || null,
      utm_campaign || null
    );

    return { ok: true };
  });

  fastify.post('/track/app', async (request, reply) => {
    const { path, visitor, referrer, user_agent, language } = request.body || {};
    if (!path) return reply.code(400).send({ error: 'path required' });
    if (isBot(user_agent)) return { ok: true, filtered: 'bot' };

    const ua = parseUserAgent(user_agent);
    const ip = getClientIp(request);
    const geo = getGeoFromIP(ip);
    const visitor_hash = visitor ? hashIP(String(visitor)) : null;
    const ip_hash = hashIP(ip);

    db.prepare(`
      INSERT INTO dashboard_views (
        timestamp, path, visitor_hash, ip_hash, referrer, country, region, city,
        device_type, browser, os, language
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      Date.now(),
      String(path).slice(0, 512),
      visitor_hash,
      ip_hash,
      referrer || null,
      geo.country,
      geo.region,
      geo.city,
      ua.device,
      ua.browser,
      ua.os,
      language || null
    );
    return { ok: true };
  });

  fastify.post('/track/event', async (request, reply) => {
    const {
      deployment_id,
      event_name,
      event_data,
      path,
    } = request.body || {};

    if (!deployment_id || !event_name) {
      return reply.code(400).send({ error: 'deployment_id and event_name required' });
    }

    const ip_hash = hashIP(getClientIp(request));

    const deployment = db.prepare('SELECT project_id FROM deployments WHERE id = ?').get(deployment_id);
    if (!deployment) {
      return reply.code(404).send({ error: 'deployment not found' });
    }

    db.prepare(`
      INSERT INTO custom_events (
        deployment_id, project_id, timestamp, event_name, event_data, path, ip_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      deployment_id,
      deployment.project_id,
      Date.now(),
      event_name,
      event_data || null,
      path || null,
      ip_hash
    );

    return { ok: true };
  });
}
