import { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { api, type Project, type Deployment, type HealthSummary, type QuotaStatusResponse } from '../lib/api';
import { StatusBadge, timeAgo } from './ui';
import {
  IconRefresh, IconExternalLink, IconBranch, IconGlobe,
  IconStatusOnline, IconStatusOffline,
  IconDeploy, IconServer, IconTimer, IconStorage,
} from './icons';

export function OverviewTab({ project, deployment }: { project: Project; deployment: Deployment | null }) {
  const { t } = useTranslation();
  const [summary, setSummary] = useState<HealthSummary | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [reach, setReach] = useState<'checking' | 'up' | 'down'>('checking');
  const [quota, setQuota] = useState<QuotaStatusResponse | null>(null);

  useEffect(() => {
    if (!deployment || deployment.status !== 'running') return;
    api.deploymentHealth(deployment.id).then(({ summary }) => setSummary(summary)).catch(() => {});
  }, [deployment?.id, deployment?.status]);

  useEffect(() => {
    api.quotasStatus().then(setQuota).catch(() => {});
    const t = setInterval(() => api.quotasStatus().then(setQuota).catch(() => {}), 15000);
    return () => clearInterval(t);
  }, []);

  const previewUrl = deployment?.url || project.production_url;
  const isRunning = deployment?.status === 'running';

  useEffect(() => {
    if (!isRunning) return;
    let alive = true;
    const check = async () => {
      setReach('checking');
      try {
        await fetch(previewUrl, { mode: 'no-cors' });
        if (alive) setReach('up');
      } catch {
        if (alive) setReach('down');
      }
    };
    check();
    const t = setInterval(check, 15000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [previewUrl, isRunning, reloadKey]);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/5 px-4 py-2.5">
          <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/60" />
            <span className="ml-2 truncate font-mono text-xs text-slate-500">{previewUrl}</span>
          </div>
          <div className="flex gap-2">
            <button className="btn-ghost px-2.5 py-1 text-xs" onClick={() => setReloadKey((k) => k + 1)}><IconRefresh className="w-3.5 h-3.5" /></button>
            <a className="btn-ghost inline-flex items-center gap-1 px-2.5 py-1 text-xs" href={previewUrl} target="_blank" rel="noreferrer">{t('overview.open')} <IconExternalLink className="w-3 h-3" /></a>
          </div>
        </div>
        <div className="relative bg-white" style={{ height: 460 }}>
          {!isRunning ? (
            <div className="flex h-full items-center justify-center bg-ink-950 text-sm text-slate-500">
              {t('overview.noRunning')}
            </div>
          ) : reach === 'down' ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 bg-ink-950 px-6 text-center">
              <IconGlobe className="w-8 h-8 text-slate-500" />
              <div className="text-sm font-medium text-slate-300">{t('overview.unreachableTitle')}</div>
              <div className="max-w-md text-xs text-slate-500">
                <Trans i18nKey="overview.unreachableBody" values={{ url: previewUrl.replace('https://', '') }} components={[<code className="text-brand-300" />, <span className="text-slate-300" />]} />
              </div>
              <a className="btn-ghost inline-flex items-center gap-1 text-xs" href={previewUrl} target="_blank" rel="noreferrer">{t('overview.openNewTab')} <IconExternalLink className="w-3 h-3" /></a>
            </div>
          ) : (
            <iframe key={reloadKey} src={previewUrl} title="preview" className="h-full w-full" sandbox="allow-scripts allow-same-origin allow-forms" />
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('overview.production')}</span>
            {deployment && <StatusBadge status={deployment.status} />}
          </div>
          <Row label={t('overview.url')} value={<a href={previewUrl} target="_blank" rel="noreferrer" className="text-brand-400 hover:text-brand-300">{previewUrl.replace('https://', '')}</a>} />
          <Row label={t('overview.branch')} value={<span className="inline-flex items-center gap-1"><IconBranch className="w-3.5 h-3.5" /> {project.branch}</span>} />
          <Row label={t('overview.framework')} value={project.framework} />
          {deployment?.commit_sha && <Row label={t('overview.commit')} value={<span className="font-mono">{deployment.commit_sha.slice(0, 7)}</span>} />}
          {deployment && <Row label={t('overview.deployed')} value={timeAgo(deployment.created_at)} />}
        </div>

        <div className="card p-4">
          <div className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">{t('overview.health')}</div>
          <Row label={t('overview.state')} value={summary?.last ? (summary.last.ok ? <span className="inline-flex items-center gap-1 text-emerald-400"><IconStatusOnline className="w-4 h-4" /> {t('overview.up')}</span> : <span className="inline-flex items-center gap-1 text-red-400"><IconStatusOffline className="w-4 h-4" /> {t('overview.down')}</span>) : '—'} />
          <Row label={t('overview.uptime')} value={summary?.uptime != null ? `${summary.uptime}%` : '—'} />
          <Row label={t('overview.latency')} value={summary?.avg_latency != null ? `${summary.avg_latency} ms` : '—'} />
        </div>

        {deployment?.commit_msg && (
          <div className="card p-4">
            <div className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">{t('overview.latestCommit')}</div>
            <p className="text-xs text-slate-400">{deployment.commit_msg}</p>
          </div>
        )}

        {quota && (
          <div className="card p-4">
            <div className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">{t('overview.usage')}</div>
            <MiniBar icon={<IconDeploy className="w-3.5 h-3.5" />} label={t('overview.deploys')} {...quota.usage.deployments_monthly} unit="/mo" />
            <MiniBar icon={<IconServer className="w-3.5 h-3.5" />} label={t('overview.containers')} {...quota.usage.running_containers} />
            <MiniBar icon={<IconTimer className="w-3.5 h-3.5" />} label={t('overview.buildMin')} {...quota.usage.build_minutes_monthly} unit="min" />
            <MiniBar icon={<IconStorage className="w-3.5 h-3.5" />} label={t('overview.storage')} {...quota.usage.storage_gb} unit="GB" />
            {!quota.allowed && (
              <div className="mt-2 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-[10px] font-medium text-red-400">
                {t('overview.upgrade')}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/5 py-1.5 text-sm last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className="truncate text-right font-medium text-slate-800 dark:text-slate-200">{value}</span>
    </div>
  );
}

function fmtNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function MiniBar({ icon, label, used, soft, limit, unit = '' }: { icon: React.ReactNode; label: string; used: number; soft: number; limit: number; unit?: string }) {
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const isHard = used >= limit && limit > 0;
  const isSoft = !isHard && used >= soft && limit > 0;
  const color = isHard ? 'bg-red-500' : isSoft ? 'bg-amber-500' : 'bg-brand-500';
  const textCls = isHard ? 'text-red-400' : isSoft ? 'text-amber-400' : 'text-slate-400';
  return (
    <div className="border-b border-white/5 py-2 last:border-0">
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-slate-500">{icon} {label}</span>
        <span className={textCls}>{fmtNum(used)} / {fmtNum(limit)}{unit && ` ${unit}`}</span>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-black/[0.08] dark:bg-white/10">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
