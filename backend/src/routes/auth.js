// Auth routes: register, login, current user.
import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { config } from '../config.js';
import { hashPassword, verifyPassword } from '../util/crypto.js';
import { ipRateLimit } from '../util/ratelimit.js';
import { getSetting } from '../services/settings.js';

// Effective registration switch: admin DB setting wins over the env default.
export function registrationAllowed() {
  const s = getSetting('allow_registration');
  if (s === 'true') return true;
  if (s === 'false') return false;
  return config.allowRegistration;
}

const HOUR = 60 * 60 * 1000;
// Per-IP limits to blunt credential stuffing / signup spam.
const registerLimit = ipRateLimit({ bucket: 'register', max: 5, windowMs: HOUR });
const loginLimit = ipRateLimit({ bucket: 'login', max: 10, windowMs: 15 * 60 * 1000 });

export default async function authRoutes(fastify) {
  // Register. First user becomes admin; everyone after is a regular user.
  // Self-registration can be turned off with ALLOW_REGISTRATION=false (the
  // first/bootstrap admin is always allowed).
  fastify.post('/register', { preHandler: registerLimit }, async (request, reply) => {
    const { email, password } = request.body || {};
    if (!email || !password || password.length < 8) {
      return reply.code(400).send({ error: 'email and password (min 8 chars) required' });
    }
    // The first account is the platform admin; everyone after is a regular user.
    const isFirst = db.prepare('SELECT COUNT(*) c FROM users').get().c === 0;
    if (!isFirst && !registrationAllowed()) {
      return reply.code(403).send({ error: 'registration is disabled' });
    }
    const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (exists) return reply.code(409).send({ error: 'email already registered' });

    const role = isFirst ? 'admin' : 'user';

    const id = nanoid();
    db.prepare(
      `INSERT INTO users (id, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)`
    ).run(id, email, hashPassword(password), role, Date.now());

    const token = await reply.jwtSign({ sub: id, email });
    return { token, user: { id, email, role } };
  });

  fastify.post('/login', { preHandler: loginLimit }, async (request, reply) => {
    const { email, password } = request.body || {};
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email || '');
    if (!user || !verifyPassword(password || '', user.password_hash)) {
      return reply.code(401).send({ error: 'invalid credentials' });
    }
    const token = await reply.jwtSign({ sub: user.id, email: user.email });
    return { token, user: { id: user.id, email: user.email, role: user.role } };
  });

  fastify.get('/me', { onRequest: [fastify.authenticate] }, async (request) => {
    const user = db.prepare('SELECT id, email, name, role, created_at FROM users WHERE id = ?').get(request.user.sub);
    return { user };
  });

  // Get current user profile with full details
  fastify.get('/profile', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const user = db.prepare(
      `SELECT id, email, name, role, created_at, github_login, github_avatar, cf_token, cf_account
       FROM users WHERE id = ?`
    ).get(request.user.sub);
    if (!user) return reply.code(404).send({ error: 'user not found' });
    // Never expose the raw Cloudflare token; surface only connection status.
    const { cf_token, ...safe } = user;
    return { ...safe, cf_connected: Boolean(cf_token) };
  });

  // Update current user profile (name, email)
  fastify.put('/profile', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { name, email } = request.body || {};
    const userId = request.user.sub;

    // Validate input
    if (name !== undefined && typeof name !== 'string') {
      return reply.code(400).send({ error: 'name must be a string' });
    }
    if (name !== undefined && name.length > 100) {
      return reply.code(400).send({ error: 'name must be 100 characters or less' });
    }

    // Get current user
    const currentUser = db.prepare('SELECT email FROM users WHERE id = ?').get(userId);
    if (!currentUser) return reply.code(404).send({ error: 'user not found' });

    // Check if email is being changed and already exists
    if (email && email !== currentUser.email) {
      const existing = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, userId);
      if (existing) return reply.code(400).send({ error: 'email already in use' });
    }

    // Build update query
    const updates = [];
    const values = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (email && email !== currentUser.email) {
      updates.push('email = ?');
      values.push(email);
    }

    if (updates.length === 0) {
      return reply.code(400).send({ error: 'no changes provided' });
    }

    values.push(userId);
    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    return { ok: true };
  });

  // Change password (requires current password verification)
  fastify.post('/change-password', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { currentPassword, newPassword } = request.body || {};

    if (!currentPassword || !newPassword) {
      return reply.code(400).send({ error: 'current password and new password required' });
    }
    if (newPassword.length < 8) {
      return reply.code(400).send({ error: 'new password must be at least 8 characters' });
    }

    const userId = request.user.sub;
    const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId);
    if (!user) return reply.code(404).send({ error: 'user not found' });

    // Verify current password
    if (!verifyPassword(currentPassword, user.password_hash)) {
      return reply.code(400).send({ error: 'current password is incorrect' });
    }

    // Update password
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(newPassword), userId);

    return { ok: true };
  });
}
