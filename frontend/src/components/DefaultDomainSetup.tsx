import { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { api, type AdminDefaults, type CfZone } from '../lib/api';
import { toast } from '../store/toast';
import { Spinner } from './ui';

export function DefaultDomainSetup() {
  const { t } = useTranslation();
  const [cfg, setCfg] = useState<AdminDefaults | null>(null);
  const [zones, setZones] = useState<CfZone[]>([]);
  const [token, setToken] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [tunnel, setTunnel] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () =>
    api.adminDefaults().then((c) => {
      setCfg(c);
      setZoneId(c.zone_id || '');
      setTunnel(c.tunnel_cname || '');
      if (c.has_token) api.adminDefaultZones().then(({ zones }) => setZones(zones)).catch(() => {});
    });
  useEffect(() => {
    load().catch(() => {});
  }, []);

  const loadZones = async () => {
    if (!token.trim() && !cfg?.has_token) return toast.error(t('defaultDomain.enterTokenFirst'));
    setBusy(true);
    try {
      const { zones } = await api.adminDefaultZones(token.trim() || undefined);
      setZones(zones);
      toast.success(t('defaultDomain.domainsFound', { count: zones.length }));
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    const zone = zones.find((z) => z.id === zoneId);
    if (!zone) return toast.error(t('defaultDomain.pickDefault'));
    if (!tunnel.trim()) return toast.error(t('defaultDomain.tunnelRequired'));
    setBusy(true);
    try {
      await api.adminSaveDefaults({ token: token.trim() || undefined, zone_id: zone.id, zone_name: zone.name, tunnel_cname: tunnel.trim() });
      toast.success(t('defaultDomain.savedToast'));
      setToken('');
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const clear = async () => {
    if (!confirm(t('defaultDomain.clearConfirm'))) return;
    await api.adminClearDefaults();
    setZones([]);
    setZoneId('');
    setTunnel('');
    toast.info(t('defaultDomain.clearedToast'));
    load();
  };

  if (!cfg) return <div className="h-16 animate-pulse rounded-xl bg-black/[0.04] dark:bg-white/5" />;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">
          {cfg.configured ? (
            <Trans i18nKey="defaultDomain.configured" values={{ zone: cfg.zone_name }} components={[<code className="text-emerald-700 dark:text-emerald-300" />]} />
          ) : (
            t('defaultDomain.notSet')
          )}
        </p>
        {cfg.configured && <button className="btn-ghost px-2.5 py-1 text-xs" onClick={clear}>{t('defaultDomain.clear')}</button>}
      </div>

      <div className="rounded-xl border border-white/5 bg-ink-950/40 p-4 space-y-3">
        <div>
          <label className="label">{t('defaultDomain.apiToken')} {cfg.has_token && <span className="text-slate-500">{t('defaultDomain.tokenSet')}</span>}</label>
          <div className="flex gap-2">
            <input className="input font-mono text-xs" type="password" autoComplete="off" placeholder={t('defaultDomain.tokenPlaceholder')} value={token} onChange={(e) => setToken(e.target.value)} />
            <button className="btn-ghost shrink-0" onClick={loadZones} disabled={busy}>{busy ? <Spinner /> : t('defaultDomain.loadDomains')}</button>
          </div>
        </div>
        <div>
          <label className="label">{t('defaultDomain.defaultZone')}</label>
          <select className="input" value={zoneId} onChange={(e) => setZoneId(e.target.value)}>
            <option value="">{t('defaultDomain.select')}</option>
            {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">{t('defaultDomain.tunnelTarget')}</label>
          <input className="input font-mono text-xs" placeholder={t('defaultDomain.tunnelPlaceholder')} value={tunnel} onChange={(e) => setTunnel(e.target.value)} />
        </div>
        <div className="flex justify-end">
          <button className="btn-primary" onClick={save} disabled={busy}>{busy ? <Spinner /> : t('defaultDomain.saveDefault')}</button>
        </div>
      </div>
    </div>
  );
}
