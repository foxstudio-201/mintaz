import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trans, useTranslation } from 'react-i18next';
import { api, type Project, type Deployment, type Preview, type EnvVar, type Framework, type QuotaStatusResponse } from '../lib/api';
import { toast } from '../store/toast';
import { LogViewer } from '../components/LogViewer';
import { StatusBadge, Spinner, timeAgo, EmptyState } from '../components/ui';
import {
  IconArrowLeft, IconExternalLink, IconBranch, IconDeploy, IconX, IconPlus,
  IconMonitor, IconClock, IconTerminal, IconActivity, IconFileBlank, IconKey, IconGlobe, IconGear,
} from '../components/icons';
import { FrameworkIcon } from '../components/icons/FrameworkIcons';
import { Select } from '../components/Select';
import { OverviewTab } from '../components/OverviewTab';
import { StatusTab } from '../components/StatusTab';
import { FilesTab } from '../components/FilesTab';
import { DomainTab } from '../components/DomainTab';

const TABS = [
  { label: 'Overview', tKey: 'project.tabs.overview', icon: IconMonitor },
  { label: 'Deployments', tKey: 'project.tabs.deployments', icon: IconClock },
  { label: 'Logs', tKey: 'project.tabs.logs', icon: IconTerminal },
  { label: 'Status', tKey: 'project.tabs.status', icon: IconActivity },
  { label: 'Files', tKey: 'project.tabs.files', icon: IconFileBlank },
  { label: 'Environment', tKey: 'project.tabs.environment', icon: IconKey },
  { label: 'Domain', tKey: 'project.tabs.domain', icon: IconGlobe },
  { label: 'Settings', tKey: 'project.tabs.settings', icon: IconGear },
] as const;
type Tab = (typeof TABS)[number]['label'];

export function ProjectDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [previews, setPreviews] = useState<Preview[]>([]);
  const [tab, setTab] = useState<Tab>('Overview');
  const [activeDeployment, setActiveDeployment] = useState<string | null>(null);
  const [deploying, setDeploying] = useState(false);
  const [quota, setQuota] = useState<QuotaStatusResponse | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [{ project }, { deployments }, { previews }] = await Promise.all([
        api.getProject(id),
        api.listDeployments(id),
        api.listPreviews(id),
      ]);
      setProject(project);
      setDeployments(deployments);
      setPreviews(previews);
      setActiveDeployment((cur) => cur || deployments[0]?.id || null);
    } catch (e: any) {
      toast.error(e.message);
    }
  }, [id]);

  useEffect(() => {
    load();
    api.quotasStatus().then(setQuota).catch(() => {});
    const t = setInterval(() => {
      load();
      api.quotasStatus().then(setQuota).catch(() => {});
    }, 4000);
    return () => clearInterval(t);
  }, [load]);

  const prodDeployment =
    deployments.find((d) => d.type === 'production' && d.status === 'running') ||
    deployments.find((d) => d.type === 'production') ||
    deployments[0] ||
    null;

  const deploy = async () => {
    if (!project) return;
    setDeploying(true);
    try {
      const { deployment } = await api.deploy(project.id);
      toast.success(t('project.deploymentQueued'));
      setActiveDeployment(deployment.id);
      setTab('Logs');
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDeploying(false);
    }
  };

  const remove = async () => {
    if (!project) return;
    setShowDeleteModal(true);
  };

  if (!project)
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-6 w-6" />
      </div>
    );

  return (
    <div>
      <Link to="/" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200">
        <IconArrowLeft className="w-4 h-4" /> {t('project.backToProjects')}
      </Link>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{project.name}</h1>
          <a href={project.production_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-brand-400 hover:text-brand-300">
            {project.production_url} <IconExternalLink className="w-3 h-3" />
          </a>
          <div className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500">
            {project.repo_url.replace('https://github.com/', '')} · <IconBranch className="w-3.5 h-3.5" /> {project.branch}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            className="btn-primary inline-flex items-center gap-2"
            onClick={deploy}
            disabled={deploying || (quota ? !quota.allowed : false)}
            title={quota && !quota.allowed ? quota.reason || undefined : undefined}
          >
            {deploying ? <Spinner /> : <><IconDeploy className="w-4 h-4" /> {t('project.deploy')}</>}
          </button>
          <button className="btn-danger" onClick={remove}>
            {t('common.delete')}
          </button>
        </div>
      </header>

      <div className="mb-5 flex gap-1 overflow-x-auto border-b border-black/[0.06] dark:border-white/[0.06]">
        {TABS.map((tabItem) => {
          const Icon = tabItem.icon;
          return (
            <button
              key={tabItem.label}
              onClick={() => setTab(tabItem.label)}
              className={`relative flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition whitespace-nowrap ${tab === tabItem.label ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{t(tabItem.tKey)}</span>
              {tab === tabItem.label && <motion.span layoutId="tab-underline" className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-500" />}
            </button>
          );
        })}
      </div>

      <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
        {tab === 'Overview' && <OverviewTab project={project} deployment={prodDeployment} />}

        {tab === 'Deployments' && (
          <DeploymentsTab
            deployments={deployments}
            previews={previews}
            onSelect={(d) => {
              setActiveDeployment(d);
              setTab('Logs');
            }}
            onStop={async (d) => {
              await api.stopDeployment(d);
              toast.info(t('project.deploymentStopped'));
              load();
            }}
            onDestroyPreview={async (pv) => {
              await api.destroyPreview(pv);
              toast.info(t('project.previewDestroyed'));
              load();
            }}
          />
        )}

        {tab === 'Logs' &&
          (activeDeployment ? (
            <div className="space-y-3">
              <DeploymentPicker deployments={deployments} value={activeDeployment} onChange={setActiveDeployment} />
              <LogViewer deploymentId={activeDeployment} initialStatus={deployments.find((d) => d.id === activeDeployment)?.status} />
            </div>
          ) : (
            <EmptyState title={t('project.logs.noDeployments')}>{t('project.logs.noDeploymentsBody')}</EmptyState>
          ))}

        {tab === 'Status' && <StatusTab deployment={prodDeployment} />}
        {tab === 'Files' && <FilesTab deployment={prodDeployment} />}
        {tab === 'Environment' && <EnvTab projectId={project.id} />}
        {tab === 'Domain' && <DomainTab project={project} onChange={load} />}
        {tab === 'Settings' && <SettingsTab project={project} onSaved={load} />}
      </motion.div>

      {showDeleteModal && project && (
        <DeleteProjectModal
          projectName={project.name}
          projectId={project.id}
          onClose={() => setShowDeleteModal(false)}
          onDeleted={() => {
            setShowDeleteModal(false);
            toast.success(t('project.projectDeleted'));
            navigate('/');
          }}
        />
      )}
    </div>
  );
}

function DeploymentPicker({ deployments, value, onChange }: { deployments: Deployment[]; value: string; onChange: (v: string) => void }) {
  return (
    <select className="input max-w-md" value={value} onChange={(e) => onChange(e.target.value)}>
      {deployments.map((d) => (
        <option key={d.id} value={d.id}>
          {d.type} · {d.branch} · {d.status} · {new Date(d.created_at).toLocaleString()}
        </option>
      ))}
    </select>
  );
}

function DeploymentsTab({
  deployments,
  previews,
  onSelect,
  onStop,
  onDestroyPreview,
}: {
  deployments: Deployment[];
  previews: Preview[];
  onSelect: (id: string) => void;
  onStop: (id: string) => void;
  onDestroyPreview: (id: string) => void;
}) {
  const { t } = useTranslation();
  const activePreviews = previews.filter((p) => p.status === 'active');
  return (
    <div className="space-y-6">
      {activePreviews.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">{t('project.deployments.previewEnvironments')}</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {activePreviews.map((pv) => (
              <div key={pv.id} className="card flex items-center justify-between p-3.5">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                    {pv.kind === 'pr' ? `PR #${pv.pr_number}` : <span className="inline-flex items-center gap-1"><IconBranch className="w-3.5 h-3.5" /> {pv.branch}</span>}
                  </div>
                  <a href={`https://${pv.subdomain}.${location.hostname.split('.').slice(1).join('.') || 'your-domain.com'}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 truncate text-xs text-brand-400 hover:text-brand-300">
                    {pv.subdomain} <IconExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={pv.status} />
                  <button className="btn-ghost px-2.5 py-1 text-xs" onClick={() => onDestroyPreview(pv.id)}>
                    {t('common.destroy')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">{t('project.deployments.history')}</h3>
        {deployments.length === 0 ? (
          <EmptyState title={t('project.deployments.noDeployments')}>{t('project.deployments.noDeploymentsBody')}</EmptyState>
        ) : (
          <div className="space-y-2">
            {deployments.map((d, i) => (
              <motion.div
                key={d.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.02 }}
                className="card flex items-center justify-between gap-3 p-3.5"
              >
                <button className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => onSelect(d.id)}>
                  <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase ${d.type === 'production' ? 'bg-brand-500/15 text-brand-600 dark:text-brand-300' : 'bg-purple-500/15 text-purple-700 dark:text-purple-300'}`}>
                    {d.type === 'production' ? t('project.deployments.prod') : t('project.deployments.preview')}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-sm text-slate-800 dark:text-slate-200">
                      {d.commit_msg || d.subdomain || d.branch}
                      {d.pr_number ? ` · PR #${d.pr_number}` : ''}
                    </div>
                    <div className="truncate text-xs text-slate-500">
                      {d.commit_sha ? d.commit_sha.slice(0, 7) + ' · ' : ''}<IconBranch className="inline w-3 h-3" /> {d.branch} · {d.trigger} · {timeAgo(d.created_at)}
                    </div>
                  </div>
                </button>
                <StatusBadge status={d.status} />
                {d.status === 'running' && (
                  <button className="btn-ghost px-2.5 py-1 text-xs" onClick={() => onStop(d.id)}>
                    {t('common.stop')}
                  </button>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function EnvTab({ projectId }: { projectId: string }) {
  const { t } = useTranslation();
  const [env, setEnv] = useState<EnvVar[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getEnv(projectId).then(({ env }) => {
      setEnv(env);
      setLoading(false);
    });
  }, [projectId]);

  const save = async () => {
    setSaving(true);
    try {
      const { env: saved } = await api.putEnv(projectId, env.filter((e) => e.key));
      setEnv(saved);
      toast.success(t('project.env.saved'));
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="card h-40 animate-pulse" />;

  return (
    <div className="card space-y-3 p-5">
      <div className="overflow-x-auto">
      <div className="min-w-[520px] space-y-3">
      <div className="grid grid-cols-[1fr_1.4fr_auto_auto] gap-2 text-xs uppercase text-slate-500">
        <span>{t('project.env.key')}</span>
        <span>{t('project.env.value')}</span>
        <span>{t('project.env.scope')}</span>
        <span />
      </div>
      {env.map((row, i) => (
        <div key={i} className="grid grid-cols-[1fr_1.4fr_auto_auto] gap-2">
          <input className="input font-mono" placeholder="KEY" value={row.key} onChange={(e) => setEnv(env.map((r, j) => (j === i ? { ...r, key: e.target.value } : r)))} />
          <input className="input font-mono" placeholder="value" value={row.value} onChange={(e) => setEnv(env.map((r, j) => (j === i ? { ...r, value: e.target.value } : r)))} />
          <select className="input" value={row.scope} onChange={(e) => setEnv(env.map((r, j) => (j === i ? { ...r, scope: e.target.value as EnvVar['scope'] } : r)))}>
            <option value="all">{t('project.env.scopeAll')}</option>
            <option value="production">{t('project.env.scopeProduction')}</option>
            <option value="preview">{t('project.env.scopePreview')}</option>
          </select>
          <button className="btn-ghost px-3" onClick={() => setEnv(env.filter((_, j) => j !== i))}>
            <IconX className="w-4 h-4" />
          </button>
        </div>
      ))}
      </div>
      </div>
      <div className="flex justify-between pt-2">
        <button className="btn-ghost inline-flex items-center gap-1 text-sm" onClick={() => setEnv([...env, { scope: 'all', key: '', value: '' }])}>
          <IconPlus className="w-3.5 h-3.5" /> {t('project.env.add')}
        </button>
        <button className="btn-primary" onClick={save} disabled={saving}>
          {saving ? <Spinner /> : t('project.env.save')}
        </button>
      </div>
    </div>
  );
}

function SettingsTab({ project, onSaved }: { project: Project; onSaved: () => void }) {
  const { t } = useTranslation();
  const [frameworks, setFrameworks] = useState<Framework[]>([]);
  const [form, setForm] = useState({
    name: project.name,
    repo_url: project.repo_url,
    git_token: '',
    branch: project.branch,
    build_method: project.build_method,
    framework: project.framework || 'auto',
    output_dir: project.output_dir || '',
    dockerfile_path: project.dockerfile_path,
    internal_port: project.internal_port,
    install_command: project.install_command || '',
    build_command: project.build_command || '',
    start_command: project.start_command || '',
    restart_policy: project.restart_policy,
    preview_enabled: project.preview_enabled,
    auto_destroy_pr: project.auto_destroy_pr,
  });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    api.frameworks().then(({ frameworks }) => setFrameworks(frameworks)).catch(() => {});
  }, []);

  const selected = frameworks.find((f) => f.id === form.framework);

  const pickFramework = (id: string) => {
    const f = frameworks.find((x) => x.id === id);
    if (!f) return set('framework', id);
    setForm((prev) => ({
      ...prev,
      framework: f.id,
      build_method: f.id === 'dockerfile' ? 'dockerfile' : f.id === 'auto' ? 'auto' : 'framework',
      install_command: f.install,
      build_command: f.build,
      start_command: f.start,
      output_dir: f.output,
      internal_port: f.port,
    }));
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.updateProject(project.id, { ...form, internal_port: Number(form.internal_port) });
      toast.success(t('project.settings.saved'));
      onSaved();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card space-y-4 p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Labeled label={t('project.settings.name')}><input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} /></Labeled>
        <Labeled label={t('project.settings.productionBranch')}><input className="input" value={form.branch} onChange={(e) => set('branch', e.target.value)} /></Labeled>
        <Labeled label={t('project.settings.repoUrl')}><input className="input" value={form.repo_url} onChange={(e) => set('repo_url', e.target.value)} /></Labeled>
        <Labeled label={`${t('project.settings.accessToken')}${project.has_git_token ? t('project.settings.tokenSet') : ''}`}>
          <input className="input font-mono text-xs" type="password" autoComplete="off" value={form.git_token} onChange={(e) => set('git_token', e.target.value)} placeholder={project.has_git_token ? t('project.settings.tokenKeepPlaceholder') : t('project.settings.tokenOptionalPlaceholder')} />
        </Labeled>
        <Labeled label={t('project.settings.internalPort')}><input className="input" type="number" value={form.internal_port} onChange={(e) => set('internal_port', e.target.value)} /></Labeled>
        <Labeled label={t('project.settings.framework')}>
          <Select
            value={form.framework}
            onChange={(v) => pickFramework(v)}
            options={frameworks.map((f) => ({
              value: f.id,
              label: f.label,
              icon: <FrameworkIcon id={f.id} className="h-5 w-5" />,
              description: f.type === 'node' ? t('project.settings.nodeServer', { port: f.port }) : f.type === 'static' ? t('project.settings.staticSite') : t('project.settings.customDockerfile'),
            }))}
          />
        </Labeled>
        {(form.framework === 'auto' || form.framework === 'dockerfile') && (
          <Labeled label={t('project.settings.dockerfilePath')}><input className="input" value={form.dockerfile_path} onChange={(e) => set('dockerfile_path', e.target.value)} /></Labeled>
        )}
        {selected?.type === 'static' && (
          <Labeled label={t('project.settings.outputDir')}><input className="input font-mono" value={form.output_dir} onChange={(e) => set('output_dir', e.target.value)} placeholder="dist" /></Labeled>
        )}
        <Labeled label={t('project.settings.restartPolicy')}>
          <select className="input" value={form.restart_policy} onChange={(e) => set('restart_policy', e.target.value)}>
            <option value="no">no</option>
            <option value="on-failure">on-failure</option>
            <option value="always">always</option>
            <option value="unless-stopped">unless-stopped</option>
          </select>
        </Labeled>
      </div>
      {selected?.type !== 'dockerfile' && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Labeled label={t('project.settings.installCmd')}><input className="input font-mono text-xs" value={form.install_command} onChange={(e) => set('install_command', e.target.value)} /></Labeled>
          <Labeled label={t('project.settings.buildCmd')}><input className="input font-mono text-xs" value={form.build_command} onChange={(e) => set('build_command', e.target.value)} /></Labeled>
          {selected?.type !== 'static' && (
            <Labeled label={t('project.settings.startCmd')}><input className="input font-mono text-xs" value={form.start_command} onChange={(e) => set('start_command', e.target.value)} /></Labeled>
          )}
        </div>
      )}
      <div className="flex gap-6">
        <Check label={t('project.settings.previewDeployments')} checked={form.preview_enabled} onChange={(v) => set('preview_enabled', v)} />
        <Check label={t('project.settings.autoDestroy')} checked={form.auto_destroy_pr} onChange={(v) => set('auto_destroy_pr', v)} />
      </div>
      <div className="flex justify-end">
        <button className="btn-primary" onClick={save} disabled={saving}>
          {saving ? <Spinner /> : t('project.settings.saveSettings')}
        </button>
      </div>
    </div>
  );
}


function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

function DeleteProjectModal({
  projectName,
  projectId,
  onClose,
  onDeleted,
}: {
  projectName: string;
  projectId: string;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const { t } = useTranslation();
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const submit = async () => {
    if (confirmText !== 'DELETE') return toast.error(t('project.delete.typeToConfirm'));
    setDeleting(true);
    try {
      await api.deleteProject(projectId);
      onDeleted();
    } catch (e: any) {
      toast.error(e.message);
      setDeleting(false);
    }
  };

  const canDelete = confirmText === 'DELETE' && !deleting;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="card w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">{t('project.delete.title')}</h3>
        <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
          <Trans i18nKey="project.delete.body" values={{ name: projectName }} components={[<strong className="text-slate-900 dark:text-white" />]} />
        </p>
        <p className="mb-2 text-xs text-slate-500 dark:text-slate-500">
          <Trans i18nKey="project.delete.confirmPrompt" components={[<strong className="font-mono text-red-500" />]} />
        </p>
        <input
          className="input mb-4 font-mono"
          type="text"
          placeholder="DELETE"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && canDelete && submit()}
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <button className="btn-ghost" onClick={onClose} disabled={deleting}>
            {t('common.cancel')}
          </button>
          <button className="btn-danger" onClick={submit} disabled={!canDelete}>
            {deleting ? <Spinner /> : t('common.delete')}
          </button>
        </div>
      </div>
    </div>
  );
}

