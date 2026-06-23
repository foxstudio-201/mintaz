
type FlagProps = { className?: string };

export function FlagVN({ className = 'w-5 h-5' }: FlagProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">
      <defs>
        <clipPath id="flag-vn-rounded">
          <rect width="24" height="24" rx="4" />
        </clipPath>
      </defs>
      <g clipPath="url(#flag-vn-rounded)">
        <rect width="24" height="24" fill="#DA251D" />
        <polygon
          fill="#FFFF00"
          points="12,5.5 13.53,9.9 18.18,9.99 14.47,12.8 15.82,17.26 12,14.6 8.18,17.26 9.53,12.8 5.82,9.99 10.47,9.9"
        />
      </g>
    </svg>
  );
}

export function FlagEN({ className = 'w-5 h-5' }: FlagProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">
      <defs>
        <clipPath id="flag-en-rounded">
          <rect width="24" height="24" rx="4" />
        </clipPath>
      </defs>
      <g clipPath="url(#flag-en-rounded)">
        <rect width="24" height="24" fill="#012169" />
        <path d="M0 0 L24 24 M24 0 L0 24" stroke="#FFFFFF" strokeWidth="5" />
        <path d="M0 0 L24 24 M24 0 L0 24" stroke="#C8102E" strokeWidth="2" />
        <path d="M12 0 V24 M0 12 H24" stroke="#FFFFFF" strokeWidth="6.5" />
        <path d="M12 0 V24 M0 12 H24" stroke="#C8102E" strokeWidth="3.8" />
      </g>
    </svg>
  );
}

export const FLAGS: Record<string, (props: FlagProps) => JSX.Element> = {
  en: FlagEN,
  vi: FlagVN,
};
