import { useState } from 'react';
import { getGravatarUrl } from '../lib/avatar';

type AvatarProps = {
  email: string;
  githubAvatar?: string | null;
  size?: number;
  className?: string;
};

function DefaultAvatarSVG({ size, className = '' }: { size: number; className?: string }) {
  return (
    <div
      className={`flex items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size * 0.6}
        height={size * 0.6}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-slate-400 dark:text-slate-500"
      >
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    </div>
  );
}

export function Avatar({ email, githubAvatar, size = 40, className = '' }: AvatarProps) {
  const [gravatarFailed, setGravatarFailed] = useState(false);

  if (githubAvatar) {
    return (
      <img
        src={githubAvatar}
        alt="Avatar"
        width={size}
        height={size}
        className={`rounded-full object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  if (!gravatarFailed) {
    const gravatarUrl = getGravatarUrl(email, size);
    return (
      <img
        src={gravatarUrl}
        alt="Avatar"
        width={size}
        height={size}
        className={`rounded-full object-cover ${className}`}
        style={{ width: size, height: size }}
        onError={() => setGravatarFailed(true)}
      />
    );
  }

  return <DefaultAvatarSVG size={size} className={className} />;
}
