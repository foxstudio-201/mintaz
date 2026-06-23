
type IconProps = { className?: string; size?: number };

function Icon({ children, className = 'w-5 h-5', size }: { children: React.ReactNode; className?: string; size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      width={size}
      height={size}
    >
      {children}
    </svg>
  );
}

export function IconAuto({ className, size }: IconProps) {
  return (
    <Icon className={className} size={size}>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <path d="M12 8v4l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </Icon>
  );
}

export function IconNextJS({ className, size }: IconProps) {
  return (
    <Icon className={className} size={size}>
      <circle cx="12" cy="12" r="10" fill="#000000" />
      <path d="M9 7l8 10H9" fill="#ffffff" />
      <circle cx="16.5" cy="7.5" r="1" fill="#ffffff" />
    </Icon>
  );
}

export function IconNuxt({ className, size }: IconProps) {
  return (
    <Icon className={className} size={size}>
      <path d="M13.5 4L20 18H7L13.5 4Z" fill="#00DC82" />
      <path d="M6.5 12L3 18H10L6.5 12Z" fill="#00DC82" opacity="0.6" />
    </Icon>
  );
}

export function IconSvelte({ className, size }: IconProps) {
  return (
    <Icon className={className} size={size}>
      <path d="M18.5 7.5C18 5 16 3.5 13.5 3.5C11.5 3.5 9.8 4.7 9.2 6.5L5.5 16C5 17.5 5.5 19.2 6.8 20C8 20.8 9.7 20.7 10.8 19.7L18.5 7.5Z" fill="#FF3E00" />
      <path d="M8 11C7.5 13.5 9.5 15 11.5 15C13 15 14.3 14 14.8 12.5L18.5 3C19 1.5 18.5 0 17.2 0C16 0 14.7 1 14.2 2.2L8 11Z" fill="#FF3E00" opacity="0.6" />
    </Icon>
  );
}

export function IconRemix({ className, size }: IconProps) {
  return (
    <Icon className={className} size={size}>
      <circle cx="12" cy="12" r="10" fill="#1A1A1A" />
      <path d="M7 8H17V10H12V11H16V13H12V16H7V14H10V10H7V8Z" fill="#E6F4FF" />
    </Icon>
  );
}

export function IconNestJS({ className, size }: IconProps) {
  return (
    <Icon className={className} size={size}>
      <circle cx="12" cy="12" r="10" fill="#E0234E" />
      <path d="M12 6L17 9V15L12 18L7 15V9L12 6Z" fill="#ffffff" />
    </Icon>
  );
}

export function IconNode({ className, size }: IconProps) {
  return (
    <Icon className={className} size={size}>
      <path d="M12 2L21 7V17L12 22L3 17V7L12 2Z" fill="#339933" />
      <text x="12" y="16" fontSize="10" fontWeight="bold" fill="white" textAnchor="middle">N</text>
    </Icon>
  );
}

export function IconVite({ className, size }: IconProps) {
  return (
    <Icon className={className} size={size}>
      <path d="M20 3L12 21L10 12L2 3H20Z" fill="#646CFF" />
      <path d="M12 21L10 12L2 3H12L12 21Z" fill="#BD34FE" />
    </Icon>
  );
}

export function IconReact({ className, size }: IconProps) {
  return (
    <Icon className={className} size={size}>
      <circle cx="12" cy="12" r="2" fill="#61DAFB" />
      <ellipse cx="12" cy="12" rx="10" ry="4" stroke="#61DAFB" strokeWidth="1.5" fill="none" />
      <ellipse cx="12" cy="12" rx="10" ry="4" stroke="#61DAFB" strokeWidth="1.5" fill="none" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="10" ry="4" stroke="#61DAFB" strokeWidth="1.5" fill="none" transform="rotate(120 12 12)" />
    </Icon>
  );
}

export function IconVue({ className, size }: IconProps) {
  return (
    <Icon className={className} size={size}>
      <path d="M2 3H7L12 12L17 3H22L12 21L2 3Z" fill="#42B883" />
      <path d="M7 3H11L12 5L13 3H17L12 12L7 3Z" fill="#35495E" />
    </Icon>
  );
}

export function IconAngular({ className, size }: IconProps) {
  return (
    <Icon className={className} size={size}>
      <path d="M12 2L3 6L5 18L12 22L19 18L21 6L12 2Z" fill="#DD0031" />
      <path d="M12 6L8 16H10L11 13H13L14 16H16L12 6ZM11.5 11L12 8L12.5 11H11.5Z" fill="#ffffff" />
    </Icon>
  );
}

export function IconAstro({ className, size }: IconProps) {
  return (
    <Icon className={className} size={size}>
      <circle cx="12" cy="12" r="10" fill="#BC52EE" />
      <path d="M12 6L16 18H8L12 6Z" fill="#ffffff" />
      <circle cx="12" cy="14" r="2" fill="#BC52EE" />
    </Icon>
  );
}

export function IconStatic({ className, size }: IconProps) {
  return (
    <Icon className={className} size={size}>
      <rect x="4" y="4" width="16" height="16" rx="2" fill="#6B7280" />
      <path d="M8 9H16M8 12H16M8 15H13" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    </Icon>
  );
}

export function IconDocker({ className, size }: IconProps) {
  return (
    <Icon className={className} size={size}>
      <path d="M13 3H11V5H13V3ZM10 3H8V5H10V3ZM7 3H5V5H7V3Z" fill="#2496ED" />
      <path d="M13 6H11V8H13V6ZM10 6H8V8H10V6ZM7 6H5V8H7V6ZM4 6H2V8H4V6Z" fill="#2496ED" />
      <path d="M13 9H11V11H13V9ZM10 9H8V11H10V9ZM7 9H5V11H7V9Z" fill="#2496ED" />
      <path d="M2 13C2 17 5 20 9 20H15C19 20 22 17 22 13V11H2V13Z" fill="#2496ED" />
      <path d="M18 8C17 8 16 7 16 6H14V10H22C22 8 20 6 18 6V8Z" fill="#2496ED" />
    </Icon>
  );
}

export const FRAMEWORK_ICONS: Record<string, React.ComponentType<IconProps>> = {
  auto: IconAuto,
  nextjs: IconNextJS,
  nuxt: IconNuxt,
  sveltekit: IconSvelte,
  remix: IconRemix,
  nestjs: IconNestJS,
  node: IconNode,
  vite: IconVite,
  react: IconReact,
  vue: IconVue,
  angular: IconAngular,
  astro: IconAstro,
  static: IconStatic,
  dockerfile: IconDocker,
};

export function FrameworkIcon({ id, className, size }: { id: string } & IconProps) {
  const IconComponent = FRAMEWORK_ICONS[id] || IconAuto;
  return <IconComponent className={className} size={size} />;
}
