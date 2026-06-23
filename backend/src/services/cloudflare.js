const API = 'https://api.cloudflare.com/client/v4';
const UA = 'Mintaz';

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

export async function verifyToken(token) {
  const r = await cf(token, '/user/tokens/verify');
  return r?.status || 'unknown';
}

export async function listZones(token) {
  const zones = await cf(token, '/zones?per_page=50&status=active');
  return (zones || []).map((z) => ({ id: z.id, name: z.name, account: z.account?.name }));
}

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

export async function tunnelCname(token, accountId, tunnelName) {
  if (accountId) {
    try {
      const tunnels = await cf(token, `/accounts/${accountId}/cfd_tunnel?name=${encodeURIComponent(tunnelName)}&is_deleted=false`);
      if (tunnels && tunnels.length) return `${tunnels[0].id}.cfargotunnel.com`;
    } catch {
    }
  }
  return null;
}
