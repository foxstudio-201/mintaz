// GitHub OAuth + REST helpers (uses global fetch, no dependency).
import { config, dashUrl } from '../config.js';
import { getSetting, getSecretSetting } from './settings.js';

const UA = 'Mintaz';

// OAuth App credentials & public URL — DB settings win over .env.
export function clientId() {
  return getSetting('gh_client_id') || config.githubOAuthClientId;
}
export function clientSecret() {
  return getSecretSetting('gh_client_secret') || config.githubOAuthClientSecret;
}
export function publicUrl() {
  return (getSetting('gh_public_url') || config.publicUrl || dashUrl()).replace(/\/+$/, '');
}

export function oauthConfigured() {
  return Boolean(clientId() && clientSecret());
}

export function callbackUrl() {
  return `${publicUrl()}/api/github/callback`;
}

// Build the GitHub authorize URL the browser is sent to.
export function authorizeUrl(state) {
  const params = new URLSearchParams({
    client_id: clientId(),
    redirect_uri: callbackUrl(),
    scope: 'repo read:user',
    state,
    allow_signup: 'false',
  });
  return `https://github.com/login/oauth/authorize?${params}`;
}

// Exchange an OAuth code for an access token.
export async function exchangeCode(code) {
  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json', 'user-agent': UA },
    body: JSON.stringify({
      client_id: clientId(),
      client_secret: clientSecret(),
      code,
      redirect_uri: callbackUrl(),
    }),
  });
  const data = await res.json();
  if (!data.access_token) {
    throw new Error(data.error_description || data.error || 'token exchange failed');
  }
  return data.access_token;
}

async function gh(token, path, params) {
  const url = new URL(`https://api.github.com${path}`);
  if (params) for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, {
    headers: {
      authorization: `Bearer ${token}`,
      accept: 'application/vnd.github+json',
      'user-agent': UA,
      'x-github-api-version': '2022-11-28',
    },
  });
  if (res.status === 401) throw Object.assign(new Error('github token invalid'), { status: 401 });
  if (!res.ok) throw new Error(`github api ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function getUser(token) {
  const u = await gh(token, '/user');
  return { login: u.login, avatar: u.avatar_url, name: u.name };
}

// List repositories the user can access (a few pages, newest activity first).
export async function listRepos(token, { maxPages = 4 } = {}) {
  const out = [];
  for (let page = 1; page <= maxPages; page++) {
    const batch = await gh(token, '/user/repos', {
      per_page: '100',
      page: String(page),
      sort: 'pushed',
      affiliation: 'owner,collaborator,organization_member',
    });
    out.push(...batch);
    if (batch.length < 100) break;
  }
  return out.map((r) => ({
    id: r.id,
    name: r.name,
    full_name: r.full_name,
    owner: r.owner?.login,
    private: r.private,
    description: r.description,
    default_branch: r.default_branch,
    clone_url: r.clone_url,
    html_url: r.html_url,
    language: r.language,
    pushed_at: r.pushed_at,
    stars: r.stargazers_count,
  }));
}

export async function listBranches(token, owner, repo) {
  const branches = await gh(token, `/repos/${owner}/${repo}/branches`, { per_page: '100' });
  return branches.map((b) => b.name);
}
