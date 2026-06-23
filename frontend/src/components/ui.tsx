import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import i18n from '../i18n';

const STATUS_STYLE: Record<string, string> = {
  running: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  building: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  cloning: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
  deploying: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
  queued: 'bg-slate-500/15 text-slate-600 dark:text-slate-300 border-slate-500/30',
  failed: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30',
  stopped: 'bg-slate-600/20 text-slate-500 dark:text-slate-400 border-slate-600/30',
  active: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  destroyed: 'bg-slate-600/20 text-slate-500 dark:text-slate-400 border-slate-600/30',
};

const PULSE = ['building', 'cloning', 'deploying', 'queued'];

export function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_STYLE[status] || STATUS_STYLE.queued;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full bg-current ${PULSE.includes(status) ? 'animate-pulse' : ''}`} />
      {status}
    </span>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function CardSkeleton() {
  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white ${className}`}
    />
  );
}

export function EmptyState({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="card flex flex-col items-center justify-center gap-3 px-6 py-16 text-center"
    >
      {icon && <div className="text-4xl opacity-70">{icon}</div>}
      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">{title}</h3>
      <div className="max-w-sm text-sm text-slate-500 dark:text-slate-400">{children}</div>
    </motion.div>
  );
}

export function timeAgo(ts?: number | null) {
  if (!ts) return '—';
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return i18n.t('common.timeAgo.seconds', { n: s });
  if (s < 3600) return i18n.t('common.timeAgo.minutes', { n: Math.floor(s / 60) });
  if (s < 86400) return i18n.t('common.timeAgo.hours', { n: Math.floor(s / 3600) });
  return i18n.t('common.timeAgo.days', { n: Math.floor(s / 86400) });
}
