import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

type Props = {
  label: string;
  icon: ReactNode;
  used: number;
  soft: number;
  limit: number;
  unit?: string;
  formatValue?: (v: number) => string;
};

function fmtNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(2);
}

export function QuotaCard({ label, icon, used, soft, limit, unit = '', formatValue }: Props) {
  const { t } = useTranslation();
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const isHard = used >= limit && limit > 0;
  const isSoft = !isHard && used >= soft && limit > 0;

  const barColor = isHard
    ? 'bg-red-500'
    : isSoft
      ? 'bg-amber-500'
      : 'bg-brand-500';

  const textColor = isHard
    ? 'text-red-600 dark:text-red-400'
    : isSoft
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-slate-700 dark:text-slate-300';

  const val = formatValue ? formatValue(used) : fmtNum(used);
  const lim = formatValue ? formatValue(limit) : fmtNum(limit);

  return (
    <div className="card p-4">
      <div className="mb-2 flex items-center gap-2 text-xs text-slate-500">
        <span className={textColor}>{icon}</span>
        <span className="uppercase tracking-wide">{label}</span>
      </div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className={`text-lg font-semibold ${textColor}`}>{val}</span>
        <span className="text-xs text-slate-500 dark:text-slate-400">/ {lim}{unit && ` ${unit}`}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/[0.08] dark:bg-white/10">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {isHard && (
        <div className="mt-2 text-[10px] font-medium text-red-400">{t('quota.limitReached')}</div>
      )}
      {isSoft && (
        <div className="mt-2 text-[10px] font-medium text-amber-400">{t('quota.approachingLimit')}</div>
      )}
    </div>
  );
}
