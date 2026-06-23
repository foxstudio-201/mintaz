import { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { api, type Project, type CfZone, type CfStatus } from '../lib/api';
import { toast } from '../store/toast';
import { Spinner, StatusBadge } from './ui';
import { IconExternalLink } from './icons';

// Per-project domains: the auto-assigned default (*.platform) + an optional
// custom domain via the user's own Cloudflare account.
export function DomainTab({ project, onChange }: { project: Project; onChange: () => void }) {
  const { t } = useTranslation();
  const [cf, setCf] = useState<CfStatus | null>(null);
  const [zones, setZones] = useState<CfZone[]>([]);
  const [zoneId, setZoneId] = useState(project.cf_zone_id || '');
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [reach, setReach] = useState<'checking' | 'up' | 'down' | null>(null);

  const defaultUrl = project.production_url; // https://<slug>.<baseDomain>

  const loadCf = () =>
    api.cfStatus().then((s) => {
      setCf(s);
      if (s.connected) api.cfZones().then(({ zones }) => setZones(zones)).catch(() => {});
    });
  useEffect(() => {
    loadCf().catch(() => {});
  }, []);

  // Auto-check whether the live URL responds.
  useEffect(() => {
    const target = project.cf_zone_name ? `https://${project.slug}.${project.cf_zone_name}` : defaultUrl;
    let alive = true;
    const check = async () => {
      setReach('checking');
      try {
        await fetch(target, { mode: 'no-cors' });
        if (alive) setReach('up'); // no-cors: opaque success means it resolved
      } catch {
        if (alive) setReach('down');
      }
    };
    check();
    const t = setInterval(check, 15000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [project.id, project.cf_zone_name]);

  const connectCf = async () => {
    if (!token.trim()) {
      window.open('https://dash.cloudflare.com/profile/api-tokens', '_blank');
      return toast.info(t('domain.createToken'));
    }
    setBusy(true);
    try {
      const { account, zones } = await api.cfConnect(token.trim());
      setZones(zones);
      setToken('');
      toast.success(`${t('domain.connected')}${account ? ` (${account})` : ''}`);
      loadCf();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const applyCustom = async () => {
    const zone = zones.find((z) => z.id === zoneId);
    if (!zone) return toast.error(t('domain.pickDomain'));
    setBusy(true);
    try {
      const res = await api.cfSetDomain(project.id, zone.id, zone.name);
      toast.success(res.updated ? t('domain.dnsUpdated', { host: res.hostname }) : t('domain.dnsCreated', { host: res.hostname }));
      onChange();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const removeCustom = async () => {
    if (!confirm(t('domain.removeConfirm'))) return;
    await api.cfRemoveDomain(project.id);
    setZoneId('');
    toast.info(t('domain.removed'));
    onChange();
  };

  const customHost = project.cf_zone_name ? `${project.slug}.${project.cf_zone_name}` : null;

  return (
    <div className="space-y-4">
      {/* Default domain (always available) */}
      <div className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('domain.defaultDomain')}</h3>
          {reach && !customHost && (
            <StatusBadge status={reach === 'up' ? 'running' : reach === 'checking' ? 'building' : 'failed'} />
          )}
        </div>
        <a href={defaultUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono text-sm text-brand-400 hover:text-brand-300">
          {defaultUrl.replace('https://', '')} <IconExternalLink className="w-3 h-3" />
        </a>
        <p className="mt-2 text-xs text-slate-500">
          {t('domain.defaultHint')}
        </p>
      </div>

      {/* Custom domain */}
      <div className="card p-5">
        <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">{t('domain.customDomain')}</h3>

        {customHost && (
          <div className="mb-3 flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
            <a href={`https://${customHost}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono text-sm text-emerald-700 dark:text-emerald-300">{customHost} <IconExternalLink className="w-3 h-3" /></a>
            <div className="flex items-center gap-2">
              {reach && <StatusBadge status={reach === 'up' ? 'running' : reach === 'checking' ? 'building' : 'failed'} />}
              <button className="btn-ghost px-2.5 py-1 text-xs" onClick={removeCustom}>{t('domain.remove')}</button>
            </div>
          </div>
        )}

        {!cf?.connected ? (
          <div>
            <p className="mb-2 text-xs text-slate-400">{t('domain.connectHint')}</p>
            <div className="flex gap-2">
              <input className="input font-mono text-xs" type="password" autoComplete="off" placeholder={t('domain.tokenPlaceholder')} value={token} onChange={(e) => setToken(e.target.value)} />
              <button className="btn-primary inline-flex items-center gap-1 shrink-0" onClick={connectCf} disabled={busy}>
                {busy ? <Spinner /> : token ? t('domain.connect') : <>{t('domain.getToken')} <IconExternalLink className="w-3 h-3" /></>}
              </button>
            </div>
            <p className="mt-1.5 text-xs text-slate-500"><Trans i18nKey="domain.tokenNeeds" components={[<code className="text-brand-300" />, <code className="text-brand-300" />]} /></p>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="label">{t('domain.domain')}</label>
              <select className="input" value={zoneId} onChange={(e) => setZoneId(e.target.value)}>
                <option value="">{t('domain.selectDomain')}</option>
                {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
              {zoneId && (
                <p className="mt-1.5 text-xs text-slate-500">
                  <Trans i18nKey="domain.createsRecord" values={{ host: `${project.slug}.${zones.find((z) => z.id === zoneId)?.name}` }} components={[<code className="text-brand-300" />]} />
                </p>
              )}
            </div>
            <div className="flex justify-end">
              <button className="btn-primary" onClick={applyCustom} disabled={busy || !zoneId}>
                {busy ? <Spinner /> : customHost ? t('domain.updateDomain') : t('domain.attachDomain')}
              </button>
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-500">
        {t('domain.footer')}
      </p>
    </div>
  );
}
