import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import { toast } from '../store/toast';
import { Spinner } from '../components/ui';
import { Select } from '../components/Select';
import { FrameworkIcon } from '../components/icons/FrameworkIcons';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

type Deployment = {
  id: string;
  project_name: string;
  type: string;
  branch: string;
  subdomain: string;
  status: string;
  created_at: number;
  page_views_count: number;
};

type Summary = {
  visitors: { value: number; change: number };
  page_views: { value: number; change: number };
  bounce_rate: { value: number; change: number };
  avg_duration: { value: number; change: number };
};

export function Analytics() {
  const { t } = useTranslation();
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [selectedDeploy, setSelectedDeploy] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState(7);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [timeseries, setTimeseries] = useState<any[]>([]);
  const [pages, setPages] = useState<any[]>([]);
  const [referrers, setReferrers] = useState<any[]>([]);
  const [countries, setCountries] = useState<any[]>([]);
  const [devices, setDevices] = useState<any>(null);
  const [visitors, setVisitors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.analyticsDeployments()
      .then(({ deployments }) => {
        setDeployments(deployments);
        if (deployments.length > 0) {
          setSelectedDeploy(deployments[0].id);
        }
        setLoading(false);
      })
      .catch((e) => {
        toast.error(e.message);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!selectedDeploy) return;

    Promise.all([
      api.analyticsSummary(selectedDeploy, timeRange),
      api.analyticsTimeseries(selectedDeploy, timeRange),
      api.analyticsPages(selectedDeploy, timeRange),
      api.analyticsReferrers(selectedDeploy, timeRange),
      api.analyticsCountries(selectedDeploy, timeRange),
      api.analyticsDevices(selectedDeploy, timeRange),
      api.analyticsVisitors(selectedDeploy, timeRange).catch(() => ({ visitors: [] })),
    ])
      .then(([summaryData, timeseriesData, pagesData, referrersData, countriesData, devicesData, visitorsData]) => {
        setSummary(summaryData);
        setTimeseries(timeseriesData.timeseries);
        setPages(pagesData.pages);
        setReferrers(referrersData.referrers);
        setCountries(countriesData.countries);
        setDevices(devicesData);
        setVisitors(visitorsData.visitors);
      })
      .catch((e) => toast.error(e.message));
  }, [selectedDeploy, timeRange]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (deployments.length === 0) {
    return (
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 text-2xl font-semibold text-slate-900 dark:text-white">{t('analytics.title')}</h1>
        <div className="card p-12 text-center">
          <p className="text-slate-500 dark:text-slate-400">
            {t('analytics.noData')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{t('analytics.title')}</h1>
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
          <Select
            value={selectedDeploy || ''}
            onChange={setSelectedDeploy}
            options={deployments.map((d) => ({
              value: d.id,
              label: `${d.project_name} (${d.subdomain})`,
              description: t('analytics.deploySelectorDesc', { type: d.type, count: d.page_views_count }),
            }))}
            className="w-full sm:w-64"
          />
          <Select
            value={String(timeRange)}
            onChange={(v) => setTimeRange(Number(v))}
            options={[
              { value: '1', label: t('analytics.range.24h') },
              { value: '7', label: t('analytics.range.7d') },
              { value: '30', label: t('analytics.range.30d') },
              { value: '90', label: t('analytics.range.90d') },
            ]}
            className="w-full sm:w-40"
          />
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <MetricCard label={t('analytics.metrics.visitors')} value={summary.visitors.value} change={summary.visitors.change} />
          <MetricCard label={t('analytics.metrics.pageViews')} value={summary.page_views.value} change={summary.page_views.change} />
          <MetricCard label={t('analytics.metrics.bounceRate')} value={`${summary.bounce_rate.value}%`} change={summary.bounce_rate.change} />
          <MetricCard label={t('analytics.metrics.avgDuration')} value={formatDuration(summary.avg_duration.value)} change={summary.avg_duration.change} />
        </div>
      )}

      {timeseries.length > 0 && (
        <div className="card p-6">
          <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">{t('analytics.visitorsOverTime')}</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timeseries}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
              <Line type="monotone" dataKey="visitors" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">{t('analytics.pages')}</h3>
          {pages.length > 0 ? (
            <div className="space-y-2">
              {pages.map((p, i) => (
                <div key={i} className="flex items-center justify-between border-b border-black/[0.06] pb-2 last:border-0 dark:border-white/[0.06]">
                  <span className="truncate text-sm text-slate-700 dark:text-slate-300">{p.path}</span>
                  <span className="ml-4 flex-shrink-0 text-sm font-medium text-slate-900 dark:text-white">{p.visitors}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('analytics.noData_short')}</p>
          )}
        </div>

        <div className="card p-6">
          <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">{t('analytics.referrers')}</h3>
          {referrers.length > 0 ? (
            <div className="space-y-2">
              {referrers.map((r, i) => (
                <div key={i} className="flex items-center justify-between border-b border-black/[0.06] pb-2 last:border-0 dark:border-white/[0.06]">
                  <span className="truncate text-sm text-slate-700 dark:text-slate-300">{r.source}</span>
                  <span className="ml-4 flex-shrink-0 text-sm font-medium text-slate-900 dark:text-white">{r.visitors}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('analytics.noData_short')}</p>
          )}
        </div>

        <div className="card p-6">
          <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">{t('analytics.countries')}</h3>
          {countries.length > 0 ? (
            <div className="space-y-2">
              {countries.map((c, i) => (
                <div key={i} className="flex items-center justify-between border-b border-black/[0.06] pb-2 last:border-0 dark:border-white/[0.06]">
                  <span className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                    <span className="text-base">{flagEmoji(c.country)}</span>
                    <span>{c.country || t('analytics.unknownCountry')}</span>
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">{c.visitors} {t('analytics.visitorsShort')}</span>
                    <span className="text-sm font-medium text-slate-900 dark:text-white">{c.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('analytics.noData_short')}</p>
          )}
        </div>

        <div className="card p-6">
          <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">{t('analytics.devices')}</h3>
          {devices?.devices?.length > 0 ? (
            <div className="space-y-2">
              {devices.devices.map((d: any, i: number) => (
                <div key={i} className="flex items-center justify-between border-b border-black/[0.06] pb-2 last:border-0 dark:border-white/[0.06]">
                  <span className="capitalize text-sm text-slate-700 dark:text-slate-300">{d.device_type}</span>
                  <span className="text-sm font-medium text-slate-900 dark:text-white">{d.percentage}%</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('analytics.noData_short')}</p>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-black/[0.06] px-6 py-4 text-lg font-semibold text-slate-900 dark:border-white/[0.06] dark:text-white">
          {t('analytics.visitorsByIp')}
        </div>
        {visitors.length > 0 ? (
          <div className="overflow-x-auto">
            <div className="min-w-[640px]">
              <div className="grid grid-cols-[1fr_1.4fr_1.2fr_auto_auto] gap-3 border-b border-black/[0.06] px-6 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:border-white/[0.06]">
                <span>{t('analytics.ipLabel')}</span>
                <span>{t('analytics.location')}</span>
                <span>{t('analytics.device')}</span>
                <span className="text-right">{t('analytics.views')}</span>
                <span className="text-right">{t('analytics.lastSeen')}</span>
              </div>
              {visitors.map((v, i) => (
                <div key={i} className="grid grid-cols-[1fr_1.4fr_1.2fr_auto_auto] items-center gap-3 border-b border-black/[0.04] px-6 py-2.5 text-sm last:border-0 dark:border-white/[0.03]">
                  <span className="font-mono text-xs text-slate-500">{v.ip_hash}</span>
                  <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                    <span>{flagEmoji(v.country)}</span>
                    <span className="truncate">{[v.city, v.country].filter(Boolean).join(', ') || t('analytics.unknownCountry')}</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-xs">
                    <span className="rounded-md bg-black/[0.05] px-1.5 py-0.5 capitalize text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">{v.device_type || '—'}</span>
                    <span className="truncate text-slate-500">{v.browser || ''}</span>
                  </span>
                  <span className="text-right font-semibold text-slate-800 dark:text-slate-100">{v.page_views}</span>
                  <span className="text-right text-xs text-slate-500">{new Date(v.last_seen).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="p-6 text-sm text-slate-500 dark:text-slate-400">{t('analytics.noData_short')}</p>
        )}
      </div>
    </div>
  );
}

function flagEmoji(code: string | null) {
  if (!code || code.length !== 2 || code === '??') return '🌐';
  const cc = code.toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return '🌐';
  return String.fromCodePoint(...[...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

function MetricCard({ label, value, change }: { label: string; value: number | string; change: number }) {
  const { t } = useTranslation();
  const isPositive = change > 0;
  const isNeutral = change === 0;

  return (
    <div className="card p-5">
      <div className="text-sm text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">{value}</div>
      {!isNeutral && (
        <div className={`mt-1 text-xs ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
          {isPositive ? '↑' : '↓'} {Math.abs(change)}% {t('analytics.metrics.vsPrevious')}
        </div>
      )}
    </div>
  );
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}
