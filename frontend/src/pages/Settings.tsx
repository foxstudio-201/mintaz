import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import { useAuth } from '../store/auth';
import { GithubConnect } from '../components/GithubConnect';
import { GithubOAuthSetup } from '../components/GithubOAuthSetup';
import { CloudflareConnect } from '../components/CloudflareConnect';
import { DefaultDomainSetup } from '../components/DefaultDomainSetup';
import { UpdatesCard } from '../components/UpdatesCard';
import { IconStatusOnline, IconStatusOffline, IconArrowRight } from '../components/icons';

export function Settings() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [status, setStatus] = useState<any>(null);
  const [ghKey, setGhKey] = useState(0);

  useEffect(() => {
    if (isAdmin) api.status().then(setStatus).catch(() => {});
  }, [isAdmin]);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-2xl font-semibold text-slate-900 dark:text-white">{t('settings.title')}</h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">{t('settings.subtitle')}</p>

      <Link
        to="/account"
        className="card mb-4 flex items-center justify-between p-5 transition hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
      >
        <div>
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('settings.accountCard')}</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
            {t('settings.accountCardHint')}
          </p>
        </div>
        <IconArrowRight className="w-5 h-5 text-slate-400" />
      </Link>

      <div className="card mb-4 space-y-4 p-5">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('settings.github')}</h2>
        <GithubConnect key={ghKey} />
        {isAdmin && <GithubOAuthSetup onSaved={() => setGhKey((k) => k + 1)} />}
      </div>

      {isAdmin && (
        <div className="card mb-4 space-y-4 p-5">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('settings.cloudflare')}</h2>
          <CloudflareConnect />
        </div>
      )}

      {isAdmin && (
        <div className="card mb-4 space-y-3 p-5">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('settings.defaultDomain')} <span className="text-xs font-normal text-slate-500">{t('settings.adminOnly')}</span></h2>
          <DefaultDomainSetup />
        </div>
      )}

      {isAdmin && (
        <div className="card mb-4 space-y-3 p-5">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('settings.updates.title')} <span className="text-xs font-normal text-slate-500">{t('settings.adminOnly')}</span></h2>
          <UpdatesCard />
        </div>
      )}

      {isAdmin && status && (
        <div className="card space-y-3 p-5">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('settings.system')}</h2>
          <Row label={t('settings.row.dockerEngine')} value={status.docker ? <span className="inline-flex items-center gap-1 text-emerald-400"><IconStatusOnline className="w-4 h-4" /> {t('settings.row.online')}</span> : <span className="inline-flex items-center gap-1 text-red-400"><IconStatusOffline className="w-4 h-4" /> {t('settings.row.offline')}</span>} />
          <Row label={t('settings.row.reverseProxy')} value={status.proxy} />
          <Row label={t('settings.row.baseDomain')} value={status.baseDomain} />
          <Row label={t('settings.row.cloudflareTunnel')} value={status.tunnel} />
          <Row label={t('settings.row.projects')} value={status.counts.projects} />
          <Row label={t('settings.row.runningDeployments')} value={status.counts.running} />
          <Row label={t('settings.row.activePreviews')} value={status.counts.previews} />
          <Row label={t('settings.row.buildQueue')} value={t('settings.row.queueValue', { active: status.queue.active, pending: status.queue.pending })} />
        </div>
      )}

      {isAdmin && !status && (
        <div className="card p-5">
          <div className="h-24 animate-pulse rounded-lg bg-black/[0.04] dark:bg-white/5" />
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex justify-between border-b border-black/[0.05] dark:border-white/5 pb-2 text-sm last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-700 dark:text-slate-200">{value ?? '—'}</span>
    </div>
  );
}
