import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../store/auth';
import { toast } from '../store/toast';
import { Spinner } from '../components/ui';
import { MintazLogo } from '../components/icons';

export function Login() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success(t('auth.welcomeBack'));
      navigate('/');
    } catch (err: any) {
      toast.error(err.message || t('auth.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-strong w-full max-w-md rounded-3xl p-8 shadow-glow"
      >
        <div className="mb-7 flex items-center gap-3">
          <MintazLogo className="h-11 w-11" />
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Mintaz</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('auth.appTagline')}</p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">{t('auth.email')}</label>
            <input className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@your-domain.com" required />
          </div>
          <div>
            <label className="label">{t('auth.password')}</label>
            <input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          <button className="btn-primary w-full" disabled={loading}>
            {loading ? <Spinner /> : t('auth.signIn')}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          {t('auth.noAccount')}{' '}
          <Link to="/register" className="font-medium text-brand-400 hover:text-brand-300">
            {t('auth.createOne')}
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
