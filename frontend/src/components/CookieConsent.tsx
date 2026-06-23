import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { getConsent, setConsent } from '../lib/consent';
import { trackView } from '../lib/analytics';

export function CookieConsent() {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (getConsent()) return;
    const id = setTimeout(() => setShow(true), 600);
    return () => clearTimeout(id);
  }, []);

  const choose = (choice: 'accepted' | 'rejected') => {
    setConsent(choice);
    setShow(false);
    if (choice === 'accepted') trackView(window.location.pathname);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ type: 'spring', stiffness: 400, damping: 34 }}
          role="dialog"
          aria-label={t('cookie.title')}
          className="glass-strong fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-2xl flex-col gap-3 rounded-2xl p-4 shadow-glow sm:flex-row sm:items-center sm:gap-4 sm:p-5"
        >
          <div className="flex-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            <span className="font-medium text-slate-800 dark:text-slate-100">🍪 {t('cookie.title')} </span>
            {t('cookie.message')}{' '}
            <Link to="/privacy" className="font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300">
              {t('cookie.learnMore')}
            </Link>
          </div>
          <div className="flex shrink-0 gap-2">
            <button onClick={() => choose('rejected')} className="btn-ghost px-4 py-2 text-sm">
              {t('cookie.reject')}
            </button>
            <button onClick={() => choose('accepted')} className="btn-primary px-4 py-2 text-sm">
              {t('cookie.accept')}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
