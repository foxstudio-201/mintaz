import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { connectLogs, type LogMsg } from '../lib/ws';
import { StatusBadge } from './ui';

type Line = { stream: string; line: string; ts: number };

export function LogViewer({ deploymentId, initialStatus }: { deploymentId: string; initialStatus?: string }) {
  const { t } = useTranslation();
  const [lines, setLines] = useState<Line[]>([]);
  const [status, setStatus] = useState(initialStatus || 'queued');
  const [autoscroll, setAutoscroll] = useState(true);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLines([]);
    const disconnect = connectLogs(deploymentId, (msg: LogMsg) => {
      if (msg.type === 'log') setLines((prev) => [...prev.slice(-4000), { stream: msg.stream, line: msg.line, ts: msg.ts }]);
      else if (msg.type === 'status' || msg.type === 'snapshot') setStatus(msg.status);
    });
    return disconnect;
  }, [deploymentId]);

  useEffect(() => {
    if (autoscroll && boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight;
  }, [lines, autoscroll]);

  const onScroll = () => {
    const el = boxRef.current;
    if (!el) return;
    setAutoscroll(el.scrollHeight - el.scrollTop - el.clientHeight < 40);
  };

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-2.5">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('logViewer.title')}</span>
          <StatusBadge status={status} />
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-400">
          <input type="checkbox" checked={autoscroll} onChange={(e) => setAutoscroll(e.target.checked)} />
          {t('logViewer.autoScroll')}
        </label>
      </div>
      <div ref={boxRef} onScroll={onScroll} className="h-[420px] overflow-auto bg-ink-950 p-4 font-mono text-xs leading-relaxed">
        {lines.length === 0 ? (
          <div className="text-slate-600">{t('logViewer.waiting')}</div>
        ) : (
          lines.map((l, i) => (
            <div key={i} className="flex gap-3">
              <span className={`shrink-0 ${l.stream === 'runtime' ? 'text-emerald-500/70' : l.stream === 'system' ? 'text-red-400/70' : 'text-slate-600'}`}>
                {l.stream === 'runtime' ? t('logViewer.run') : l.stream === 'system' ? t('logViewer.sys') : t('logViewer.bld')}
              </span>
              <span className="whitespace-pre-wrap break-all text-slate-300">{l.line}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
