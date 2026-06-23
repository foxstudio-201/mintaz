import { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { api, type GithubOAuthConfig } from '../lib/api';
import { toast } from '../store/toast';
import { Spinner } from './ui';
import { IconCheckCircle, IconChevronDown, IconChevronRight } from './icons';

// Admin form: configure the GitHub OAuth App so the "Connect GitHub" button works.
export function GithubOAuthSetup({ onSaved }: { onSaved?: () => void }) {
  const { t } = useTranslation();
  const [cfg, setCfg] = useState<GithubOAuthConfig | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [publicUrl, setPublicUrl] = useState('');

  const load = () =>
    api.githubGetConfig().then((c) => {
      setCfg(c);
      setClientId(c.client_id || '');
      setPublicUrl(c.public_url || window.location.origin);
      setOpen(!c.configured); // expand automatically when not yet set up
    });
  useEffect(() => {
    load().catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const c = await api.githubSaveConfig({ client_id: clientId, client_secret: clientSecret, public_url: publicUrl });
      setCfg(c);
      setClientSecret('');
      toast.success(c.configured ? t('github.oauth.configuredToast') : t('github.oauth.savedToast'));
      onSaved?.();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!cfg) return null;

  const callback = `${(publicUrl || window.location.origin).replace(/\/+$/, '')}/api/github/callback`;

  return (
    <div className="rounded-xl border border-white/5 bg-ink-950/40 p-4 text-sm">
      <button className="flex w-full items-center justify-between text-left" onClick={() => setOpen((o) => !o)}>
        <span className="font-medium text-slate-700 dark:text-slate-300">
          {t('github.oauth.setupTitle')} {cfg.configured ? <span className="inline-flex items-center gap-1 text-emerald-400">· {t('github.oauth.configured')} <IconCheckCircle className="w-3.5 h-3.5" /></span> : <span className="text-amber-400">· {t('github.oauth.notSetUp')}</span>}
        </span>
        <span className="text-slate-500">{open ? <IconChevronDown className="w-4 h-4" /> : <IconChevronRight className="w-4 h-4" />}</span>
      </button>

      {open && (
        <div className="mt-4 space-y-3">
          <ol className="list-decimal space-y-1 pl-4 text-xs text-slate-400">
            <li>
              <Trans
                i18nKey="github.oauth.step1"
                components={[<a className="text-brand-400 hover:text-brand-300" href="https://github.com/settings/applications/new" target="_blank" rel="noreferrer" />]}
              />
            </li>
            <li><Trans i18nKey="github.oauth.step2" values={{ url: publicUrl || window.location.origin }} components={[<code className="text-brand-300" />]} /></li>
            <li>
              {t('github.oauth.step3')}
              <div className="mt-1 flex gap-2">
                <input className="input font-mono text-xs" readOnly value={callback} />
                <button className="btn-ghost shrink-0" onClick={() => { navigator.clipboard.writeText(callback); toast.success(t('github.oauth.callbackCopied')); }}>
                  {t('common.copy')}
                </button>
              </div>
            </li>
            <li>{t('github.oauth.step4')}</li>
          </ol>

          <div>
            <label className="label">{t('github.oauth.publicUrl')}</label>
            <input className="input" value={publicUrl} onChange={(e) => setPublicUrl(e.target.value)} placeholder="http://localhost:5173" />
          </div>
          <div>
            <label className="label">{t('github.oauth.clientId')}</label>
            <input className="input font-mono text-xs" value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="Iv1.xxxxxxxx" />
          </div>
          <div>
            <label className="label">{t('github.oauth.clientSecret')} {cfg.configured && <span className="text-slate-500">{t('github.oauth.keepBlank')}</span>}</label>
            <input className="input font-mono text-xs" type="password" autoComplete="off" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} placeholder="••••••••" />
          </div>
          <div className="flex justify-end">
            <button className="btn-primary" onClick={save} disabled={saving}>
              {saving ? <Spinner /> : t('github.oauth.save')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
