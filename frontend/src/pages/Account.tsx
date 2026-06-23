import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api, type Profile } from '../lib/api';
import { toast } from '../store/toast';
import { Spinner } from '../components/ui';
import { Avatar } from '../components/Avatar';
import { IconMail, IconUser, IconKey } from '../components/icons';

export function Account() {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getProfile().then(setProfile).catch((e) => toast.error(e.message)).finally(() => setLoading(false));
  }, []);

  if (loading || !profile) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{t('account.title')}</h1>

      {/* Profile Header */}
      <ProfileHeader profile={profile} />

      {/* Update Profile Form */}
      <UpdateProfileForm profile={profile} onSaved={async () => {
        const updated = await api.getProfile();
        setProfile(updated);
      }} />

      {/* Change Password Form */}
      <ChangePasswordForm />
    </div>
  );
}

function ProfileHeader({ profile }: { profile: Profile }) {
  const { t, i18n } = useTranslation();
  const displayName = profile.name || profile.email.split('@')[0];
  const memberSince = new Date(profile.created_at).toLocaleDateString(i18n.language === 'vi' ? 'vi-VN' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="card p-6">
      <div className="flex items-start gap-6">
        <Avatar email={profile.email} githubAvatar={profile.github_avatar} size={120} />
        <div className="flex-1 space-y-2">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{displayName}</h2>
            <div className="mt-1 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <IconMail className="h-4 w-4" />
              <span>{profile.email}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium ${
              profile.role === 'admin'
                ? 'bg-brand-500/15 text-brand-700 dark:text-brand-300'
                : 'bg-slate-500/15 text-slate-700 dark:text-slate-300'
            }`}>
              {profile.role === 'admin' ? t('account.roleAdmin') : t('account.roleUser')}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-500">
              {t('account.memberSince', { date: memberSince })}
            </span>
          </div>
          {profile.github_login && (
            <div className="pt-1 text-xs text-slate-500 dark:text-slate-500">
              {t('account.githubConnected')} <span className="font-medium text-slate-700 dark:text-slate-300">{profile.github_login}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function UpdateProfileForm({ profile, onSaved }: { profile: Profile; onSaved: () => void }) {
  const { t } = useTranslation();
  const [name, setName] = useState(profile.name || '');
  const [email, setEmail] = useState(profile.email);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      const trimmedName = name.trim();
      await api.updateProfile({ name: trimmedName || undefined, email });
      toast.success(t('account.profileUpdated'));
      onSaved();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = name !== (profile.name || '') || email !== profile.email;

  return (
    <div className="card p-6">
      <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">{t('account.updateTitle')}</h3>
      <div className="space-y-4">
        <div>
          <label className="label">
            <IconUser className="inline h-4 w-4" /> {t('account.displayName')}
          </label>
          <input
            className="input"
            type="text"
            placeholder={t('account.displayNamePlaceholder')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
          />
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
            {t('account.displayNameHint')}
          </p>
        </div>
        <div>
          <label className="label">
            <IconMail className="inline h-4 w-4" /> {t('account.email')}
          </label>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="flex justify-end pt-2">
          <button className="btn-primary" onClick={submit} disabled={saving || !hasChanges}>
            {saving ? <Spinner /> : t('account.update')}
          </button>
        </div>
      </div>
    </div>
  );
}

function ChangePasswordForm() {
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (newPassword.length < 8) {
      return toast.error(t('account.passwordTooShort'));
    }
    if (newPassword === currentPassword) {
      return toast.error(t('account.passwordSameAsOld'));
    }
    if (newPassword !== confirmPassword) {
      return toast.error(t('account.passwordMismatch'));
    }

    setSaving(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      toast.success(t('account.passwordChanged'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const canSubmit = currentPassword && newPassword && confirmPassword && !saving;

  return (
    <div className="card p-6">
      <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
        <IconKey className="mr-2 inline h-5 w-5" />
        {t('account.changePasswordTitle')}
      </h3>
      <div className="space-y-4">
        <div>
          <label className="label">{t('account.currentPassword')}</label>
          <input
            className="input"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        <div>
          <label className="label">{t('account.newPassword')}</label>
          <input
            className="input"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
          />
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
            {t('account.passwordMinHint')}
          </p>
        </div>
        <div>
          <label className="label">{t('account.confirmPassword')}</label>
          <input
            className="input"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        <div className="flex justify-end pt-2">
          <button className="btn-primary" onClick={submit} disabled={!canSubmit}>
            {saving ? <Spinner /> : t('account.changePassword')}
          </button>
        </div>
      </div>
    </div>
  );
}
