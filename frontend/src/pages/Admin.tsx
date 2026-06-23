import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { api, type AdminUser, type SystemMetrics, type SystemMetricPoint } from '../lib/api';
import { toast } from '../store/toast';
import { Spinner } from '../components/ui';
import {
  IconCpu, IconMemory, IconStorage, IconServer, IconContainer,
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


const CHART_WINDOW = 60;

function SystemTab() {
  const { t } = useTranslation();
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [history, setHistory] = useState<SystemMetricPoint[]>([]);

  useEffect(() => {
    let alive = true;
    const loadMetrics = () =>
      api.adminSystem().then((s) => { if (alive) setMetrics(s); }).catch(() => {});
    const loadHistory = () =>
      api.adminSystemHistory().then(({ history }) => { if (alive) setHistory(history); }).catch(() => {});

    loadMetrics();
    loadHistory();
    const mt = setInterval(loadMetrics, 10000);
    const ht = setInterval(loadHistory, 60000);
    return () => { alive = false; clearInterval(mt); clearInterval(ht); };
  }, []);

  if (!metrics) return <div className="flex justify-center p-12"><Spinner className="h-6 w-6" /></div>;

  const recent = history.slice(-CHART_WINDOW);

  const fmtBytes = (n: number) => {
    if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(1)} GB`;
    if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(0)} MB`;
    return `${(n / 1024).toFixed(0)} KB`;
  };

  const fmtUptime = (s: number) => {
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <GaugeCard icon={<IconCpu className="w-5 h-5" />} label={t('admin.system.cpu')} percent={metrics.cpu.percent}
          detail={t('admin.system.cpuDetail', { cores: metrics.cpu.cores, load: metrics.cpu.loadAvg.join(', ') })} />
        <GaugeCard icon={<IconMemory className="w-5 h-5" />} label={t('admin.system.memory')} percent={metrics.memory.percent}
          detail={`${fmtBytes(metrics.memory.used)} / ${fmtBytes(metrics.memory.total)}`} />
        <GaugeCard icon={<IconStorage className="w-5 h-5" />} label={t('admin.system.disk')} percent={metrics.disk.percent}
          detail={`${fmtBytes(metrics.disk.used)} / ${fmtBytes(metrics.disk.total)}`} />
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <MiniStat icon={<IconContainer className="w-4 h-4" />} label={t('admin.system.containers')} value={`${metrics.docker.running} / ${metrics.docker.total}`} sub={t('admin.system.runningTotal')} />
        <MiniStat icon={<IconServer className="w-4 h-4" />} label={t('admin.system.deployments')} value={String(metrics.platform.running)} sub={t('admin.system.currentlyRunning')} />
        <MiniStat icon={<IconActivity className="w-4 h-4" />} label={t('admin.system.projects')} value={String(metrics.platform.projects)} sub={t('admin.system.totalDeploys', { count: metrics.platform.deployments })} />
        <MiniStat icon={<IconRefresh className="w-4 h-4" />} label={t('admin.system.uptime')} value={fmtUptime(metrics.uptime)} sub={t('admin.system.server')} />
      </div>

      {recent.length > 2 && (
        <div className="grid gap-4 sm:grid-cols-1">
          <LineChart title={t('admin.system.cpuChart')} data={recent.map((h) => ({ t: h.t, v: h.cpu }))} color="#5b73ff" />
          <LineChart title={t('admin.system.memoryChart')} data={recent.map((h) => ({ t: h.t, v: h.ram }))} color="#f59e0b" />
          <LineChart title={t('admin.system.diskChart')} data={recent.map((h) => ({ t: h.t, v: h.disk }))} color="#10b981" />
        </div>
      )}
    </div>
  );
}

function GaugeCard({ icon, label, percent, detail }: { icon: React.ReactNode; label: string; percent: number; detail: string }) {
  const color = percent >= 90 ? 'text-red-400' : percent >= 70 ? 'text-amber-400' : 'text-brand-400';
  const barColor = percent >= 90 ? 'bg-red-500' : percent >= 70 ? 'bg-amber-500' : 'bg-brand-500';
  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center gap-2 text-xs text-slate-500">{icon} <span className="uppercase tracking-wide">{label}</span></div>
      <div className={`text-3xl font-bold ${color}`}>{percent}%</div>
      <div className="mt-1 text-xs text-slate-500">{detail}</div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-black/[0.04] dark:bg-white/5">
        <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${percent}%` }} />
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

function LineChart({ title, data, color }: { title: string; data: { t: number; v: number }[]; color: string }) {
  const W = 600, H = 120, PAD = 4;
  const max = Math.max(...data.map((d) => d.v), 1);
  const min = Math.min(...data.map((d) => d.v), 0);
  const range = max - min || 1;

  const points = data.map((d, i) => {
    const x = PAD + (i / (data.length - 1)) * (W - PAD * 2);
    const y = PAD + (1 - (d.v - min) / range) * (H - PAD * 2);
    return `${x},${y}`;
  });

  const areaPoints = [
    `${PAD},${H - PAD}`,
    ...points,
    `${W - PAD},${H - PAD}`,
  ].join(' ');

  const last = data[data.length - 1];

  return (
    <div className="card p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{title}</span>
        <span className="text-xs font-medium" style={{ color }}>{last.v}%</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" style={{ height: 120 }}>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={PAD} x2={W - PAD} y1={PAD + f * (H - PAD * 2)} y2={PAD + f * (H - PAD * 2)}
            stroke="currentColor" strokeOpacity={0.06} strokeWidth={1} />
        ))}
        <polygon points={areaPoints} fill={color} fillOpacity={0.1} />
        <polyline points={points.join(' ')} fill="none" stroke={color} strokeWidth={2}
          strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={points[points.length - 1]?.split(',')[0]} cy={points[points.length - 1]?.split(',')[1]}
          r={3} fill={color} />
      </svg>
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
