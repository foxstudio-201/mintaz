import { AnimatePresence, motion } from 'framer-motion';
import { useToast } from '../store/toast';
import { IconCheckCircle, IconXCircle, IconInfoCircle } from './icons';

const KIND = {
  success: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
  error: 'border-red-500/40 bg-red-500/10 text-red-200',
  info: 'border-brand-500/40 bg-brand-500/10 text-brand-200',
};

const ICON = {
  success: <IconCheckCircle className="mr-2 inline w-4 h-4" />,
  error: <IconXCircle className="mr-2 inline w-4 h-4" />,
  info: <IconInfoCircle className="mr-2 inline w-4 h-4" />,
};

export function Toaster() {
  const { toasts, dismiss } = useToast();
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-50 flex w-80 flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, x: 40, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            onClick={() => dismiss(t.id)}
            className={`pointer-events-auto cursor-pointer rounded-xl border px-4 py-3 text-sm shadow-lg backdrop-blur-xl ${KIND[t.kind]}`}
          >
            {ICON[t.kind]}
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
