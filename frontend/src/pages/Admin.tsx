import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { api, type AdminUser, type SystemMetrics, type AdminTraffic } from '../lib/api';
import { toast } from '../store/toast';
import { Spinner, timeAgo } from '../components/ui';
import {
  IconServer, IconContainer,
  IconActivity, IconRefresh, IconX, IconKey, IconShield,
} from '../components/icons';

const TABS = [
  { label: 'System', key: 'admin.tabs.system', icon: IconActivity },
  { label: 'Accounts', key: 'admin.tabs.accounts', icon: IconShield },
] as const;
type Tab = (typeof TABS)[number]['label'];

export function Admin() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('System');

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-slate-900 dark:text-white">{t('admin.title')}</h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">{t('admin.subtitle')}</p>

      <div className="mb-5 flex gap-1 border-b border-black/[0.06] dark:border-white/[0.06]">
        {TABS.map((tabItem) => {
          const Icon = tabItem.icon;
          return (
            <button
              key={tabItem.label}
              onClick={() => setTab(tabItem.label)}
              className={`relative flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition ${
                tab === tabItem.label ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t(tabItem.key)}
              {tab === tabItem.label && (
                <motion.span layoutId="admin-tab" className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-500" />
              )}
            </button>
          );
        })}
      </div>

      <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
        {tab === 'System' && <SystemTab />}
        {tab === 'Accounts' && <AccountsTab />}
      </motion.div>
    </div>
  );
}


function flagEmoji(code: string | null) {
  if (!code || code.length !== 2 || code === '??') return '🌐';
  const cc = code.toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return '🌐';
  return String.fromCodePoint(...[...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

const BAR_COLORS = ['bg-brand-500', 'bg-emerald-500', 'bg-amber-500', 'bg-sky-500', 'bg-purple-500', 'bg-pink-500', 'bg-cyan-500', 'bg-orange-500'];

function SystemTab() {
  const { t } = useTranslation();
  const [data, setData] = useState<AdminTraffic | null>(null);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);

  useEffect(() => {
    let alive = true;
    const loadTraffic = () => api.adminTraffic().then((d) => { if (alive) setData(d); }).catch(() => {});
    const loadMetrics = () => api.adminSystem().then((s) => { if (alive) setMetrics(s); }).catch(() => {});
    loadTraffic();
    loadMetrics();
    const a = setInterval(loadTraffic, 15000);
    const b = setInterval(loadMetrics, 30000);
    return () => { alive = false; clearInterval(a); clearInterval(b); };
  }, []);

  if (!data) return <div className="flex justify-center p-12"><Spinner className="h-6 w-6" /></div>;

  const fmtUptime = (s: number) => {
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const empty = data.totalVisits === 0;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t('admin.traffic.title')}</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">{t('admin.traffic.subtitle')}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label={t('admin.traffic.totalVisits')} value={data.totalVisits} accent="from-brand-500/20 to-brand-500/5" ring="text-brand-500" />
        <Kpi label={t('admin.traffic.uniqueVisitors')} value={data.uniqueVisitors} accent="from-emerald-500/20 to-emerald-500/5" ring="text-emerald-500" />
        <Kpi label={t('admin.traffic.visits24h')} value={data.visits24h} accent="from-amber-500/20 to-amber-500/5" ring="text-amber-500" />
        <Kpi label={t('admin.traffic.visitors24h')} value={data.visitors24h} accent="from-sky-500/20 to-sky-500/5" ring="text-sky-500" />
      </div>

      {data.series.length > 1 && <TrafficChart series={data.series} label={t('admin.traffic.last14d')} />}

      <div className="grid gap-4 lg:grid-cols-3">
        <BarList title={t('admin.traffic.topCountries')} rows={data.countries.map((c) => ({ label: `${flagEmoji(c.country)} ${c.country || t('admin.traffic.unknown')}`, value: c.visits }))} />
        <BarList title={t('admin.traffic.devices')} rows={data.devices.map((d) => ({ label: d.device, value: d.visits }))} />
        <BarList title={t('admin.traffic.topPages')} rows={data.pages.map((p) => ({ label: p.path, value: p.visits }))} mono />
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-black/[0.06] px-4 py-3 text-sm font-semibold text-slate-800 dark:border-white/[0.06] dark:text-slate-100">
          {t('admin.traffic.recentVisitors')}
        </div>
        {empty ? (
          <div className="p-8 text-center text-sm text-slate-500">{t('admin.traffic.noData')}</div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[640px]">
              <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1.6fr)_minmax(0,1.4fr)_88px_112px] divide-x divide-black/[0.06] border-b border-black/[0.06] text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:divide-white/[0.06] dark:border-white/[0.06]">
                <span className="px-4 py-2">{t('admin.traffic.visitor')}</span>
                <span className="px-4 py-2">{t('admin.traffic.location')}</span>
                <span className="px-4 py-2">{t('admin.traffic.device')}</span>
                <span className="px-4 py-2 text-right">{t('admin.traffic.visits')}</span>
                <span className="px-4 py-2 text-right">{t('admin.traffic.lastSeen')}</span>
              </div>
              {data.visitors.map((v, i) => (
                <div key={v.id + i} className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1.6fr)_minmax(0,1.4fr)_88px_112px] divide-x divide-black/[0.04] border-b border-black/[0.04] text-sm last:border-0 dark:divide-white/[0.03] dark:border-white/[0.03]">
                  <span className="flex min-w-0 items-center gap-2 px-4 py-2.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-500/15 text-[10px] font-bold text-brand-500">{(v.id || '?')[0].toUpperCase()}</span>
                    <span className="truncate font-mono text-xs text-slate-500">{v.id}</span>
                  </span>
                  <span className="flex min-w-0 items-center gap-1.5 px-4 py-2.5 text-slate-700 dark:text-slate-300">
                    <span className="shrink-0">{flagEmoji(v.country)}</span>
                    <span className="truncate">{[v.city, v.country].filter(Boolean).join(', ') || t('admin.traffic.unknown')}</span>
                  </span>
                  <span className="flex min-w-0 items-center gap-1.5 px-4 py-2.5 text-xs">
                    <span className="shrink-0 rounded-md bg-black/[0.05] px-1.5 py-0.5 capitalize text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">{v.device || '—'}</span>
                    <span className="truncate text-slate-500">{v.browser || ''}</span>
                  </span>
                  <span className="flex items-center justify-end px-4 py-2.5 text-right font-semibold text-slate-800 dark:text-slate-100">{v.visits}</span>
                  <span className="flex items-center justify-end px-4 py-2.5 text-right text-xs text-slate-500">{timeAgo(v.last)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {metrics && (
        <div className="grid gap-4 sm:grid-cols-4">
          <MiniStat icon={<IconContainer className="w-4 h-4" />} label={t('admin.system.containers')} value={`${metrics.docker.running} / ${metrics.docker.total}`} sub={t('admin.system.runningTotal')} />
          <MiniStat icon={<IconServer className="w-4 h-4" />} label={t('admin.system.deployments')} value={String(metrics.platform.running)} sub={t('admin.system.currentlyRunning')} />
          <MiniStat icon={<IconActivity className="w-4 h-4" />} label={t('admin.system.projects')} value={String(metrics.platform.projects)} sub={t('admin.system.totalDeploys', { count: metrics.platform.deployments })} />
          <MiniStat icon={<IconRefresh className="w-4 h-4" />} label={t('admin.system.uptime')} value={fmtUptime(metrics.uptime)} sub={t('admin.system.server')} />
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, accent, ring }: { label: string; value: number; accent: string; ring: string }) {
  return (
    <div className={`card relative overflow-hidden bg-gradient-to-br p-4 ${accent}`}>
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
      <div className={`mt-1 text-3xl font-bold ${ring}`}>{value.toLocaleString()}</div>
    </div>
  );
}

function BarList({ title, rows, mono }: { title: string; rows: { label: string; value: number }[]; mono?: boolean }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className="card p-4">
      <div className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</div>
      {rows.length === 0 ? (
        <div className="py-4 text-center text-xs text-slate-500">—</div>
      ) : (
        <div className="space-y-2.5">
          {rows.map((r, i) => (
            <div key={i}>
              <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                <span className={`truncate text-slate-600 dark:text-slate-300 ${mono ? 'font-mono' : ''}`}>{r.label}</span>
                <span className="shrink-0 font-semibold text-slate-700 dark:text-slate-200">{r.value}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/10">
                <div className={`h-full rounded-full ${BAR_COLORS[i % BAR_COLORS.length]}`} style={{ width: `${(r.value / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TrafficChart({ series, label }: { series: { day: number; visits: number; visitors: number }[]; label: string }) {
  const max = Math.max(...series.map((s) => s.visits), 1);
  return (
    <div className="card p-4">
      <div className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">{label}</div>
      <div className="flex items-end gap-1.5" style={{ height: 120 }}>
        {series.map((s, i) => (
          <div key={i} className="group relative flex flex-1 flex-col items-center justify-end">
            <div
              className="w-full rounded-t bg-gradient-to-t from-brand-500/40 to-brand-500 transition-all hover:from-brand-500 hover:to-brand-400"
              style={{ height: `${Math.max((s.visits / max) * 100, 3)}%` }}
            />
            <div className="pointer-events-none absolute -top-7 hidden whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[10px] text-white group-hover:block dark:bg-slate-700">
              {s.visits} · {new Date(s.day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniStat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return (
    <div className="card px-4 py-3">
      <div className="mb-1 flex items-center gap-1.5 text-xs text-slate-500">{icon} {label}</div>
      <div className="text-lg font-semibold text-slate-800 dark:text-slate-100">{value}</div>
      <div className="text-[10px] text-slate-500">{sub}</div>
    </div>
  );
}


function AccountsTab() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [pwdModal, setPwdModal] = useState<string | null>(null);
  const [allowReg, setAllowReg] = useState<boolean | null>(null);

  const load = async () => {
    try {
      const { users } = await api.adminUsers();
      setUsers(users);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    api.adminSettings().then((s) => setAllowReg(s.allow_registration)).catch(() => {});
  }, []);

  const toggleRegistration = async (next: boolean) => {
    setAllowReg(next);
    try {
      await api.adminSaveSettings({ allow_registration: next });
      toast.success(t('admin.accounts.registrationSaved'));
    } catch (e: any) {
      toast.error(e.message);
      setAllowReg(!next);
    }
  };

  const suspend = async (id: string) => {
    try {
      await api.adminSuspendUser(id);
      toast.success(t('admin.accounts.statusToggled'));
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const remove = async (id: string, email: string) => {
    if (!confirm(t('admin.accounts.deleteConfirm', { email }))) return;
    try {
      await api.adminDeleteUser(id);
      toast.success(t('admin.accounts.deleted'));
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const changeRole = async (id: string, role: string) => {
    try {
      await api.adminChangeRole(id, role);
      toast.success(t('admin.accounts.roleChanged', { role }));
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  if (loading) return <div className="flex justify-center p-12"><Spinner className="h-6 w-6" /></div>;

  return (
    <div className="space-y-4">
      {allowReg !== null && (
        <div className="card flex items-center justify-between gap-4 p-4">
          <div>
            <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{t('admin.accounts.publicRegistration')}</div>
            <div className="text-xs text-slate-500">{t('admin.accounts.publicRegistrationHint')}</div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={allowReg}
            onClick={() => toggleRegistration(!allowReg)}
            className={`relative h-6 w-11 shrink-0 rounded-full transition ${allowReg ? 'bg-brand-500' : 'bg-black/[0.12] dark:bg-white/10'}`}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${allowReg ? 'left-[22px]' : 'left-0.5'}`} />
          </button>
        </div>
      )}

      <div className="text-xs text-slate-500">{t('admin.accounts.count', { count: users?.length || 0 })}</div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
        <div className="min-w-[640px]">
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 border-b border-black/[0.06] dark:border-white/[0.06] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          <span>{t('admin.accounts.user')}</span>
          <span className="text-center">{t('admin.accounts.projects')}</span>
          <span className="text-center">{t('admin.accounts.deploys')}</span>
          <span className="w-20 text-center">{t('admin.accounts.role')}</span>
          <span className="w-40 text-right">{t('admin.accounts.actions')}</span>
        </div>

        {users?.map((u) => (
          <div key={u.id} className={`grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 items-center px-4 py-3 text-sm border-b border-black/[0.04] dark:border-white/[0.03] last:border-0 ${u.suspended ? 'opacity-50' : ''}`}>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-500/10 text-xs font-semibold text-brand-400">
                  {u.email[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="truncate font-medium text-slate-800 dark:text-slate-200">{u.email}</div>
                  {u.github_login && <div className="text-[10px] text-slate-500">@{u.github_login}</div>}
                </div>
                {u.suspended && <span className="rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] text-red-400">{t('admin.accounts.suspended')}</span>}
              </div>
            </div>
            <span className="w-12 text-center text-xs text-slate-500">{u.projectCount}</span>
            <span className="w-12 text-center text-xs text-slate-500">{u.deployCount}</span>
            <select
              className="w-20 rounded-lg border border-black/[0.08] dark:border-white/10 bg-transparent px-2 py-1 text-xs text-slate-700 dark:text-slate-300 outline-none"
              value={u.role}
              onChange={(e) => changeRole(u.id, e.target.value)}
            >
              <option value="user">{t('admin.accounts.roleUser')}</option>
              <option value="admin">{t('admin.accounts.roleAdmin')}</option>
            </select>
            <div className="flex w-40 justify-end gap-1">
              <button className="btn-ghost px-2 py-1 text-[10px]" onClick={() => setPwdModal(u.id)} title={t('admin.accounts.changePasswordTitle')}>
                <IconKey className="w-3.5 h-3.5" />
              </button>
              <button className="btn-ghost px-2 py-1 text-[10px]" onClick={() => suspend(u.id)} title={u.suspended ? t('admin.accounts.unsuspend') : t('admin.accounts.suspend')}>
                {u.suspended ? '▶' : '⏸'}
              </button>
              <button className="btn-ghost px-2 py-1 text-[10px] text-red-400 hover:text-red-300" onClick={() => remove(u.id, u.email)} title={t('common.delete')}>
                <IconX className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
        </div>
        </div>
      </div>

      {pwdModal && <PasswordModal userId={pwdModal} onClose={() => setPwdModal(null)} onSaved={() => { setPwdModal(null); load(); }} />}
    </div>
  );
}

function PasswordModal({ userId, onClose, onSaved }: { userId: string; onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation();
  const [pwd, setPwd] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (pwd.length < 8) return toast.error(t('admin.accounts.passwordMin'));
    setSaving(true);
    try {
      await api.adminChangePassword(userId, pwd);
      toast.success(t('admin.accounts.passwordChanged'));
      onSaved();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="card w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">{t('admin.accounts.changePasswordTitle')}</h3>
        <input className="input mb-4" type="password" placeholder={t('admin.accounts.newPasswordPlaceholder')} value={pwd} onChange={(e) => setPwd(e.target.value)} />
        <div className="flex justify-end gap-2">
          <button className="btn-ghost" onClick={onClose}>{t('common.cancel')}</button>
          <button className="btn-primary" onClick={submit} disabled={saving}>{saving ? <Spinner /> : t('common.save')}</button>
        </div>
      </div>
    </div>
  );
}
