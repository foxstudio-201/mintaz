import { db } from '../db/index.js';

const DAY_EXPR = db.kind === 'mysql'
  ? 'DATE(FROM_UNIXTIME(`timestamp` / 1000))'
  : "DATE(`timestamp` / 1000, 'unixepoch')";

export default async function analyticsRoutes(fastify) {
  fastify.addHook('onRequest', fastify.authenticate);

  fastify.get('/deployments', async (request) => {
    const userId = request.user.sub;

    const deployments = await db.prepare(`
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

  fastify.get('/:deploymentId/summary', async (request) => {
    const { deploymentId } = request.params;
    const days = parseInt(request.query.days) || 7;
    const since = Date.now() - days * 24 * 60 * 60 * 1000;
    const prevSince = since - days * 24 * 60 * 60 * 1000;

    const current = await db.prepare(`
      SELECT
        COUNT(DISTINCT ip_hash) as visitors,
        COUNT(*) as page_views,
        AVG(duration) as avg_duration
      FROM page_views
      WHERE deployment_id = ? AND \`timestamp\` > ?
    `).get(deploymentId, since);

    const previous = await db.prepare(`
      SELECT
        COUNT(DISTINCT ip_hash) as visitors,
        COUNT(*) as page_views,
        AVG(duration) as avg_duration
      FROM page_views
      WHERE deployment_id = ? AND \`timestamp\` > ? AND \`timestamp\` <= ?
    `).get(deploymentId, prevSince, since);

    const bounceRate = await calculateBounceRate(deploymentId, since);
    const prevBounceRate = await calculateBounceRate(deploymentId, prevSince, since);

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

  fastify.get('/:deploymentId/timeseries', async (request) => {
    const { deploymentId } = request.params;
    const days = parseInt(request.query.days) || 7;
    const since = Date.now() - days * 24 * 60 * 60 * 1000;

    const timeseries = await db.prepare(`
      SELECT
        ${DAY_EXPR} as date,
        COUNT(DISTINCT ip_hash) as visitors,
        COUNT(*) as page_views
      FROM page_views
      WHERE deployment_id = ? AND \`timestamp\` > ?
      GROUP BY ${DAY_EXPR}
      ORDER BY date ASC
    `).all(deploymentId, since);

    return { timeseries };
  });

  fastify.get('/:deploymentId/pages', async (request) => {
    const { deploymentId } = request.params;
    const days = parseInt(request.query.days) || 7;
    const limit = parseInt(request.query.limit) || 10;
    const since = Date.now() - days * 24 * 60 * 60 * 1000;

    const pages = await db.prepare(`
      SELECT
        path,
        COUNT(DISTINCT ip_hash) as visitors,
        COUNT(*) as page_views
      FROM page_views
      WHERE deployment_id = ? AND \`timestamp\` > ?
      GROUP BY path
      ORDER BY visitors DESC
      LIMIT ?
    `).all(deploymentId, since, limit);

    return { pages };
  });

  fastify.get('/:deploymentId/referrers', async (request) => {
    const { deploymentId } = request.params;
    const days = parseInt(request.query.days) || 7;
    const limit = parseInt(request.query.limit) || 10;
    const since = Date.now() - days * 24 * 60 * 60 * 1000;

    const referrers = await db.prepare(`
      SELECT
        CASE
          WHEN referrer LIKE 'https://%' OR referrer LIKE 'http://%'
          THEN SUBSTR(referrer, INSTR(referrer, '//') + 2, INSTR(SUBSTR(referrer, INSTR(referrer, '//') + 2), '/') - 1)
          ELSE referrer
        END as source,
        COUNT(DISTINCT ip_hash) as visitors
      FROM page_views
      WHERE deployment_id = ? AND \`timestamp\` > ? AND referrer IS NOT NULL AND referrer != ''
      GROUP BY source
      ORDER BY visitors DESC
      LIMIT ?
    `).all(deploymentId, since, limit);

    return { referrers };
  });

  fastify.get('/:deploymentId/countries', async (request) => {
    const { deploymentId } = request.params;
    const days = parseInt(request.query.days) || 7;
    const limit = parseInt(request.query.limit) || 10;
    const since = Date.now() - days * 24 * 60 * 60 * 1000;

    const totalVisitors = await db.prepare(`
      SELECT COUNT(DISTINCT ip_hash) as total
      FROM page_views
      WHERE deployment_id = ? AND \`timestamp\` > ?
    `).get(deploymentId, since);

    const countries = await db.prepare(`
      SELECT
        country,
        COUNT(DISTINCT ip_hash) as visitors
      FROM page_views
      WHERE deployment_id = ? AND \`timestamp\` > ? AND country IS NOT NULL
      GROUP BY country
      ORDER BY visitors DESC
      LIMIT ?
    `).all(deploymentId, since, limit);

    const withPercent = countries.map(c => ({
      ...c,
      percentage: totalVisitors.total > 0
        ? Math.round((c.visitors / totalVisitors.total) * 100)
        : 0,
    }));

    return { countries: withPercent };
  });

  fastify.get('/:deploymentId/devices', async (request) => {
    const { deploymentId } = request.params;
    const days = parseInt(request.query.days) || 7;
    const since = Date.now() - days * 24 * 60 * 60 * 1000;

    const totalVisitors = await db.prepare(`
      SELECT COUNT(DISTINCT ip_hash) as total
      FROM page_views
      WHERE deployment_id = ? AND \`timestamp\` > ?
    `).get(deploymentId, since);

    const devices = await db.prepare(`
      SELECT device_type, COUNT(DISTINCT ip_hash) as visitors
      FROM page_views
      WHERE deployment_id = ? AND \`timestamp\` > ?
      GROUP BY device_type
      ORDER BY visitors DESC
    `).all(deploymentId, since);

    const browsers = await db.prepare(`
      SELECT browser, COUNT(DISTINCT ip_hash) as visitors
      FROM page_views
      WHERE deployment_id = ? AND \`timestamp\` > ?
      GROUP BY browser
      ORDER BY visitors DESC
      LIMIT 10
    `).all(deploymentId, since);

    const operatingSystems = await db.prepare(`
      SELECT os, COUNT(DISTINCT ip_hash) as visitors
      FROM page_views
      WHERE deployment_id = ? AND \`timestamp\` > ?
      GROUP BY os
      ORDER BY visitors DESC
      LIMIT 10
    `).all(deploymentId, since);

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

  fastify.get('/:deploymentId/visitors', async (request) => {
    const { deploymentId } = request.params;
    const days = parseInt(request.query.days) || 7;
    const limit = parseInt(request.query.limit) || 50;
    const since = Date.now() - days * 24 * 60 * 60 * 1000;

    const visitors = await db.prepare(`
      SELECT
        ip_hash,
        COUNT(*) as page_views,
        MAX(\`timestamp\`) as last_seen,
        MAX(country) as country,
        MAX(city) as city,
        MAX(device_type) as device_type,
        MAX(browser) as browser,
        MAX(os) as os
      FROM page_views
      WHERE deployment_id = ? AND \`timestamp\` > ? AND ip_hash IS NOT NULL
      GROUP BY ip_hash
      ORDER BY last_seen DESC
      LIMIT ?
    `).all(deploymentId, since, limit);

    return { visitors: visitors.map((v) => ({ ...v, ip_hash: String(v.ip_hash || '').slice(0, 12) })) };
  });

  fastify.get('/:deploymentId/events', async (request) => {
    const { deploymentId } = request.params;
    const days = parseInt(request.query.days) || 7;
    const limit = parseInt(request.query.limit) || 10;
    const since = Date.now() - days * 24 * 60 * 60 * 1000;

    const events = await db.prepare(`
      SELECT
        event_name,
        COUNT(*) as count,
        COUNT(DISTINCT ip_hash) as unique_visitors
      FROM custom_events
      WHERE deployment_id = ? AND \`timestamp\` > ?
      GROUP BY event_name
      ORDER BY count DESC
      LIMIT ?
    `).all(deploymentId, since, limit);

    return { events };
  });
}

async function calculateBounceRate(deploymentId, since, until = Date.now()) {
  const sessions = await db.prepare(`
    SELECT
      ip_hash,
      ${DAY_EXPR} as date,
      COUNT(*) as page_count
    FROM page_views
    WHERE deployment_id = ? AND \`timestamp\` > ? AND \`timestamp\` <= ?
    GROUP BY ip_hash, date
  `).all(deploymentId, since, until);

  if (sessions.length === 0) return 0;

  const bounces = sessions.filter(s => s.page_count === 1).length;
  return Math.round((bounces / sessions.length) * 100);
}

function calculateChange(current, previous) {
  if (!previous || previous === 0) {
    return current > 0 ? 100 : 0;
  }
  const change = ((current - previous) / previous) * 100;
  return Math.round(change);
}
