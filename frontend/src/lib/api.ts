export type Profile = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  created_at: number;
  github_login: string | null;
  github_avatar: string | null;
  cf_connected: boolean;
  cf_account: string | null;
};

export type EnvVar = { id?: string; scope: 'all' | 'production' | 'preview'; key: string; value: string };

export type Framework = {
  id: string;
  label: string;
  icon: string;
  type: 'node' | 'static' | 'dockerfile';
  port: number;
  install: string;
  build: string;
  start: string;
  output: string;
  detect: boolean;
};

export type Project = {
  id: string;
  name: string;
  slug: string;
  repo_url: string;
  branch: string;
  has_git_token: boolean;
  build_method: string;
  framework: string;
  output_dir: string | null;
  dockerfile_path: string;
  install_command: string | null;
  build_command: string | null;
  start_command: string | null;
  internal_port: number;
  restart_policy: string;
  preview_enabled: boolean;
  auto_destroy_pr: boolean;
  webhook_secret: string;
  cf_zone_id: string | null;
  cf_zone_name: string | null;
  production_url: string;
  webhook_url: string;
  statusCounts: Record<string, number>;
  latestDeployment: Deployment | null;
  activePreviews: number;
  created_at: number;
};

export type Deployment = {
  id: string;
  project_id: string;
  type: 'production' | 'preview';
  branch: string;
  pr_number: number | null;
  commit_sha: string | null;
  commit_msg: string | null;
  status: string;
  image_tag: string | null;
  host_port: number | null;
  subdomain: string | null;
  url: string | null;
  error: string | null;
  trigger: string;
  created_at: number;
  finished_at: number | null;
};

export type Preview = {
  id: string;
  kind: 'branch' | 'pr';
  branch: string;
  pr_number: number | null;
  subdomain: string;
  status: 'active' | 'destroyed';
  deployment_id: string | null;
  updated_at: number;
};

const TOKEN_KEY = 'mintaz.token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

async function req<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = tokenStore.get();
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (res.status === 401) {
    tokenStore.clear();
    if (!path.startsWith('/auth')) window.location.href = '/login';
  }
  const data = res.headers.get('content-type')?.includes('json') ? await res.json() : null;
  if (!res.ok) throw new Error((data && data.error) || `request failed (${res.status})`);
  return data as T;
}

export const api = {
  login: (email: string, password: string) =>
    req<{ token: string; user: any }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (email: string, password: string) =>
    req<{ token: string; user: any }>('/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => req<{ user: any }>('/auth/me'),
  getProfile: () => req<Profile>('/auth/profile'),
  updateProfile: (data: { name?: string; email?: string }) =>
    req<{ ok: boolean }>('/auth/profile', { method: 'PUT', body: JSON.stringify(data) }),
  changePassword: (currentPassword: string, newPassword: string) =>
    req<{ ok: boolean }>('/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) }),
  status: () => req<any>('/status'),
  frameworks: () => req<{ frameworks: Framework[] }>('/frameworks'),

  listProjects: () => req<{ projects: Project[] }>('/projects'),
  getProject: (id: string) => req<{ project: Project }>(`/projects/${id}`),
  createProject: (body: any) => req<{ project: Project; deployment: Deployment | null }>('/projects', { method: 'POST', body: JSON.stringify(body) }),
  updateProject: (id: string, body: any) => req<{ project: Project }>(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteProject: (id: string) => req<{ ok: boolean }>(`/projects/${id}`, { method: 'DELETE' }),
  deploy: (id: string, body: any = {}) => req<{ deployment: Deployment }>(`/projects/${id}/deploy`, { method: 'POST', body: JSON.stringify(body) }),
  rotateSecret: (id: string) => req<{ webhook_secret: string }>(`/projects/${id}/rotate-secret`, { method: 'POST' }),

  deploymentHealth: (id: string, since = 0) => req<{ summary: HealthSummary; checks: HealthCheck[] }>(`/deployments/${id}/health?since=${since}`),
  deploymentFiles: (id: string, path = '') => req<{ path: string; entries: FileEntry[] }>(`/deployments/${id}/files?path=${encodeURIComponent(path)}`),
  deploymentFile: (id: string, path: string) => req<FileContent>(`/deployments/${id}/file?path=${encodeURIComponent(path)}`),

  cfStatus: () => req<CfStatus>('/cloudflare/status'),
  cfConnect: (token: string) => req<{ ok: boolean; account: string | null; zones: CfZone[] }>('/cloudflare/connect', { method: 'POST', body: JSON.stringify({ token }) }),
  cfDisconnect: () => req<{ ok: boolean }>('/cloudflare/disconnect', { method: 'POST' }),
  cfZones: () => req<{ zones: CfZone[] }>('/cloudflare/zones'),
  cfSetTunnel: (tunnel_cname: string) => req<{ ok: boolean; tunnel_cname: string }>('/cloudflare/tunnel', { method: 'POST', body: JSON.stringify({ tunnel_cname }) }),
  cfSetDomain: (projectId: string, zone_id: string, zone_name: string) =>
    req<{ ok: boolean; hostname: string; url: string; updated: boolean }>(`/cloudflare/project/${projectId}/domain`, { method: 'POST', body: JSON.stringify({ zone_id, zone_name }) }),
  cfRemoveDomain: (projectId: string) => req<{ ok: boolean }>(`/cloudflare/project/${projectId}/domain`, { method: 'DELETE' }),

  adminDefaults: () => req<AdminDefaults>('/admin/defaults'),
  adminDefaultZones: (token?: string) => req<{ zones: CfZone[] }>('/admin/defaults/zones', { method: 'POST', body: JSON.stringify({ token: token || '' }) }),
  adminSaveDefaults: (body: { token?: string; zone_id: string; zone_name: string; tunnel_cname: string }) =>
    req<{ ok: boolean }>('/admin/defaults', { method: 'POST', body: JSON.stringify(body) }),
  adminClearDefaults: () => req<{ ok: boolean }>('/admin/defaults/clear', { method: 'POST' }),

  listDeployments: (projectId: string) => req<{ deployments: Deployment[] }>(`/deployments/project/${projectId}`),
  listPreviews: (projectId: string) => req<{ previews: Preview[] }>(`/deployments/project/${projectId}/previews`),
  getDeployment: (id: string) => req<{ deployment: Deployment }>(`/deployments/${id}`),
  deploymentLogs: (id: string, since = 0) => req<{ logs: any[] }>(`/deployments/${id}/logs?since=${since}`),
  stopDeployment: (id: string) => req<{ ok: boolean }>(`/deployments/${id}/stop`, { method: 'POST' }),
  destroyPreview: (previewId: string) => req<{ ok: boolean }>(`/deployments/preview/${previewId}`, { method: 'DELETE' }),

  getEnv: (projectId: string) => req<{ env: EnvVar[] }>(`/env/${projectId}`),
  putEnv: (projectId: string, env: EnvVar[]) => req<{ env: EnvVar[] }>(`/env/${projectId}`, { method: 'PUT', body: JSON.stringify({ env }) }),

  deliveries: (projectId: string) => req<{ deliveries: any[] }>(`/webhooks/deliveries/${projectId}`),

  githubStatus: () => req<GithubStatus>('/github/status'),
  githubAuthorize: () => req<{ url: string }>('/github/authorize'),
  githubConnectToken: (token: string) => req<{ ok: boolean; login: string }>('/github/connect-token', { method: 'POST', body: JSON.stringify({ token }) }),
  githubGetConfig: () => req<GithubOAuthConfig>('/github/config'),
  githubSaveConfig: (body: { client_id: string; client_secret: string; public_url: string }) =>
    req<GithubOAuthConfig>('/github/config', { method: 'POST', body: JSON.stringify(body) }),
  githubDisconnect: () => req<{ ok: boolean }>('/github/disconnect', { method: 'POST' }),
  githubRepos: () => req<{ repos: GithubRepo[] }>('/github/repos'),
  githubBranches: (owner: string, repo: string) => req<{ branches: string[] }>(`/github/repos/${owner}/${repo}/branches`),

  quotasStatus: () => req<QuotaStatusResponse>('/quotas/status'),
  quotasUpdate: (body: Record<string, any>) => req<{ quotas: any }>('/quotas', { method: 'PATCH', body: JSON.stringify(body) }),

  adminUsers: () => req<{ users: AdminUser[] }>('/admin/users'),
  adminSuspendUser: (id: string) => req<{ suspended: boolean }>(`/admin/users/${id}/suspend`, { method: 'POST' }),
  adminChangePassword: (id: string, password: string) => req<{ ok: boolean }>(`/admin/users/${id}/password`, { method: 'POST', body: JSON.stringify({ password }) }),
  adminDeleteUser: (id: string) => req<{ ok: boolean }>(`/admin/users/${id}`, { method: 'DELETE' }),
  adminChangeRole: (id: string, role: string) => req<{ ok: boolean }>(`/admin/users/${id}/role`, { method: 'POST', body: JSON.stringify({ role }) }),
  adminSystem: () => req<SystemMetrics>('/admin/system'),
  adminSystemHistory: () => req<{ history: SystemMetricPoint[] }>('/admin/system/history'),
  adminSettings: () => req<{ allow_registration: boolean }>('/admin/settings'),
  adminTraffic: () => req<AdminTraffic>('/admin/traffic'),
  adminVersion: () => req<{ version: string }>('/admin/version'),
  adminUpdateCheck: () => req<UpdateInfo>('/admin/update/check'),
  adminUpdateApply: () => req<{ started: boolean }>('/admin/update/apply', { method: 'POST' }),
  adminUpdateStatus: () => req<{ running: boolean; done: boolean; ok: boolean; log: string[]; startedAt: number }>('/admin/update/status'),
  adminSaveSettings: (body: { allow_registration: boolean }) =>
    req<{ ok: boolean; allow_registration: boolean }>('/admin/settings', { method: 'POST', body: JSON.stringify(body) }),

  analyticsDeployments: () => req<{ deployments: any[] }>('/analytics/deployments'),
  analyticsSummary: (deploymentId: string, days: number) => req<any>(`/analytics/${deploymentId}/summary?days=${days}`),
  analyticsTimeseries: (deploymentId: string, days: number) => req<{ timeseries: any[] }>(`/analytics/${deploymentId}/timeseries?days=${days}`),
  analyticsPages: (deploymentId: string, days: number) => req<{ pages: any[] }>(`/analytics/${deploymentId}/pages?days=${days}`),
  analyticsReferrers: (deploymentId: string, days: number) => req<{ referrers: any[] }>(`/analytics/${deploymentId}/referrers?days=${days}`),
  analyticsCountries: (deploymentId: string, days: number) => req<{ countries: any[] }>(`/analytics/${deploymentId}/countries?days=${days}`),
  analyticsDevices: (deploymentId: string, days: number) => req<any>(`/analytics/${deploymentId}/devices?days=${days}`),
  analyticsVisitors: (deploymentId: string, days: number) => req<{ visitors: any[] }>(`/analytics/${deploymentId}/visitors?days=${days}`),
  analyticsEvents: (deploymentId: string, days: number) => req<{ events: any[] }>(`/analytics/${deploymentId}/events?days=${days}`),
};

export type GithubStatus = { configured: boolean; connected: boolean; login: string | null; avatar: string | null };
export type GithubOAuthConfig = { configured: boolean; client_id: string; public_url: string; callback_url: string };

export type HealthCheck = { id: number; ok: number; status_code: number | null; latency_ms: number | null; error: string | null; ts: number };
export type HealthSummary = { total: number; up: number; uptime: number | null; avg_latency: number | null; last: HealthCheck | null };
export type FileEntry = { name: string; type: 'dir' | 'file'; size: number };
export type FileContent = { path: string; size: number; truncated: boolean; binary: boolean; content: string | null };

export type CfZone = { id: string; name: string; account: string };
export type CfStatus = { connected: boolean; account: string | null; tunnel_cname: string | null; tunnel_name: string };
export type AdminDefaults = { configured: boolean; has_token: boolean; zone_id: string | null; zone_name: string | null; tunnel_cname: string | null };
export type AdminUser = {
  id: string; email: string; role: string; created_at: number;
  github_login: string | null; github_avatar: string | null;
  projectCount: number; deployCount: number; runningCount: number; suspended: boolean;
};
export type SystemMetrics = {
  cpu: { percent: number; cores: number; loadAvg: number[] };
  memory: { percent: number; used: number; total: number };
  disk: { percent: number; used: number; total: number };
  docker: { running: number; stopped: number; total: number };
  platform: { users: number; projects: number; deployments: number; running: number };
  uptime: number;
};
export type SystemMetricPoint = { t: number; cpu: number; ram: number; disk: number };

export type UpdateInfo = {
  version: string;
  branch: string;
  current: string | null;
  latest?: string;
  latestMessage?: string;
  latestDate?: string | null;
  updateAvailable?: boolean;
  behind?: number;
  commits?: { sha: string; message: string; date: string | null }[];
  error?: string;
  checkedAt?: number;
};

export type TrafficVisitor = { id: string; visits: number; last: number; country: string | null; city: string | null; device: string | null; browser: string | null };
export type AdminTraffic = {
  totalVisits: number;
  uniqueVisitors: number;
  visits24h: number;
  visitors24h: number;
  visits7d: number;
  countries: { country: string; visits: number; visitors: number }[];
  devices: { device: string; visits: number }[];
  pages: { path: string; visits: number }[];
  visitors: TrafficVisitor[];
  series: { day: number; visits: number; visitors: number }[];
};

export type QuotaMetric = { used: number; soft: number; limit: number };
export type QuotaUsage = {
  projects: QuotaMetric;
  deployments_monthly: QuotaMetric;
  running_containers: QuotaMetric;
  build_minutes_monthly: QuotaMetric;
  storage_gb: QuotaMetric;
  bandwidth_gb_monthly: QuotaMetric;
  cpu_hours_monthly: QuotaMetric;
  memory_gb_hours_monthly: QuotaMetric;
};
export type QuotaStatusResponse = {
  quotas: Record<string, number>;
  usage: QuotaUsage;
  allowed: boolean;
  warnings: { key: string; used: number; limit: number }[];
  reason: string | null;
};

export type GithubRepo = {
  id: number;
  name: string;
  full_name: string;
  owner: string;
  private: boolean;
  description: string | null;
  default_branch: string;
  clone_url: string;
  html_url: string;
  language: string | null;
  pushed_at: string;
  stars: number;
};
