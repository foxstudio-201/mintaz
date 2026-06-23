import { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { api, type GithubStatus } from '../lib/api';
import { toast } from '../store/toast';
import { Spinner } from './ui';
import { IconGithub } from './icons';

export function GithubConnect({ onChange }: { onChange?: () => void }) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<GithubStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState('');

  const load = () => api.githubStatus().then(setStatus).catch(() => {});
  useEffect(() => {
    load();
    const p = new URLSearchParams(location.search);
    const g = p.get('github');
    if (g === 'connected') toast.success(t('github.connectedToast'));
    else if (g === 'error') toast.error(`GitHub: ${p.get('msg') || t('github.connectFailed')}`);
    if (g) window.history.replaceState({}, '', location.pathname);
  }, []);

  const connectOAuth = async () => {
    setBusy(true);
    try {
      const { url } = await api.githubAuthorize();
      window.location.href = url;
    } catch (e: any) {
      toast.error(e.message);
      setBusy(false);
    }
  };

  const connectToken = async () => {
    if (!token.trim()) return toast.error(t('github.pasteFirst'));
    setBusy(true);
    try {
      const { login } = await api.githubConnectToken(token.trim());
      toast.success(t('github.connectedAsToast', { login }));
      setToken('');
      load();
      onChange?.();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    if (!confirm(t('github.disconnectConfirm'))) return;
    await api.githubDisconnect();
    toast.info(t('github.disconnected'));
    load();
    onChange?.();
  };

  if (!status) return <div className="h-20 animate-pulse rounded-xl bg-black/[0.04] dark:bg-white/5" />;

  // Connected — show the account.
  if (status.connected) {
    return (
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {status.avatar && <img src={status.avatar} alt="" className="h-9 w-9 rounded-full" />}
          <div>
            <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{t('github.connectedAs', { login: status.login })}</div>
            <div className="text-xs text-slate-500">{t('github.reposHint')}</div>
          </div>
        </div>
        <button className="btn-ghost text-sm" onClick={disconnect}>
          {t('common.disconnect')}
        </button>
      </div>
    );
  }

  // Not connected — offer OAuth (if configured) and/or the token method.
  return (
    <div className="space-y-4">
      {status.configured && (
        <>
          <div className="flex items-center justify-between gap-4">
            <div className="text-sm text-slate-400">{t('github.oneClick')}</div>
            <button className="btn-primary inline-flex items-center gap-2" onClick={connectOAuth} disabled={busy}>
              {busy ? <Spinner /> : <><IconGithub className="w-4 h-4" /> {t('github.connectGithub')}</>}
            </button>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-600">
            <span className="h-px flex-1 bg-black/[0.08] dark:bg-white/10" /> {t('github.orToken')} <span className="h-px flex-1 bg-black/[0.08] dark:bg-white/10" />
          </div>
        </>
      )}

      <div>
        <div className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">{t('github.patTitle')}</div>
        <div className="flex gap-2">
          <input
            className="input font-mono text-xs"
            type="password"
            autoComplete="off"
            placeholder={t('github.patPlaceholder')}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && connectToken()}
          />
          <button className="btn-primary shrink-0" onClick={connectToken} disabled={busy}>
            {busy ? <Spinner /> : t('github.connect')}
          </button>
        </div>
        <p className="mt-1.5 text-xs text-slate-500">
          <Trans
            i18nKey="github.patHint"
            components={[
              <a className="text-brand-400 hover:text-brand-300" href="https://github.com/settings/tokens/new?scopes=repo&description=Mintaz" target="_blank" rel="noreferrer" />,
              <code className="text-brand-300" />,
            ]}
          />
        </p>
      </div>
    </div>
  );
}
