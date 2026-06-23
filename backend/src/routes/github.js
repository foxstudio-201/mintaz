import { db } from '../db/index.js';
import {
  oauthConfigured,
  authorizeUrl,
  exchangeCode,
  getUser,
  listRepos,
  listBranches,
  clientId,
  publicUrl,
  callbackUrl,
} from '../services/github.js';
import { setSetting, setSecretSetting } from '../services/settings.js';
import { encryptSecret, decryptSecret } from '../util/crypto.js';

function connection(userId) {
  const row = db.prepare('SELECT github_login, github_token, github_avatar FROM users WHERE id = ?').get(userId);
  if (row?.github_token) row.github_token = decryptSecret(row.github_token);
  return row;
}

export default async function githubRoutes(fastify) {
  fastify.get('/status', { onRequest: [fastify.authenticate] }, async (request) => {
    const c = connection(request.user.sub);
    return {
      configured: oauthConfigured(),
      connected: Boolean(c?.github_token),
      login: c?.github_login || null,
      avatar: c?.github_avatar || null,
    };
  });

  fastify.get('/config', { onRequest: [fastify.authenticate] }, async () => ({
    configured: oauthConfigured(),
    client_id: clientId(),
    public_url: publicUrl(),
    callback_url: callbackUrl(),
  }));

  fastify.post('/config', { onRequest: [fastify.authenticate] }, async (request) => {
    const b = request.body || {};
    if (typeof b.public_url === 'string') setSetting('gh_public_url', b.public_url.trim().replace(/\/+$/, ''));
    if (typeof b.client_id === 'string') setSetting('gh_client_id', b.client_id.trim());
    if (typeof b.client_secret === 'string' && b.client_secret.trim()) setSecretSetting('gh_client_secret', b.client_secret.trim());
    return { configured: oauthConfigured(), client_id: clientId(), public_url: publicUrl(), callback_url: callbackUrl() };
  });

  fastify.get('/authorize', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    if (!oauthConfigured()) return reply.code(400).send({ error: 'GitHub OAuth not configured on this server' });
    const state = await reply.jwtSign({ sub: request.user.sub, kind: 'gh-oauth' }, { expiresIn: '10m' });
    return { url: authorizeUrl(state) };
  });

  fastify.get('/callback', async (request, reply) => {
    const { code, state, error } = request.query || {};
    const redirect = (q) => reply.redirect(`/settings?${q}`);
    if (error) return redirect(`github=error&msg=${encodeURIComponent(error)}`);
    if (!code || !state) return redirect('github=error&msg=missing_code');

    let userId;
    try {
      const decoded = fastify.jwt.verify(state);
      if (decoded.kind !== 'gh-oauth') throw new Error('bad state');
      userId = decoded.sub;
    } catch {
      return redirect('github=error&msg=bad_state');
    }

    try {
      const token = await exchangeCode(code);
      const user = await getUser(token);
      db.prepare(
        'UPDATE users SET github_login = ?, github_token = ?, github_avatar = ? WHERE id = ?'
      ).run(user.login, encryptSecret(token), user.avatar, userId);
      return redirect('github=connected');
    } catch (err) {
      request.log.error(err);
      return redirect(`github=error&msg=${encodeURIComponent(err.message)}`);
    }
  });

  fastify.post('/connect-token', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const token = String(request.body?.token || '').trim();
    if (!token) return reply.code(400).send({ error: 'token required' });
    try {
      const user = await getUser(token);
      db.prepare('UPDATE users SET github_login = ?, github_token = ?, github_avatar = ? WHERE id = ?').run(
        user.login,
        encryptSecret(token),
        user.avatar,
        request.user.sub
      );
      return { ok: true, login: user.login };
    } catch (err) {
      return reply.code(401).send({ error: 'invalid token — needs `repo` scope' });
    }
  });

  fastify.post('/disconnect', { onRequest: [fastify.authenticate] }, async (request) => {
    db.prepare('UPDATE users SET github_login = NULL, github_token = NULL, github_avatar = NULL WHERE id = ?').run(request.user.sub);
    return { ok: true };
  });

  fastify.get('/repos', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const c = connection(request.user.sub);
    if (!c?.github_token) return reply.code(400).send({ error: 'GitHub not connected' });
    try {
      const repos = await listRepos(c.github_token);
      return { repos };
    } catch (err) {
      if (err.status === 401) return reply.code(401).send({ error: 'GitHub token expired — reconnect' });
      return reply.code(502).send({ error: err.message });
    }
  });

  fastify.get('/repos/:owner/:repo/branches', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const c = connection(request.user.sub);
    if (!c?.github_token) return reply.code(400).send({ error: 'GitHub not connected' });
    try {
      const branches = await listBranches(c.github_token, request.params.owner, request.params.repo);
      return { branches };
    } catch (err) {
      return reply.code(502).send({ error: err.message });
    }
  });
}
