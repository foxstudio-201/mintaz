import { useState } from 'react';
import { NavLink, Link, Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../store/auth';
import { useTheme } from '../store/theme';
import { LANGUAGES, setLanguage, type Lang } from '../i18n';
import { IconProjects, IconPlusCircle, IconGear, IconShield, IconSun, IconMoon, MintazLogo, IconChart, IconMenu, IconX, IconGithub } from './icons';
import { FLAGS } from './icons/Flags';
import { Avatar } from './Avatar';

export const GITHUB_URL = 'https://github.com/foxstudio-201/mintaz';

const nav = [
  { to: '/', labelKey: 'nav.projects', icon: IconProjects, end: true },
  { to: '/new', labelKey: 'nav.newProject', icon: IconPlusCircle },
  { to: '/analytics', labelKey: 'nav.analytics', icon: IconChart },
  { to: '/settings', labelKey: 'nav.settings', icon: IconGear },
];

function NavItem({ to, label, icon: Icon, end, onClick }: { to: string; label: string; icon: React.ComponentType<{ className?: string }>; end?: boolean; onClick?: () => void }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-150 ${
          isActive
            ? 'bg-black/[0.05] dark:bg-white/[0.06] text-slate-900 dark:text-white'
            : 'text-slate-500 dark:text-slate-400 hover:bg-black/[0.03] dark:hover:bg-white/[0.03] hover:text-slate-700 dark:hover:text-slate-200'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={`absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-brand-500 transition-all duration-200 ${
              isActive ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0'
            }`}
          />
          <Icon className="w-5 h-5 opacity-80" />
          {label}
        </>
      )}
    </NavLink>
  );
}

function LanguageToggle() {
  const { i18n, t } = useTranslation();
  const current = LANGUAGES.find((l) => l.code === i18n.language) || LANGUAGES[0];
  const nextLang = LANGUAGES.find((l) => l.code !== current.code) || LANGUAGES[0];
  const Flag = FLAGS[current.code] || FLAGS.en;

  return (
    <button
      onClick={() => setLanguage(nextLang.code as Lang)}
      className="btn-ghost flex-1 gap-2 px-3 py-1.5 text-sm"
      title={t('language.switchTo', { lang: nextLang.label })}
      aria-label={t('language.switchTo', { lang: nextLang.label })}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={current.code}
          initial={{ rotateY: -90, opacity: 0 }}
          animate={{ rotateY: 0, opacity: 1 }}
          exit={{ rotateY: 90, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="inline-flex"
        >
          <Flag className="h-4 w-4 rounded-[3px]" />
        </motion.span>
      </AnimatePresence>
      {current.short}
    </button>
  );
}

function ThemeSwitch() {
  const { t } = useTranslation();
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      onClick={toggle}
      title={isDark ? t('theme.light') : t('theme.dark')}
      aria-label={isDark ? t('theme.light') : t('theme.dark')}
      className={`relative inline-flex h-7 w-[52px] shrink-0 items-center rounded-full border transition-colors duration-300 ${
        isDark ? 'border-white/10 bg-slate-700/80' : 'border-amber-400/50 bg-amber-300/90'
      }`}
    >
      <motion.span
        initial={false}
        animate={{ x: isDark ? 26 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
        className={`absolute flex h-6 w-6 items-center justify-center rounded-full shadow-md ${
          isDark ? 'bg-slate-900' : 'bg-white'
        }`}
      >
        <AnimatePresence mode="wait" initial={false}>
          {isDark ? (
            <motion.span
              key="moon"
              initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.2 }}
              className="inline-flex"
            >
              <IconMoon className="h-3.5 w-3.5 text-white" />
            </motion.span>
          ) : (
            <motion.span
              key="sun"
              initial={{ rotate: 90, opacity: 0, scale: 0.5 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: -90, opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.2 }}
              className="inline-flex"
            >
              <IconSun className="h-3.5 w-3.5 text-amber-500" />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.span>
    </button>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <>
      <div className="mb-8 flex items-center gap-2.5 px-1">
        <MintazLogo className="h-9 w-9" />
        <div>
          <div className="text-sm font-semibold leading-tight text-slate-900 dark:text-white">Mintaz</div>
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        {nav.map((n) => (
          <NavItem key={n.to} to={n.to} label={t(n.labelKey)} icon={n.icon} end={n.end} onClick={onNavigate} />
        ))}
        {user?.role === 'admin' && (
          <NavItem to="/admin" label={t('nav.admin')} icon={IconShield} onClick={onNavigate} />
        )}
      </nav>

      <div className="mt-auto space-y-3 pt-4">
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeSwitch />
        </div>
        <button
          onClick={() => {
            onNavigate?.();
            navigate('/account');
          }}
          className="card flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
        >
          {user && (
            <Avatar email={user.email} githubAvatar={user.github_avatar} size={36} />
          )}
          <div className="min-w-0 flex-1 text-xs">
            <div className="truncate font-medium text-slate-700 dark:text-slate-200">
              {user?.name || user?.email}
            </div>
            <div className="truncate text-slate-500">{user?.role}</div>
          </div>
        </button>
        <button
          onClick={() => {
            onNavigate?.();
            logout();
            navigate('/login');
          }}
          className="btn-ghost w-full text-sm"
        >
          {t('nav.signOut')}
        </button>
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noreferrer"
          className="btn-ghost w-full justify-center gap-2 text-sm"
          title={t('nav.github')}
        >
          <IconGithub className="w-4 h-4" /> {t('nav.github')}
        </a>
        <p className="px-1 text-center text-[11px] text-slate-400 dark:text-slate-500">
          <Link to="/terms" onClick={onNavigate} className="hover:text-slate-600 dark:hover:text-slate-300">{t('legal.terms')}</Link>
          {' · '}
          <Link to="/privacy" onClick={onNavigate} className="hover:text-slate-600 dark:hover:text-slate-300">{t('legal.privacy')}</Link>
        </p>
      </div>
    </>
  );
}

export function Layout() {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r p-5 backdrop-blur-xl md:flex bg-white/80 dark:bg-ink-900/40 border-black/[0.06] dark:border-white/[0.06]">
        <SidebarContent />
      </aside>

      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
            />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', stiffness: 400, damping: 40 }}
              className="fixed left-0 top-0 z-50 flex h-full w-72 flex-col border-r p-5 backdrop-blur-xl md:hidden bg-white/95 dark:bg-ink-900/90 border-black/[0.06] dark:border-white/[0.06]"
            >
              <button
                onClick={() => setMenuOpen(false)}
                className="btn-ghost absolute right-4 top-4 p-1.5"
                aria-label={t('nav.closeMenu')}
              >
                <IconX className="h-4 w-4" />
              </button>
              <SidebarContent onNavigate={() => setMenuOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main className="min-w-0 flex-1">
        <header className="glass-strong sticky top-0 z-30 flex items-center justify-between border-b border-black/[0.06] px-4 py-3 dark:border-white/[0.06] md:hidden">
          <div className="flex items-center gap-2.5">
            <MintazLogo className="h-8 w-8" />
            <span className="text-sm font-semibold text-slate-900 dark:text-white">Mintaz</span>
          </div>
          <button
            onClick={() => setMenuOpen(true)}
            className="btn-ghost p-2"
            aria-label={t('nav.openMenu')}
          >
            <IconMenu className="h-5 w-5" />
          </button>
        </header>

        <div className="mx-auto max-w-6xl px-5 py-8 md:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
