import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api, type UpdateInfo } from '../lib/api';
import { toast } from '../store/toast';
import { Spinner } from './ui';
import { IconRefresh } from './icons';

export function UpdatesCard() {
  const { t } = useTranslation();
  const [version, setVersion] = useState<string | null>(null);
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  const [checking, setChecking] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    api.adminVersion().then((v) => setVersion(v.version)).catch(() => {});
    return () => { if (poll.current) clearInterval(poll.current); };
  }, []);

  const check = async () => {
    setChecking(true);
    try {
      const res = await api.adminUpdateCheck();
      setInfo(res);
      if (res.version) setVersion(res.version);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setChecking(false);
    }
  };

  const apply = async () => {
    if (!confirm(t('settings.updates.confirm'))) return;
    setUpdating(true);
    setLog([]);
    try {
      await api.adminUpdateApply();
    } catch (e: any) {
      toast.error(e.message);
      setUpdating(false);
      return;
    }
    poll.current = setInterval(async () => {
      try {
        const s = await api.adminUpdateStatus();
        setLog(s.log || []);
        if (s.done) {
          if (poll.current) clearInterval(poll.current);
          setUpdating(false);
          if (s.ok) toast.success(t('settings.updates.applied'));
          else toast.error(t('settings.updates.failed'));
        }
      } catch {
        setLog((l) => [...l, t('settings.updates.restarting')]);
      }
    }, 2000);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm">
          <span className="text-slate-500">{t('settings.updates.current')}: </span>
          <span className="font-mono font-medium text-slate-800 dark:text-slate-200">v{version || '…'}</span>
          {info?.current && <span className="ml-2 font-mono text-xs text-slate-400">#{info.current}</span>}
        </div>
        <button onClick={check} disabled={checking || updating} className="btn-ghost inline-flex items-center gap-2 text-sm">
          {checking ? <Spinner /> : <IconRefresh className="w-4 h-4" />} {t('settings.updates.check')}
        </button>
      </div>

      {info && !info.error && !info.updateAvailable && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
          ✓ {t('settings.updates.upToDate')}
        </div>
      )}

      {info?.error && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
          {t('settings.updates.checkError', { error: info.error })}
        </div>
      )}

      {info?.updateAvailable && (
        <div className="space-y-3 rounded-xl border border-brand-500/30 bg-brand-500/5 p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-slate-700 dark:text-slate-200">
              {t('settings.updates.available', { count: info.behind || 0 })}
              <span className="ml-2 font-mono text-xs text-slate-400">#{info.latest}</span>
            </div>
            <button onClick={apply} disabled={updating} className="btn-primary inline-flex items-center gap-2 text-sm">
              {updating ? <Spinner /> : null} {t('settings.updates.updateNow')}
            </button>
          </div>
          {info.commits && info.commits.length > 0 && (
            <ul className="max-h-40 space-y-1 overflow-auto text-xs text-slate-500 dark:text-slate-400">
              {info.commits.map((c) => (
                <li key={c.sha} className="truncate">
                  <span className="font-mono text-slate-400">{c.sha}</span> {c.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {(updating || log.length > 0) && (
        <pre className="max-h-60 overflow-auto rounded-lg bg-ink-950 p-3 font-mono text-[11px] leading-relaxed text-slate-300">
{log.join('\n') || t('settings.updates.starting')}
        </pre>
      )}

      {updating && (
        <p className="text-xs text-slate-500">{t('settings.updates.restartNote')}</p>
      )}
    </div>
  );
}
