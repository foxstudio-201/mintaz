import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { MintazLogo, IconArrowLeft } from '../components/icons';
import { LANGUAGES, setLanguage, type Lang } from '../i18n';
import { TERMS, PRIVACY, type LegalDoc } from './legal-content';

function LangToggle() {
  const { i18n } = useTranslation();
  return (
    <div className="flex items-center gap-1 text-xs">
      {LANGUAGES.map((l) => (
        <button
          key={l.code}
          onClick={() => setLanguage(l.code as Lang)}
          className={`rounded-md px-2 py-1 transition ${
            i18n.language === l.code
              ? 'bg-black/[0.06] text-slate-900 dark:bg-white/10 dark:text-white'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          {l.short}
        </button>
      ))}
    </div>
  );
}

function LegalPage({ pick, other }: { pick: Record<Lang, LegalDoc>; other: { to: string; key: string } }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const lang = (i18n.language === 'vi' ? 'vi' : 'en') as Lang;
  const doc = pick[lang];

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <MintazLogo className="h-8 w-8" />
            <span className="text-sm font-semibold text-slate-900 dark:text-white">Mintaz</span>
          </Link>
          <LangToggle />
        </div>

        <motion.article
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-strong rounded-3xl p-6 sm:p-10"
        >
          <button
            onClick={() => navigate(-1)}
            className="mb-6 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          >
            <IconArrowLeft className="h-4 w-4" /> {t('legal.back')}
          </button>

          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white sm:text-3xl">{doc.title}</h1>
          <p className="mt-1 text-xs text-slate-500">{t('legal.lastUpdated', { date: doc.updated })}</p>

          <p className="mt-5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{doc.intro}</p>

          <div className="mt-6 space-y-6">
            {doc.sections.map((s) => (
              <section key={s.heading}>
                <h2 className="mb-2 text-base font-semibold text-slate-800 dark:text-slate-100">{s.heading}</h2>
                <div className="space-y-2">
                  {s.body.map((p, i) => (
                    <p key={i} className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{p}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-8 border-t border-black/[0.06] pt-5 text-sm dark:border-white/[0.06]">
            <Link to={other.to} className="font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300">
              {t(other.key)} →
            </Link>
          </div>
        </motion.article>

        <p className="mt-6 text-center text-xs text-slate-500">© {new Date().getFullYear()} Mintaz</p>
      </div>
    </div>
  );
}

export function Terms() {
  return <LegalPage pick={TERMS} other={{ to: '/privacy', key: 'legal.privacy' }} />;
}

export function Privacy() {
  return <LegalPage pick={PRIVACY} other={{ to: '/terms', key: 'legal.terms' }} />;
}
