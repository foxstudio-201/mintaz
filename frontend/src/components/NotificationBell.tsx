import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { api, type Notification } from '../lib/api';
import { timeAgo } from './ui';
import { IconBell } from './icons';

function typeIcon(type: string) {
  if (type === 'deploy_success') return '✅';
  if (type === 'deploy_failed') return '⛔';
  return '🔔';
}

export function NotificationBell() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [pos, setPos] = useState({ left: 0, bottom: 0, width: 320, maxHeight: 480 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const load = () =>
    api.notifications().then((d) => { setItems(d.notifications); setUnread(d.unread); }).catch(() => {});

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  const place = () => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const width = Math.min(320, vw - 16);
    let left = r.right + 8;
    if (left + width > vw - 8) left = Math.max(8, vw - width - 8);
    const bottom = Math.min(Math.max(vh - r.bottom, 8), vh - 16);
    const maxHeight = Math.min(480, vh - bottom - 16);
    setPos({ left, bottom, width, maxHeight });
  };

  useEffect(() => {
    if (!open) return;
    place();
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (btnRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onMove = () => place();
    document.addEventListener('mousedown', onClick);
    window.addEventListener('resize', onMove);
    window.addEventListener('scroll', onMove, true);
    return () => {
      document.removeEventListener('mousedown', onClick);
      window.removeEventListener('resize', onMove);
      window.removeEventListener('scroll', onMove, true);
    };
  }, [open]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      setUnread(0);
      setItems((l) => l.map((n) => ({ ...n, seen: 1 })));
      api.notificationsRead().catch(() => {});
    }
  };

  const go = (n: Notification) => {
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  const clear = async () => {
    setItems([]);
    setUnread(0);
    await api.notificationsClear().catch(() => {});
  };

  return (
    <>
      <button ref={btnRef} onClick={toggle} aria-label={t('notifications.title')} className="btn-ghost relative p-2">
        <IconBell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={panelRef}
              initial={{ opacity: 0, x: -8, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -8, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              style={{ left: pos.left, bottom: pos.bottom, width: pos.width, maxHeight: pos.maxHeight }}
              className="fixed z-[200] flex flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-glow dark:border-white/10 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between border-b border-black/[0.06] px-4 py-2.5 dark:border-white/[0.06]">
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t('notifications.title')}</span>
                {items.length > 0 && (
                  <button onClick={clear} className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
                    {t('notifications.clear')}
                  </button>
                )}
              </div>
              <div className="flex-1 overflow-auto">
                {items.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-slate-500">{t('notifications.empty')}</div>
                ) : (
                  items.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => go(n)}
                      className="flex w-full gap-3 border-b border-black/[0.04] px-4 py-3 text-left transition last:border-0 hover:bg-black/[0.03] dark:border-white/[0.03] dark:hover:bg-white/[0.03]"
                    >
                      <span className="text-base leading-none">{typeIcon(n.type)}</span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">{n.title}</div>
                        {n.body && <div className="truncate text-xs text-slate-500">{n.body}</div>}
                        <div className="mt-0.5 text-[10px] text-slate-400">{timeAgo(n.created_at)}</div>
                      </div>
                      {!n.seen && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-500" />}
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
