// Banner shown at the top of the dashboard when quota limits are approaching or reached.
import { useTranslation } from 'react-i18next';
import { IconInfoCircle, IconXCircle } from './icons';

type Warning = { key: string; used: number; limit: number };

type Props = {
  allowed: boolean;
  warnings: Warning[];
  reason: string | null;
};

export function QuotaBanner({ allowed, warnings, reason }: Props) {
  const { t } = useTranslation();
  if (allowed && warnings.length === 0) return null;

  if (!allowed) {
    return (
      <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-200">
        <IconXCircle className="mt-0.5 w-5 h-5 shrink-0" />
        <div>
          <div className="font-semibold">{t('quota.upgradeTitle')}</div>
          <div className="text-xs text-red-600/80 dark:text-red-300/80">{reason}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-200">
      <IconInfoCircle className="mt-0.5 w-5 h-5 shrink-0" />
      <div>
        <div className="font-semibold">{t('quota.approachingTitle')}</div>
        <div className="text-xs text-amber-700/80 dark:text-amber-300/80">
          {warnings.map((w) => `${t('quota.labels.' + w.key, { defaultValue: w.key })}: ${w.used}/${w.limit}`).join(' · ')}
        </div>
      </div>
    </div>
  );
}
