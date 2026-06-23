import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { api, type Project, type QuotaStatusResponse } from '../lib/api';
import { toast } from '../store/toast';
import { useAuth } from '../store/auth';
import { CardSkeleton, EmptyState, StatusBadge, timeAgo } from '../components/ui';
import { IconPlus, IconRocket, IconBranch, IconProjects, IconDeploy, IconServer, IconTimer, IconStorage, IconBandwidth, IconCpu, IconMemory, IconGlobe, IconRefresh } from '../components/icons';
import { QuotaBanner } from '../components/QuotaBanner';
import { QuotaCard } from '../components/QuotaCard';

export function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [status, setStatus] = useState<any>(null);
  const [quota, setQuota] = useState<QuotaStatusResponse | null>(null);

  const load = async () => {
    try {
      const { projects } = await api.listProjects();
      setProjects(projects);
    } catch (e: any) {
      toast.error(e.message);
      setProjects([]);
    }
  };

  useEffect(() => {
    load();
    api.status().then(setStatus).catch(() => {});
    api.quotasStatus().then(setQuota).catch(() => {});
    const t = setInterval(() => {
      load();
      api.quotasStatus().then(setQuota).catch(() => {});
    }, 10000);
    return () => clearInterval(t);
  }, []);

  return (
    <div>
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{t('dashboard.title')}</h1>
          <p className="text-sm text-slate-400">{t('dashboard.subtitle')}</p>
        </div>
        <Link to="/new" className="btn-primary inline-flex items-center gap-2">
          <IconPlus className="w-4 h-4" /> {t('dashboard.newProject')}
        </Link>
      </header>

      {quota && <QuotaBanner allowed={quota.allowed} warnings={quota.warnings} reason={quota.reason} />}

      {status && isAdmin && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label={t('dashboard.stat.docker')} value={status.docker ? t('dashboard.stat.online') : t('dashboard.stat.offline')} good={status.docker} />
          <Stat label={t('dashboard.stat.running')} value={status.counts.running} />
          <Stat label={t('dashboard.stat.previews')} value={status.counts.previews} />
          <Stat label={t('dashboard.stat.proxy')} value={status.proxy} />
        </div>
      )}

      {quota && (
        <div className="mb-6 grid gap-3 grid-cols-2 sm:grid-cols-4">
          <QuotaCard label={t('dashboard.quota.projects')} icon={<IconProjects className="w-4 h-4" />} {...quota.usage.projects} />
          <QuotaCard label={t('dashboard.quota.deployments')} icon={<IconDeploy className="w-4 h-4" />} {...quota.usage.deployments_monthly} unit="/mo" />
          <QuotaCard label={t('dashboard.quota.containers')} icon={<IconServer className="w-4 h-4" />} {...quota.usage.running_containers} />
          <QuotaCard label={t('dashboard.quota.buildMins')} icon={<IconTimer className="w-4 h-4" />} {...quota.usage.build_minutes_monthly} unit="min/mo" />
          <QuotaCard label={t('dashboard.quota.storage')} icon={<IconStorage className="w-4 h-4" />} {...quota.usage.storage_gb} unit="GB" />
          <QuotaCard label={t('dashboard.quota.bandwidth')} icon={<IconBandwidth className="w-4 h-4" />} {...quota.usage.bandwidth_gb_monthly} unit="GB/mo" />
          <QuotaCard label={t('dashboard.quota.cpu')} icon={<IconCpu className="w-4 h-4" />} {...quota.usage.cpu_hours_monthly} unit="hrs/mo" />
          <QuotaCard label={t('dashboard.quota.memory')} icon={<IconMemory className="w-4 h-4" />} {...quota.usage.memory_gb_hours_monthly} unit="GB-h/mo" />
        </div>
      )}

      {projects === null ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <EmptyState icon={<IconRocket className="w-8 h-8 text-brand-400" />} title={t('dashboard.empty.title')}>
          {t('dashboard.empty.body')}
          <div className="mt-4">
            <Link to="/new" className="btn-primary">
              {t('dashboard.empty.cta')}
            </Link>
          </div>
        </EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p, i) => (
            <ProjectCard key={p.id} project={p} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, good }: { label: string; value: any; good?: boolean }) {
  return (
    <div className="card px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-0.5 text-lg font-semibold ${good === false ? 'text-red-400' : good ? 'text-emerald-400' : 'text-slate-900 dark:text-slate-100'}`}>
        {value}
      </div>
    </div>
  );
}

function CardShot({ project }: { project: Project }) {
  const latest = project.latestDeployment;
  const [url, setUrl] = useState('');
  const [state, setState] = useState<'loading' | 'ready' | 'none'>('loading');

  useEffect(() => {
    if (!latest || latest.status !== 'running') { setState('none'); return; }
    let alive = true;
    let obj = '';
    setState('loading');
    api.deploymentScreenshot(latest.id)
      .then((u) => { if (alive) { obj = u; setUrl(u); setState('ready'); } })
      .catch(() => { if (alive) setState('none'); });
    return () => { alive = false; if (obj) URL.revokeObjectURL(obj); };
  }, [latest?.id, latest?.status]);

  return (
    <div className="relative aspect-[16/9] w-full overflow-hidden border-b border-white/5 bg-ink-950">
      {state === 'ready' ? (
        <img src={url} alt="" className="h-full w-full object-cover object-top transition duration-300 group-hover:scale-[1.02]" />
      ) : (
        <div className="flex h-full items-center justify-center">
          {state === 'loading'
            ? <IconRefresh className="w-5 h-5 animate-spin text-slate-600" />
            : <IconGlobe className="w-6 h-6 text-slate-700" />}
        </div>
      )}
    </div>
  );
}

function ProjectCard({ project, index }: { project: Project; index: number }) {
  const { t } = useTranslation();
  const latest = project.latestDeployment;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
    >
      <Link to={`/projects/${project.id}`} className="card group block overflow-hidden transition hover:border-brand-500/40 hover:shadow-glow">
        <CardShot project={project} />
        <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-ink-700 to-ink-800 text-sm font-semibold text-brand-300">
              {project.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="font-semibold text-slate-900 dark:text-white">{project.name}</div>
              <div className="text-xs text-slate-500">{project.slug}.{project.production_url.split('.').slice(1).join('.')}</div>
            </div>
          </div>
          {latest && <StatusBadge status={latest.status} />}
        </div>

        <div className="mt-4 truncate text-xs text-slate-400">
          <span className="text-slate-500">{t('dashboard.card.repo')}</span> {project.repo_url.replace('https://github.com/', '')}
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <span className="inline-flex items-center gap-1"><IconBranch className="w-3.5 h-3.5" /> {project.branch}</span>
          <span>{t('dashboard.card.preview', { count: project.activePreviews })}</span>
          <span>{latest ? timeAgo(latest.created_at) : t('dashboard.card.neverDeployed')}</span>
        </div>
        </div>
      </Link>
    </motion.div>
  );
}
