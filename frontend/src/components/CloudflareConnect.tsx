import { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { api, type CfStatus } from '../lib/api';
import { toast } from '../store/toast';
import { Spinner } from './ui';

// Settings card: connect Cloudflare via API token + set the tunnel CNAME target.
export function CloudflareConnect() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<CfStatus | null>(null);
  const [token, setToken] = useState('');
  const [tunnel, setTunnel] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () =>
    api.cfStatus().then((s) => {
      setStatus(s);
      setTunnel(s.tunnel_cname || '');
    });
  useEffect(() => {
    load().catch(() => {});
  }, []);

  const connect = async () => {
    if (!token.trim()) return toast.error(t('cloudflare.pasteToken'));
    setBusy(true);
    try {
      const { account, zones } = await api.cfConnect(token.trim());
      toast.success(t('cloudflare.connectedToast', { suffix: account ? ` (${account})` : '', count: zones.length }));
      setToken('');
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const saveTunnel = async () => {
    setBusy(true);
    try {
      await api.cfSetTunnel(tunnel.trim());
      toast.success(t('cloudflare.tunnelSaved'));
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    if (!confirm(t('cloudflare.disconnectConfirm'))) return;
    await api.cfDisconnect();
    toast.info(t('cloudflare.disconnected'));
    load();
  };

  if (!status) return <div className="h-20 animate-pulse rounded-xl bg-black/[0.04] dark:bg-white/5" />;

  return (
    <div className="space-y-4">
      {status.connected ? (
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{t('cloudflare.connected')}{status.account ? ` · ${status.account}` : ''}</div>
            <div className="text-xs text-slate-500">{t('cloudflare.autoHint')}</div>
          </div>
          <button className="btn-ghost text-sm" onClick={disconnect}>{t('common.disconnect')}</button>
        </div>
      ) : (
        <div>
          <div className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">{t('cloudflare.connectTitle')}</div>
          <div className="flex gap-2">
            <input className="input font-mono text-xs" type="password" autoComplete="off" placeholder={t('cloudflare.tokenPlaceholder')} value={token} onChange={(e) => setToken(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && connect()} />
            <button className="btn-primary shrink-0" onClick={connect} disabled={busy}>{busy ? <Spinner /> : t('cloudflare.connect')}</button>
          </div>
          <p className="mt-1.5 text-xs text-slate-500">
            <Trans
              i18nKey="cloudflare.tokenHint"
              components={[
                <a className="text-brand-400 hover:text-brand-300" href="https://dash.cloudflare.com/profile/api-tokens" target="_blank" rel="noreferrer" />,
                <code className="text-brand-300" />,
                <code className="text-brand-300" />,
              ]}
            />
          </p>
        </div>
      )}

      <div className="rounded-xl border border-white/5 bg-ink-950/40 p-4">
        <label className="label">{t('cloudflare.tunnelTarget')}</label>
        <div className="flex gap-2">
          <input className="input font-mono text-xs" placeholder={t('cloudflare.tunnelPlaceholder')} value={tunnel} onChange={(e) => setTunnel(e.target.value)} />
          <button className="btn-ghost shrink-0" onClick={saveTunnel} disabled={busy}>{t('cloudflare.save')}</button>
        </div>
        <p className="mt-1.5 text-xs text-slate-500">
          <Trans
            i18nKey="cloudflare.tunnelHint"
            values={{ tunnel: status.tunnel_name }}
            components={[<code className="text-brand-300" />, <span className="text-slate-700 dark:text-slate-300" />]}
          />
        </p>
      </div>
    </div>
  );
}
