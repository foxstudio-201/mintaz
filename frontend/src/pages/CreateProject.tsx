import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trans, useTranslation } from 'react-i18next';
import { api, type Framework, type GithubRepo, type GithubStatus } from '../lib/api';
import { toast } from '../store/toast';
import { Spinner } from '../components/ui';
import { IconStar, IconBranch, IconRefresh, IconX, IconPlus } from '../components/icons';
import { FrameworkIcon } from '../components/icons/FrameworkIcons';

type Form = {
  name: string;
  repo_url: string;
  git_token: string;
  branch: string;
  build_method: 'auto' | 'dockerfile' | 'framework';
  framework: string;
  output_dir: string;
  dockerfile_path: string;
  internal_port: number;
  install_command: string;
  build_command: string;
  start_command: string;
  preview_enabled: boolean;
  auto_destroy_pr: boolean;
  deploy_now: boolean;
};

const STEP_KEYS = ['createProject.steps.repository', 'createProject.steps.build', 'createProject.steps.previews', 'createProject.steps.review'];

export function CreateProject() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [env, setEnv] = useState<{ key: string; value: string }[]>([]);
  const [frameworks, setFrameworks] = useState<Framework[]>([]);
  const [gh, setGh] = useState<GithubStatus | null>(null);
  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [repoQuery, setRepoQuery] = useState('');
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [branches, setBranches] = useState<string[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<GithubRepo | null>(null);
  const [manual, setManual] = useState(false);
  const [form, setForm] = useState<Form>({
    name: '',
    repo_url: '',
    git_token: '',
    branch: 'main',
    build_method: 'auto',
    framework: 'auto',
    output_dir: '',
    dockerfile_path: 'Dockerfile',
    internal_port: 3000,
    install_command: '',
    build_command: '',
    start_command: '',
    preview_enabled: true,
    auto_destroy_pr: true,
    deploy_now: true,
  });

  useEffect(() => {
    api.frameworks().then(({ frameworks }) => setFrameworks(frameworks)).catch(() => {});
    api
      .githubStatus()
      .then((s) => {
        setGh(s);
        if (s.connected) loadRepos();
      })
      .catch(() => {});
  }, []);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const loadRepos = async () => {
    setLoadingRepos(true);
    try {
      const { repos } = await api.githubRepos();
      setRepos(repos);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoadingRepos(false);
    }
  };

  const chooseRepo = async (r: GithubRepo) => {
    setSelectedRepo(r);
    setBranches([r.default_branch]);
    setForm((f) => ({ ...f, repo_url: r.clone_url, branch: r.default_branch, git_token: '', name: f.name || r.name }));
    try {
      const { branches } = await api.githubBranches(r.owner, r.name);
      setBranches(branches.length ? branches : [r.default_branch]);
    } catch {
    }
  };

  const useGithub = Boolean(gh?.connected && !manual);
  const filteredRepos = repos.filter((r) => r.full_name.toLowerCase().includes(repoQuery.toLowerCase()));

  const pickFramework = (f: Framework) => {
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

  const selected = frameworks.find((f) => f.id === form.framework);

  const next = () => {
    if (step === 0 && (!form.name || !form.repo_url)) return toast.error(t('createProject.nameRequired'));
    setStep((s) => Math.min(s + 1, STEP_KEYS.length - 1));
  };
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const submit = async () => {
    setSaving(true);
    try {
      const { project, deployment } = await api.createProject({
        ...form,
        internal_port: Number(form.internal_port),
        git_token: form.git_token || undefined,
        output_dir: form.output_dir || null,
        install_command: form.install_command || null,
        build_command: form.build_command || null,
        start_command: form.start_command || null,
        env: env.filter((e) => e.key),
      });
      toast.success(deployment ? t('createProject.createdDeploying') : t('createProject.created'));
      navigate(`/projects/${project.id}`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-2xl font-semibold text-slate-900 dark:text-white">{t('createProject.title')}</h1>
      <p className="mb-6 text-sm text-slate-400">{t('createProject.subtitle')}</p>

      <div className="mb-6 flex items-center gap-2">
        {STEP_KEYS.map((labelKey, i) => (
          <div key={labelKey} className="flex flex-1 items-center gap-2">
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition ${
                i <= step ? 'bg-brand-500 text-white' : 'bg-black/[0.06] text-slate-500 dark:bg-white/5'
              }`}
            >
              {i + 1}
            </div>
            <span className={`hidden text-xs sm:block ${i <= step ? 'text-slate-800 dark:text-slate-200' : 'text-slate-500'}`}>{t(labelKey)}</span>
            {i < STEP_KEYS.length - 1 && <div className={`h-px flex-1 ${i < step ? 'bg-brand-500/60' : 'bg-black/[0.08] dark:bg-white/10'}`} />}
          </div>
        ))}
      </div>

      <motion.div key={step} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="card space-y-4 p-6">
        {step === 0 && (
          <>
            <Field label={t('createProject.projectName')}>
              <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="my-app" />
            </Field>

            {useGithub ? (
              selectedRepo ? (
                <>
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-brand-500/40 bg-brand-500/5 p-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm font-medium text-white">
                        <span className="truncate">{selectedRepo.full_name}</span>
                        {selectedRepo.private && <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-700 dark:text-amber-300">{t('createProject.private')}</span>}
                      </div>
                      <div className="truncate text-xs text-slate-500">{selectedRepo.description || t('createProject.noDescription')}</div>
                    </div>
                    <button type="button" className="btn-ghost px-3 py-1 text-xs" onClick={() => setSelectedRepo(null)}>
                      {t('common.change')}
                    </button>
                  </div>
                  <Field label={t('createProject.productionBranch')}>
                    <select className="input" value={form.branch} onChange={(e) => set('branch', e.target.value)}>
                      {branches.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </Field>
                </>
              ) : (
                <Field label={t('createProject.importGithub')}>
                  <input className="input mb-2" placeholder={t('createProject.searchRepos')} value={repoQuery} onChange={(e) => setRepoQuery(e.target.value)} />
                  <div className="max-h-72 divide-y divide-white/5 overflow-auto rounded-xl border border-white/10">
                    {loadingRepos ? (
                      <div className="flex justify-center p-6"><Spinner /></div>
                    ) : filteredRepos.length === 0 ? (
                      <div className="p-4 text-sm text-slate-500">{t('createProject.noRepos')}</div>
                    ) : (
                      filteredRepos.map((r) => (
                        <button key={r.id} type="button" onClick={() => chooseRepo(r)} className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition hover:bg-white/[0.04]">
                          <div className="min-w-0">
                            <div className="truncate text-sm text-slate-800 dark:text-slate-200">{r.full_name}</div>
                            <div className="truncate text-xs text-slate-500">{r.language || '—'} · <IconStar className="inline w-3 h-3 text-amber-400" /> {r.stars} · <IconBranch className="inline w-3 h-3" /> {r.default_branch}</div>
                          </div>
                          {r.private && <span className="shrink-0 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-700 dark:text-amber-300">{t('createProject.private')}</span>}
                        </button>
                      ))
                    )}
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <button type="button" className="btn-ghost inline-flex items-center gap-1 text-xs" onClick={loadRepos}><IconRefresh className="w-3.5 h-3.5" /> {t('common.refresh')}</button>
                    <button type="button" className="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200" onClick={() => setManual(true)}>{t('createProject.enterUrlManually')}</button>
                  </div>
                </Field>
              )
            ) : (
              <>
                <Field label={t('createProject.repoUrl')}>
                  <input className="input" value={form.repo_url} onChange={(e) => set('repo_url', e.target.value)} placeholder="https://github.com/user/repo" />
                </Field>
                <Field label={t('createProject.productionBranch')}>
                  <input className="input" value={form.branch} onChange={(e) => set('branch', e.target.value)} placeholder="main" />
                </Field>
                <Field label={t('createProject.accessToken')}>
                  <input className="input font-mono text-xs" type="password" autoComplete="off" value={form.git_token} onChange={(e) => set('git_token', e.target.value)} placeholder={t('createProject.accessTokenPlaceholder')} />
                  <p className="mt-1.5 text-xs text-slate-500">
                    <Trans i18nKey="createProject.accessTokenHint" components={[<code className="text-brand-300" />]} />
                  </p>
                </Field>
                {gh?.connected && (
                  <button type="button" className="inline-flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300" onClick={() => setManual(false)}>
                    <IconBranch className="w-3.5 h-3.5" /> {t('createProject.pickFromGithub')}
                  </button>
                )}
                {!gh?.connected && gh?.configured && (
                  <p className="text-xs text-slate-500">
                    <Trans i18nKey="createProject.connectTip" components={[<span className="text-slate-700 dark:text-slate-300" />]} />
                  </p>
                )}
              </>
            )}
          </>
        )}

        {step === 1 && (
          <>
            <Field label={t('createProject.frameworkPreset')}>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {frameworks.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => pickFramework(f)}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-medium transition ${
                      form.framework === f.id
                        ? 'border-brand-500 bg-brand-500/10 text-brand-700 shadow-glow dark:text-white'
                        : 'border-black/[0.08] text-slate-500 hover:border-black/20 hover:text-slate-800 dark:border-white/10 dark:text-slate-400 dark:hover:border-white/25 dark:hover:text-slate-200'
                    }`}
                  >
                    <FrameworkIcon id={f.id} className="h-6 w-6" />
                    <span className="text-center leading-tight">{f.label}</span>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {selected?.detect && t('createProject.hint.detect')}
                {selected?.type === 'node' && !selected?.detect && t('createProject.hint.node', { port: selected?.port })}
                {selected?.type === 'static' && t('createProject.hint.static')}
                {selected?.type === 'dockerfile' && t('createProject.hint.dockerfile')}
              </p>
            </Field>

            {(form.framework === 'dockerfile' || form.framework === 'auto') && (
              <Field label={t('createProject.dockerfilePath')}>
                <input className="input" value={form.dockerfile_path} onChange={(e) => set('dockerfile_path', e.target.value)} placeholder="Dockerfile" />
              </Field>
            )}

            {selected && selected.type !== 'dockerfile' && (
              <>
                {selected.type === 'node' && (
                  <Field label={t('createProject.internalPort')}>
                    <input className="input" type="number" value={form.internal_port} onChange={(e) => set('internal_port', Number(e.target.value))} />
                  </Field>
                )}
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label={t('createProject.installCommand')}>
                    <input className="input font-mono text-xs" value={form.install_command} onChange={(e) => set('install_command', e.target.value)} placeholder="npm ci" />
                  </Field>
                  <Field label={t('createProject.buildCommand')}>
                    <input className="input font-mono text-xs" value={form.build_command} onChange={(e) => set('build_command', e.target.value)} placeholder="npm run build" />
                  </Field>
                  {selected.type === 'node' ? (
                    <Field label={t('createProject.startCommand')}>
                      <input className="input font-mono text-xs" value={form.start_command} onChange={(e) => set('start_command', e.target.value)} placeholder="npm start" />
                    </Field>
                  ) : (
                    <Field label={t('createProject.outputDir')}>
                      <input className="input font-mono text-xs" value={form.output_dir} onChange={(e) => set('output_dir', e.target.value)} placeholder="dist" />
                    </Field>
                  )}
                </div>
              </>
            )}

            <EnvEditor env={env} setEnv={setEnv} />
          </>
        )}

        {step === 2 && (
          <>
            <Toggle
              label={t('createProject.enablePreviews')}
              hint={t('createProject.enablePreviewsHint')}
              checked={form.preview_enabled}
              onChange={(v) => set('preview_enabled', v)}
            />
            <Toggle
              label={t('createProject.autoDestroy')}
              hint={t('createProject.autoDestroyHint')}
              checked={form.auto_destroy_pr}
              onChange={(v) => set('auto_destroy_pr', v)}
            />
          </>
        )}

        {step === 3 && (
          <div className="space-y-3 text-sm">
            <Review label={t('createProject.review.name')} value={form.name} />
            <Review label={t('createProject.review.repository')} value={form.repo_url} />
            <Review label={t('createProject.review.branch')} value={form.branch} />
            <Review label={t('createProject.review.framework')} value={selected ? selected.label : form.framework} icon={selected ? <FrameworkIcon id={selected.id} className="h-4 w-4" /> : undefined} />
            <Review label={t('createProject.review.port')} value={selected?.type === 'static' ? '80 (nginx)' : String(form.internal_port)} />
            <Review label={t('createProject.review.previews')} value={form.preview_enabled ? t('createProject.review.enabled') : t('createProject.review.disabled')} />
            <Review label={t('createProject.review.envVars')} value={t('createProject.review.varsSet', { count: env.filter((e) => e.key).length })} />
            <Toggle label={t('createProject.review.deployNow')} hint="" checked={form.deploy_now} onChange={(v) => set('deploy_now', v)} />
          </div>
        )}

        <div className="flex justify-between pt-2">
          <button className="btn-ghost" onClick={back} disabled={step === 0}>
            {t('common.back')}
          </button>
          {step < STEP_KEYS.length - 1 ? (
            <button className="btn-primary" onClick={next}>
              {t('common.continue')}
            </button>
          ) : (
            <button className="btn-primary" onClick={submit} disabled={saving}>
              {saving ? <Spinner /> : t('createProject.createProject')}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

function Review({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex justify-between border-b border-white/5 pb-2">
      <span className="text-slate-500">{label}</span>
      <span className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-200">
        {icon}
        {value || '—'}
      </span>
    </div>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{label}</div>
        {hint && <div className="text-xs text-slate-500">{hint}</div>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? 'bg-brand-500' : 'bg-black/[0.12] dark:bg-white/10'}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
    </div>
  );
}

export function EnvEditor({ env, setEnv }: { env: { key: string; value: string }[]; setEnv: (e: { key: string; value: string }[]) => void }) {
  const { t } = useTranslation();
  return (
    <div>
      <label className="label">{t('createProject.env.title')}</label>
      <div className="space-y-2">
        {env.map((row, i) => (
          <div key={i} className="flex gap-2">
            <input className="input font-mono" placeholder={t('createProject.env.key')} value={row.key} onChange={(e) => setEnv(env.map((r, j) => (j === i ? { ...r, key: e.target.value } : r)))} />
            <input className="input font-mono" placeholder={t('createProject.env.value')} value={row.value} onChange={(e) => setEnv(env.map((r, j) => (j === i ? { ...r, value: e.target.value } : r)))} />
            <button type="button" className="btn-ghost px-3" onClick={() => setEnv(env.filter((_, j) => j !== i))}>
              <IconX className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
      <button type="button" className="btn-ghost inline-flex items-center gap-1 mt-2 text-xs" onClick={() => setEnv([...env, { key: '', value: '' }])}>
        <IconPlus className="w-3.5 h-3.5" /> {t('createProject.env.add')}
      </button>
    </div>
  );
}
