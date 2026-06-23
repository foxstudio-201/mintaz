// Cloudflare API helpers (token-based). Verify token, list zones, upsert the
// DNS record that points a deployment hostname at the tunnel.
const API = 'https://api.cloudflare.com/client/v4';
const UA = 'Mintaz-Deploy';

async function cf(token, path, { method = 'GET', body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      'user-agent': UA,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    const msg = data.errors?.map((e) => e.message).join('; ') || `cloudflare api ${res.status}`;
    throw Object.assign(new Error(msg), { status: res.status });
  }
  return data.result;
}

// Validate a token; returns its status ("active").
export async function verifyToken(token) {
  const r = await cf(token, '/user/tokens/verify');
  return r?.status || 'unknown';
}

// List zones (domains) the token can manage.
export async function listZones(token) {
  const zones = await cf(token, '/zones?per_page=50&status=active');
  return (zones || []).map((z) => ({ id: z.id, name: z.name, account: z.account?.name }));
}

// Create or update a CNAME (proxied) pointing hostname → tunnel target.
// Returns { recordId }. `target` is the tunnel CNAME, e.g. <id>.cfargotunnel.com.
export async function upsertCname(token, zoneId, hostname, target) {
  const existing = await cf(token, `/zones/${zoneId}/dns_records?type=CNAME&name=${encodeURIComponent(hostname)}`);
  const body = { type: 'CNAME', name: hostname, content: target, proxied: true, ttl: 1 };
  if (existing && existing.length) {
    const id = existing[0].id;
    await cf(token, `/zones/${zoneId}/dns_records/${id}`, { method: 'PUT', body });
    return { recordId: id, updated: true };
  }
  const created = await cf(token, `/zones/${zoneId}/dns_records`, { method: 'POST', body });
  return { recordId: created.id, updated: false };
}

export async function deleteRecord(token, zoneId, recordId) {
  if (!recordId) return;
  await cf(token, `/zones/${zoneId}/dns_records/${recordId}`, { method: 'DELETE' }).catch(() => {});
}

// Look up the tunnel's routable CNAME target. Tries the tunnels API; falls back
// to <name>.cfargotunnel.com which Cloudflare also accepts when the UUID is known.
export async function tunnelCname(token, accountId, tunnelName) {
  if (accountId) {
    try {
      const tunnels = await cf(token, `/accounts/${accountId}/cfd_tunnel?name=${encodeURIComponent(tunnelName)}&is_deleted=false`);
      if (tunnels && tunnels.length) return `${tunnels[0].id}.cfargotunnel.com`;
    } catch {
      /* fall through */
    }
  }
  return null;
}
