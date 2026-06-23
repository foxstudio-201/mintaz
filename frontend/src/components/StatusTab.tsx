import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api, type Deployment, type HealthCheck, type HealthSummary } from '../lib/api';
import { EmptyState, timeAgo } from './ui';

export function StatusTab({ deployment }: { deployment: Deployment | null }) {
  const { t } = useTranslation();
  const [summary, setSummary] = useState<HealthSummary | null>(null);
  const [checks, setChecks] = useState<HealthCheck[]>([]);

  useEffect(() => {
    if (!deployment) return;
    let alive = true;
    const load = () =>
      api
        .deploymentHealth(deployment.id)
        .then(({ summary, checks }) => {
          if (!alive) return;
          setSummary(summary);
          setChecks(checks);
        })
        .catch(() => {});
    load();
    const t = setInterval(load, 5000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [deployment?.id]);

  if (!deployment) return <EmptyState title={t('status.noDeployment')}>{t('status.noDeploymentBody')}</EmptyState>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label={t('status.statusLabel')} value={summary?.last ? (summary.last.ok ? t('status.up') : t('status.down')) : '—'} good={summary?.last?.ok === 1} bad={summary?.last?.ok === 0} />
        <Stat label={t('status.uptime')} value={summary?.uptime != null ? `${summary.uptime}%` : '—'} />
        <Stat label={t('status.avgLatency')} value={summary?.avg_latency != null ? `${summary.avg_latency} ms` : '—'} />
        <Stat label={t('status.checks')} value={summary?.total ?? 0} />
      </div>

      {/* Sparkline-ish bar of recent checks */}
      {checks.length > 0 && (
        <div className="card p-4">
          <div className="mb-2 text-xs uppercase tracking-wide text-slate-500">{t('status.recentPings')}</div>
          <div className="flex flex-wrap gap-1">
            {checks.slice(0, 60).map((c) => (
              <span
                key={c.id}
                title={`${c.ok ? 'up' : 'down'} · ${c.status_code ?? c.error ?? ''} · ${c.latency_ms ?? '—'}ms`}
                className={`h-6 w-2 rounded-sm ${c.ok ? 'bg-emerald-500/70' : 'bg-red-500/70'}`}
              />
            ))}
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="border-b border-white/5 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300">{t('status.pingLog')}</div>
        {checks.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">{t('status.noChecks')}</div>
        ) : (
          <div className="max-h-[420px] overflow-auto font-mono text-xs">
            {checks.map((c) => (
              <div key={c.id} className="flex items-center gap-3 border-b border-white/[0.03] px-4 py-1.5">
                <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${c.ok ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-red-500/15 text-red-700 dark:text-red-300'}`}>
                  {c.ok ? t('status.up_short') : t('status.down_short')}
                </span>
                <span className="w-16 shrink-0 text-slate-400">{c.status_code ?? '—'}</span>
                <span className="w-20 shrink-0 text-slate-400">{c.latency_ms != null ? `${c.latency_ms} ms` : '—'}</span>
                <span className="flex-1 truncate text-slate-500">{c.error || ''}</span>
                <span className="shrink-0 text-slate-600">{new Date(c.ts).toLocaleTimeString()}</span>
                <span className="w-16 shrink-0 text-right text-slate-600">{timeAgo(c.ts)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, good, bad }: { label: string; value: any; good?: boolean; bad?: boolean }) {
  return (
    <div className="card px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-0.5 text-lg font-semibold ${bad ? 'text-red-400' : good ? 'text-emerald-400' : 'text-slate-900 dark:text-slate-100'}`}>{value}</div>
    </div>
  );
}
