
type IconProps = { className?: string };

function Icon({
  children,
  className = 'w-4 h-4',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {children}
    </svg>
  );
}


export function MintazLogo({ className = 'w-8 h-8' }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      fill="none"
      className={className}
    >
      <path
        d="M7 27C5 19 10 9 24 4c2 9-4 19-14 21-1.5.3-2.5-.5-3-2Z"
        fill="#34d399"
        opacity={0.3}
      />
      <path
        d="M7 27C5 19 10 9 24 4c2 9-4 19-14 21-1.5.3-2.5-.5-3-2Z"
        stroke="#10b981"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 25C13 18 18 11 24 5"
        stroke="#10b981"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <path
        d="M12 21c3-2 5.5-4.5 8-8M15 17c2-1.5 4-3.5 6-7"
        stroke="#10b981"
        strokeWidth={1}
        strokeLinecap="round"
        opacity={0.5}
      />
      <circle cx="21" cy="9" r="2" fill="#34d399" opacity={0.5} />
    </svg>
  );
}


export function IconMonitor({ className }: IconProps) {
  return (
    <Icon className={className}>
      <rect x="2" y="3" width="20" height="14" rx="2" fill="currentColor" opacity={0.15} stroke="none" />
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </Icon>
  );
}

export function IconClock({ className }: IconProps) {
  return (
    <Icon className={className}>
      <circle cx="12" cy="12" r="9" fill="currentColor" opacity={0.15} stroke="none" />
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </Icon>
  );
}

export function IconTerminal({ className }: IconProps) {
  return (
    <Icon className={className}>
      <rect x="2" y="4" width="20" height="16" rx="2" fill="currentColor" opacity={0.15} stroke="none" />
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M6 9l4 3-4 3" />
      <path d="M13 15h4" />
    </Icon>
  );
}

export function IconActivity({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" strokeWidth={2} />
    </Icon>
  );
}

export function IconKey({ className }: IconProps) {
  return (
    <Icon className={className}>
      <circle cx="8" cy="15" r="4" fill="currentColor" opacity={0.2} stroke="none" />
      <circle cx="8" cy="15" r="4" />
      <path d="M10.8 12.2L21 2" />
      <path d="M18 5l3 3" />
      <path d="M15 8l3 3" />
    </Icon>
  );
}

export function IconShield({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" fill="currentColor" opacity={0.15} />
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="M9 12l2 2 4-4" />
    </Icon>
  );
}

export function IconSun({ className }: IconProps) {
  return (
    <Icon className={className}>
      <circle cx="12" cy="12" r="4" fill="currentColor" opacity={0.25} stroke="none" />
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </Icon>
  );
}

export function IconMoon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" fill="currentColor" opacity={0.2} />
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
    </Icon>
  );
}


export function IconFolder({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M4 4h4l2 2h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" fill="currentColor" opacity={0.2} />
      <path d="M4 4h4l2 2h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
    </Icon>
  );
}

export function IconFileCode({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" fill="currentColor" opacity={0.15} />
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M15 2v5h5" />
      <path d="M10 13l-2 2 2 2" />
      <path d="M14 13l2 2-2 2" />
    </Icon>
  );
}

export function IconFileReact({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" fill="currentColor" opacity={0.15} />
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M15 2v5h5" />
      <circle cx="12" cy="15" r="1.25" fill="currentColor" stroke="none" />
      <ellipse cx="12" cy="15" rx="5" ry="2" />
      <ellipse cx="12" cy="15" rx="5" ry="2" transform="rotate(60 12 15)" />
      <ellipse cx="12" cy="15" rx="5" ry="2" transform="rotate(120 12 15)" />
    </Icon>
  );
}

export function IconFileJson({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" fill="currentColor" opacity={0.15} />
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M15 2v5h5" />
      <path d="M10 12c0-1-.5-1.5-1.5-1.5" />
      <path d="M10 17c0 1-.5 1.5-1.5 1.5" />
      <path d="M14 12c0-1 .5-1.5 1.5-1.5" />
      <path d="M14 17c0 1 .5 1.5 1.5 1.5" />
    </Icon>
  );
}

export function IconFileMarkdown({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" fill="currentColor" opacity={0.15} />
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M15 2v5h5" />
      <path d="M8 12h2l1-2 1 4 1-2h2" />
    </Icon>
  );
}

export function IconFileCss({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" fill="currentColor" opacity={0.15} />
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M15 2v5h5" />
      <circle cx="10" cy="14" r="3" fill="currentColor" opacity={0.2} />
      <circle cx="10" cy="14" r="3" />
      <circle cx="14" cy="14" r="3" fill="currentColor" opacity={0.2} />
      <circle cx="14" cy="14" r="3" />
    </Icon>
  );
}

export function IconFileHtml({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" fill="currentColor" opacity={0.15} />
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M15 2v5h5" />
      <path d="M10 13l-2 2 2 2" />
      <path d="M14 13l2 2-2 2" />
      <path d="M11.5 11l-1 8" />
    </Icon>
  );
}

export function IconFileImage({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" fill="currentColor" opacity={0.15} />
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M15 2v5h5" />
      <circle cx="10" cy="13" r="2" fill="currentColor" opacity={0.3} stroke="none" />
      <circle cx="10" cy="13" r="2" />
      <path d="M4 19l4.5-5 3 3 2.5-2.5L18 19" />
    </Icon>
  );
}

export function IconFileLock({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" fill="currentColor" opacity={0.15} />
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M15 2v5h5" />
      <rect x="8" y="14" width="8" height="5" rx="1" fill="currentColor" opacity={0.25} />
      <rect x="8" y="14" width="8" height="5" rx="1" />
      <path d="M10 14v-2a2 2 0 0 1 4 0v2" />
    </Icon>
  );
}

export function IconFileBlank({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" fill="currentColor" opacity={0.15} />
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M15 2v5h5" />
    </Icon>
  );
}


export function IconProjects({ className }: IconProps) {
  return (
    <Icon className={className}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" fill="currentColor" opacity={0.25} stroke="none" />
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" fill="currentColor" opacity={0.25} stroke="none" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" fill="currentColor" opacity={0.25} stroke="none" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" fill="currentColor" opacity={0.25} stroke="none" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </Icon>
  );
}

export function IconGear({ className }: IconProps) {
  return (
    <Icon className={className}>
      <circle cx="12" cy="12" r="3" fill="currentColor" opacity={0.25} stroke="none" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12" />
    </Icon>
  );
}


export function IconCheckCircle({ className }: IconProps) {
  return (
    <Icon className={className}>
      <circle cx="12" cy="12" r="9" fill="currentColor" opacity={0.2} stroke="none" />
      <circle cx="12" cy="12" r="9" />
      <path d="M9 12l2 2 4-4" strokeWidth={2} />
    </Icon>
  );
}

export function IconXCircle({ className }: IconProps) {
  return (
    <Icon className={className}>
      <circle cx="12" cy="12" r="9" fill="currentColor" opacity={0.2} stroke="none" />
      <circle cx="12" cy="12" r="9" />
      <path d="M15 9l-6 6M9 9l6 6" strokeWidth={2} />
    </Icon>
  );
}

export function IconInfoCircle({ className }: IconProps) {
  return (
    <Icon className={className}>
      <circle cx="12" cy="12" r="9" fill="currentColor" opacity={0.2} stroke="none" />
      <circle cx="12" cy="12" r="9" />
      <path d="M12 16v-4" strokeWidth={2} />
      <path d="M12 8h.01" strokeWidth={2.5} />
    </Icon>
  );
}

export function IconStatusOnline({ className }: IconProps) {
  return (
    <Icon className={className}>
      <circle cx="12" cy="12" r="4" fill="currentColor" opacity={0.3} stroke="none" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="9" opacity={0.4} />
    </Icon>
  );
}

export function IconStatusOffline({ className }: IconProps) {
  return (
    <Icon className={className}>
      <circle cx="12" cy="12" r="4" fill="currentColor" opacity={0.3} stroke="none" />
      <circle cx="12" cy="12" r="4" />
      <path d="M3 3l18 18" strokeWidth={2} />
    </Icon>
  );
}


export function IconPlusCircle({ className }: IconProps) {
  return (
    <Icon className={className}>
      <circle cx="12" cy="12" r="9" fill="currentColor" opacity={0.2} stroke="none" />
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" strokeWidth={2} />
    </Icon>
  );
}

export function IconPlus({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M12 5v14M5 12h14" strokeWidth={2} />
    </Icon>
  );
}

export function IconMenu({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M4 6h16M4 12h16M4 18h16" strokeWidth={2} />
    </Icon>
  );
}

export function IconBell({ className }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M6 9.5a6 6 0 0 1 12 0c0 3.5 1 4.8 2 5.8.5.5.1 1.2-.6 1.2H4.6c-.7 0-1.1-.7-.6-1.2 1-1 2-2.3 2-5.8Z" fill="currentColor" opacity="0.2" />
      <path d="M6 9.5a6 6 0 0 1 12 0c0 3.5 1 4.8 2 5.8.5.5.1 1.2-.6 1.2H4.6c-.7 0-1.1-.7-.6-1.2 1-1 2-2.3 2-5.8Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M9.5 18.5a2.5 2.5 0 0 0 5 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function IconRefresh({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M21 2v6h-6" />
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M3 22v-6h6" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
    </Icon>
  );
}

export function IconExternalLink({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <path d="M15 3h6v6" />
      <path d="M10 14L21 3" />
    </Icon>
  );
}

export function IconArrowLeft({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M19 12H5" />
      <path d="M12 19l-7-7 7-7" />
    </Icon>
  );
}

export function IconArrowRight({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M5 12h14" />
      <path d="M12 5l7 7-7 7" />
    </Icon>
  );
}

export function IconCornerUpLeft({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M9 14L4 9l5-5" />
      <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
    </Icon>
  );
}

export function IconRocket({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path
        d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09Z"
        fill="currentColor"
        opacity={0.2}
      />
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09Z" />
      <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11.95A22 22 0 0 1 12 15Z" fill="currentColor" opacity={0.15} />
      <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11.95A22 22 0 0 1 12 15Z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </Icon>
  );
}

export function IconDeploy({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M12 19V5" strokeWidth={2} />
      <path d="M5 12l7-7 7 7" strokeWidth={2} />
    </Icon>
  );
}

export function IconBranch({ className }: IconProps) {
  return (
    <Icon className={className}>
      <circle cx="7" cy="5" r="2.5" fill="currentColor" opacity={0.25} stroke="none" />
      <circle cx="7" cy="5" r="2.5" />
      <circle cx="7" cy="19" r="2.5" fill="currentColor" opacity={0.25} stroke="none" />
      <circle cx="7" cy="19" r="2.5" />
      <circle cx="17" cy="5" r="2.5" fill="currentColor" opacity={0.25} stroke="none" />
      <circle cx="17" cy="5" r="2.5" />
      <path d="M7 7.5v9" />
      <path d="M17 7.5c0 4-3 6.5-10 6.5" />
    </Icon>
  );
}

export function IconStar({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01Z"
        fill="currentColor"
        opacity={0.25}
        stroke="none"
      />
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01Z" />
    </Icon>
  );
}

export function IconGlobe({ className }: IconProps) {
  return (
    <Icon className={className}>
      <circle cx="12" cy="12" r="9" fill="currentColor" opacity={0.15} stroke="none" />
      <circle cx="12" cy="12" r="9" />
      <path d="M3.6 9h16.8" />
      <path d="M3.6 15h16.8" />
      <path d="M12 3a15 15 0 0 1 0 18" />
      <path d="M12 3a15 15 0 0 0 0 18" />
    </Icon>
  );
}

export function IconChevronDown({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M6 9l6 6 6-6" strokeWidth={2} />
    </Icon>
  );
}

export function IconChevronRight({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M9 6l6 6-6 6" strokeWidth={2} />
    </Icon>
  );
}

export function IconX({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M18 6L6 18M6 6l12 12" strokeWidth={2} />
    </Icon>
  );
}


export function IconServer({ className }: IconProps) {
  return (
    <Icon className={className}>
      <rect x="3" y="3" width="18" height="8" rx="2" fill="currentColor" opacity={0.2} stroke="none" />
      <rect x="3" y="3" width="18" height="8" rx="2" />
      <rect x="3" y="13" width="18" height="8" rx="2" fill="currentColor" opacity={0.2} stroke="none" />
      <rect x="3" y="13" width="18" height="8" rx="2" />
      <path d="M7 7h.01" strokeWidth={2.5} />
      <path d="M7 17h.01" strokeWidth={2.5} />
    </Icon>
  );
}

export function IconContainer({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" fill="currentColor" opacity={0.15} />
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="M3.27 6.96L12 12.01l8.73-5.05" />
      <path d="M12 22.08V12" />
    </Icon>
  );
}

export function IconCpu({ className }: IconProps) {
  return (
    <Icon className={className}>
      <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" opacity={0.2} stroke="none" />
      <rect x="6" y="6" width="12" height="12" rx="2" />
      <path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4" />
    </Icon>
  );
}

export function IconMemory({ className }: IconProps) {
  return (
    <Icon className={className}>
      <rect x="3" y="6" width="18" height="12" rx="2" fill="currentColor" opacity={0.2} stroke="none" />
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M7 6V4M12 6V4M17 6V4M7 18v2M12 18v2M17 18v2" />
      <path d="M7 10v4M12 10v4M17 10v4" />
    </Icon>
  );
}

export function IconStorage({ className }: IconProps) {
  return (
    <Icon className={className}>
      <ellipse cx="12" cy="5" rx="8" ry="3" fill="currentColor" opacity={0.2} stroke="none" />
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5" />
      <path d="M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3" />
    </Icon>
  );
}

export function IconBandwidth({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M12 2a10 10 0 0 1 10 10" fill="currentColor" opacity={0.1} />
      <path d="M12 2a10 10 0 0 0-10 10" fill="currentColor" opacity={0.1} />
      <path d="M2 12a10 10 0 0 1 20 0" />
      <path d="M12 12l4-4" strokeWidth={2} />
      <path d="M12 12v6" strokeWidth={2} />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function IconTimer({ className }: IconProps) {
  return (
    <Icon className={className}>
      <circle cx="12" cy="13" r="8" fill="currentColor" opacity={0.15} stroke="none" />
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2 2" />
      <path d="M10 2h4" />
    </Icon>
  );
}

export function IconGithub({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path
        d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.337-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836a9.571 9.571 0 0 1 2.508.338c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10Z"
        fill="currentColor"
        opacity={0.25}
      />
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.337-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836a9.571 9.571 0 0 1 2.508.338c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10Z" />
    </Icon>
  );
}

export function IconUser({ className }: IconProps) {
  return (
    <Icon className={className}>
      <circle cx="12" cy="8" r="4" fill="currentColor" opacity={0.25} />
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="8" r="4" />
    </Icon>
  );
}

export function IconMail({ className }: IconProps) {
  return (
    <Icon className={className}>
      <rect x="2" y="4" width="20" height="16" rx="2" fill="currentColor" opacity={0.25} />
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </Icon>
  );
}

export function IconChart({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M3 3v18h18" fill="none" />
      <path d="M7 16l4-8 4 4 5-9" stroke="currentColor" strokeWidth="2" fill="none" />
      <circle cx="7" cy="16" r="1.5" fill="currentColor" />
      <circle cx="11" cy="8" r="1.5" fill="currentColor" />
      <circle cx="15" cy="12" r="1.5" fill="currentColor" />
      <circle cx="20" cy="3" r="1.5" fill="currentColor" />
    </Icon>
  );
}
