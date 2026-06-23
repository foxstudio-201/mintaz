/**
 * Tracking endpoints - receive analytics events from deployed apps
 * Public API (no authentication required)
 */
import { db } from '../db/index.js';
import { hashIP } from '../util/crypto.js';
import { parseUserAgent, isBot } from '../services/useragent.js';
import { getGeoFromIP } from '../services/geoip.js';

export default async function trackRoutes(fastify) {
  /**
   * POST /api/track - Track a page view
   */
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

    // Validate required fields
    if (!deployment_id || !path) {
      return reply.code(400).send({ error: 'deployment_id and path required' });
    }

    // Filter out bots
    if (isBot(user_agent)) {
      return { ok: true, filtered: 'bot' };
    }

    // Parse user agent
    const ua = parseUserAgent(user_agent);

    // Get geo info from IP
    const geo = getGeoFromIP(request.ip);

    // Hash IP for privacy
    const ip_hash = hashIP(request.ip);

    // Lookup project_id from deployment_id
    const deployment = db.prepare('SELECT project_id FROM deployments WHERE id = ?').get(deployment_id);
    if (!deployment) {
      return reply.code(404).send({ error: 'deployment not found' });
    }

    // Insert page view
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

  /**
   * POST /api/track/event - Track a custom event
   */
  fastify.post('/track/event', async (request, reply) => {
    const {
      deployment_id,
      event_name,
      event_data,
      path,
    } = request.body || {};

    // Validate required fields
    if (!deployment_id || !event_name) {
      return reply.code(400).send({ error: 'deployment_id and event_name required' });
    }

    // Hash IP for privacy
    const ip_hash = hashIP(request.ip);

    // Lookup project_id from deployment_id
    const deployment = db.prepare('SELECT project_id FROM deployments WHERE id = ?').get(deployment_id);
    if (!deployment) {
      return reply.code(404).send({ error: 'deployment not found' });
    }

    // Insert custom event
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
