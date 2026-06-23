/**
 * Analytics endpoints - query tracking data for deployments
 * Protected API (authentication required)
 */
import { db } from '../db/index.js';

export default async function analyticsRoutes(fastify) {
  // All analytics routes require authentication
  fastify.addHook('onRequest', fastify.authenticate);

  /**
   * GET /api/analytics/deployments - List deployments with analytics data
   * Returns deployments that have page views
   */
  fastify.get('/deployments', async (request) => {
    const userId = request.user.sub;

    const deployments = db.prepare(`
      SELECT
        d.id,
        d.project_id,
        p.name as project_name,
        d.type,
        d.branch,
        d.subdomain,
        d.url,
        d.status,
        d.created_at,
        COUNT(pv.id) as page_views_count
      FROM deployments d
      JOIN projects p ON d.project_id = p.id
      LEFT JOIN page_views pv ON d.id = pv.deployment_id
      WHERE p.user_id = ?
      GROUP BY d.id
      HAVING page_views_count > 0
      ORDER BY d.created_at DESC
      LIMIT 100
    `).all(userId);

    return { deployments };
  });

  /**
   * GET /api/analytics/:deploymentId/summary - Get summary metrics
   */
  fastify.get('/:deploymentId/summary', async (request) => {
    const { deploymentId } = request.params;
    const days = parseInt(request.query.days) || 7;
    const since = Date.now() - days * 24 * 60 * 60 * 1000;
    const prevSince = since - days * 24 * 60 * 60 * 1000;

    // Current period metrics
    const current = db.prepare(`
      SELECT
        COUNT(DISTINCT ip_hash) as visitors,
        COUNT(*) as page_views,
        AVG(duration) as avg_duration
      FROM page_views
      WHERE deployment_id = ? AND timestamp > ?
    `).get(deploymentId, since);

    // Previous period metrics
    const previous = db.prepare(`
      SELECT
        COUNT(DISTINCT ip_hash) as visitors,
        COUNT(*) as page_views,
        AVG(duration) as avg_duration
      FROM page_views
      WHERE deployment_id = ? AND timestamp > ? AND timestamp <= ?
    `).get(deploymentId, prevSince, since);

    // Calculate bounce rate (single-page sessions / total sessions)
    const bounceRate = calculateBounceRate(deploymentId, since);
    const prevBounceRate = calculateBounceRate(deploymentId, prevSince, since);

    return {
      visitors: {
        value: current.visitors || 0,
        change: calculateChange(current.visitors, previous.visitors),
      },
      page_views: {
        value: current.page_views || 0,
        change: calculateChange(current.page_views, previous.page_views),
      },
      bounce_rate: {
        value: bounceRate,
        change: calculateChange(bounceRate, prevBounceRate),
      },
      avg_duration: {
        value: Math.round(current.avg_duration || 0),
        change: calculateChange(current.avg_duration, previous.avg_duration),
      },
    };
  });

  /**
   * GET /api/analytics/:deploymentId/timeseries - Get visitors over time
   */
  fastify.get('/:deploymentId/timeseries', async (request) => {
    const { deploymentId } = request.params;
    const days = parseInt(request.query.days) || 7;
    const since = Date.now() - days * 24 * 60 * 60 * 1000;

    const timeseries = db.prepare(`
      SELECT
        DATE(timestamp / 1000, 'unixepoch') as date,
        COUNT(DISTINCT ip_hash) as visitors,
        COUNT(*) as page_views
      FROM page_views
      WHERE deployment_id = ? AND timestamp > ?
      GROUP BY DATE(timestamp / 1000, 'unixepoch')
      ORDER BY date ASC
    `).all(deploymentId, since);

    return { timeseries };
  });

  /**
   * GET /api/analytics/:deploymentId/pages - Top pages
   */
  fastify.get('/:deploymentId/pages', async (request) => {
    const { deploymentId } = request.params;
    const days = parseInt(request.query.days) || 7;
    const limit = parseInt(request.query.limit) || 10;
    const since = Date.now() - days * 24 * 60 * 60 * 1000;

    const pages = db.prepare(`
      SELECT
        path,
        COUNT(DISTINCT ip_hash) as visitors,
        COUNT(*) as page_views
      FROM page_views
      WHERE deployment_id = ? AND timestamp > ?
      GROUP BY path
      ORDER BY visitors DESC
      LIMIT ?
    `).all(deploymentId, since, limit);

    return { pages };
  });

  /**
   * GET /api/analytics/:deploymentId/referrers - Top referrers
   */
  fastify.get('/:deploymentId/referrers', async (request) => {
    const { deploymentId } = request.params;
    const days = parseInt(request.query.days) || 7;
    const limit = parseInt(request.query.limit) || 10;
    const since = Date.now() - days * 24 * 60 * 60 * 1000;

    const referrers = db.prepare(`
      SELECT
        CASE
          WHEN referrer LIKE 'https://%' OR referrer LIKE 'http://%'
          THEN SUBSTR(referrer, INSTR(referrer, '//') + 2, INSTR(SUBSTR(referrer, INSTR(referrer, '//') + 2), '/') - 1)
          ELSE referrer
        END as source,
        COUNT(DISTINCT ip_hash) as visitors
      FROM page_views
      WHERE deployment_id = ? AND timestamp > ? AND referrer IS NOT NULL AND referrer != ''
      GROUP BY source
      ORDER BY visitors DESC
      LIMIT ?
    `).all(deploymentId, since, limit);

    return { referrers };
  });

  /**
   * GET /api/analytics/:deploymentId/countries - Top countries
   */
  fastify.get('/:deploymentId/countries', async (request) => {
    const { deploymentId } = request.params;
    const days = parseInt(request.query.days) || 7;
    const limit = parseInt(request.query.limit) || 10;
    const since = Date.now() - days * 24 * 60 * 60 * 1000;

    const totalVisitors = db.prepare(`
      SELECT COUNT(DISTINCT ip_hash) as total
      FROM page_views
      WHERE deployment_id = ? AND timestamp > ?
    `).get(deploymentId, since);

    const countries = db.prepare(`
      SELECT
        country,
        COUNT(DISTINCT ip_hash) as visitors
      FROM page_views
      WHERE deployment_id = ? AND timestamp > ? AND country IS NOT NULL
      GROUP BY country
      ORDER BY visitors DESC
      LIMIT ?
    `).all(deploymentId, since, limit);

    // Calculate percentages
    const withPercent = countries.map(c => ({
      ...c,
      percentage: totalVisitors.total > 0
        ? Math.round((c.visitors / totalVisitors.total) * 100)
        : 0,
    }));

    return { countries: withPercent };
  });

  /**
   * GET /api/analytics/:deploymentId/devices - Device breakdown
   */
  fastify.get('/:deploymentId/devices', async (request) => {
    const { deploymentId } = request.params;
    const days = parseInt(request.query.days) || 7;
    const since = Date.now() - days * 24 * 60 * 60 * 1000;

    const totalVisitors = db.prepare(`
      SELECT COUNT(DISTINCT ip_hash) as total
      FROM page_views
      WHERE deployment_id = ? AND timestamp > ?
    `).get(deploymentId, since);

    // Device types
    const devices = db.prepare(`
      SELECT device_type, COUNT(DISTINCT ip_hash) as visitors
      FROM page_views
      WHERE deployment_id = ? AND timestamp > ?
      GROUP BY device_type
      ORDER BY visitors DESC
    `).all(deploymentId, since);

    // Browsers
    const browsers = db.prepare(`
      SELECT browser, COUNT(DISTINCT ip_hash) as visitors
      FROM page_views
      WHERE deployment_id = ? AND timestamp > ?
      GROUP BY browser
      ORDER BY visitors DESC
      LIMIT 10
    `).all(deploymentId, since);

    // Operating systems
    const operatingSystems = db.prepare(`
      SELECT os, COUNT(DISTINCT ip_hash) as visitors
      FROM page_views
      WHERE deployment_id = ? AND timestamp > ?
      GROUP BY os
      ORDER BY visitors DESC
      LIMIT 10
    `).all(deploymentId, since);

    // Add percentages
    const addPercent = (items) => items.map(item => ({
      ...item,
      percentage: totalVisitors.total > 0
        ? Math.round((item.visitors / totalVisitors.total) * 100)
        : 0,
    }));

    return {
      devices: addPercent(devices),
      browsers: addPercent(browsers),
      operating_systems: addPercent(operatingSystems),
    };
  });

  /**
   * GET /api/analytics/:deploymentId/events - Custom events
   */
  fastify.get('/:deploymentId/events', async (request) => {
    const { deploymentId } = request.params;
    const days = parseInt(request.query.days) || 7;
    const limit = parseInt(request.query.limit) || 10;
    const since = Date.now() - days * 24 * 60 * 60 * 1000;

    const events = db.prepare(`
      SELECT
        event_name,
        COUNT(*) as count,
        COUNT(DISTINCT ip_hash) as unique_visitors
      FROM custom_events
      WHERE deployment_id = ? AND timestamp > ?
      GROUP BY event_name
      ORDER BY count DESC
      LIMIT ?
    `).all(deploymentId, since, limit);

    return { events };
  });
}

/**
 * Calculate bounce rate
 * Bounce = session with only 1 page view
 */
function calculateBounceRate(deploymentId, since, until = Date.now()) {
  // Get sessions (group by ip_hash + date)
  const sessions = db.prepare(`
    SELECT
      ip_hash,
      DATE(timestamp / 1000, 'unixepoch') as date,
      COUNT(*) as page_count
    FROM page_views
    WHERE deployment_id = ? AND timestamp > ? AND timestamp <= ?
    GROUP BY ip_hash, date
  `).all(deploymentId, since, until);

  if (sessions.length === 0) return 0;

  const bounces = sessions.filter(s => s.page_count === 1).length;
  return Math.round((bounces / sessions.length) * 100);
}

/**
 * Calculate percentage change between two values
 */
function calculateChange(current, previous) {
  if (!previous || previous === 0) {
    return current > 0 ? 100 : 0;
  }
  const change = ((current - previous) / previous) * 100;
  return Math.round(change);
}
