
export const PRESETS = {
  auto: { label: 'Auto-detect', icon: '🔎', detect: true, type: 'node', port: 3000 },

  nextjs: { label: 'Next.js', icon: '▲', type: 'node', port: 3000, install: 'npm ci', build: 'npm run build', start: 'npm run start' },
  nuxt: { label: 'Nuxt', icon: '💚', type: 'node', port: 3000, install: 'npm ci', build: 'npm run build', start: 'node .output/server/index.mjs' },
  sveltekit: { label: 'SvelteKit', icon: '🧡', type: 'node', port: 3000, install: 'npm ci', build: 'npm run build', start: 'node build' },
  remix: { label: 'Remix', icon: '💿', type: 'node', port: 3000, install: 'npm ci', build: 'npm run build', start: 'npm run start' },
  nestjs: { label: 'NestJS', icon: '🐱', type: 'node', port: 3000, install: 'npm ci', build: 'npm run build', start: 'npm run start:prod' },
  node: { label: 'Node / Express', icon: '⬡', type: 'node', port: 3000, install: 'npm ci', build: '', start: 'npm start' },

  vite: { label: 'Vite', icon: '⚡', type: 'static', port: 80, install: 'npm ci', build: 'npm run build', output: 'dist' },
  react: { label: 'Create React App', icon: '⚛️', type: 'static', port: 80, install: 'npm ci', build: 'npm run build', output: 'build' },
  vue: { label: 'Vue', icon: '🟩', type: 'static', port: 80, install: 'npm ci', build: 'npm run build', output: 'dist' },
  angular: { label: 'Angular', icon: '🅰️', type: 'static', port: 80, install: 'npm ci', build: 'npm run build', output: 'dist' },
  astro: { label: 'Astro', icon: '🚀', type: 'static', port: 80, install: 'npm ci', build: 'npm run build', output: 'dist' },
  static: { label: 'Static HTML', icon: '📄', type: 'static', port: 80, install: '', build: '', output: '.' },

  dockerfile: { label: 'Dockerfile', icon: '🐳', type: 'dockerfile', port: 3000 },
};

export function presetList() {
  return Object.entries(PRESETS).map(([id, p]) => ({
    id,
    label: p.label,
    icon: p.icon,
    type: p.type,
    port: p.port,
    install: p.install ?? '',
    build: p.build ?? '',
    start: p.start ?? '',
    output: p.output ?? '',
    detect: !!p.detect,
  }));
}

export function getPreset(id) {
  return PRESETS[id] || PRESETS.auto;
}

export function detectFramework(pkg = {}) {
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  const has = (name) => Boolean(deps[name]);
  if (has('next')) return 'nextjs';
  if (has('nuxt') || has('nuxt3')) return 'nuxt';
  if (has('@sveltejs/kit')) return 'sveltekit';
  if (has('@remix-run/react') || has('@remix-run/node')) return 'remix';
  if (has('@nestjs/core')) return 'nestjs';
  if (has('@angular/core')) return 'angular';
  if (has('astro')) return 'astro';
  if (has('react-scripts')) return 'react';
  if (has('vite')) return 'vite';
  if (has('vue')) return 'vue';
  if (pkg.scripts && pkg.scripts.start) return 'node';
  return Object.keys(deps).length ? 'node' : 'static';
}

export function translateCmd(cmd, pm) {
  if (!cmd || pm === 'npm') return cmd;
  if (pm === 'yarn') {
    return cmd
      .replace(/npm ci/g, 'yarn install --frozen-lockfile')
      .replace(/npm install/g, 'yarn install')
      .replace(/npm run /g, 'yarn ')
      .replace(/npm start/g, 'yarn start');
  }
  if (pm === 'pnpm') {
    return cmd
      .replace(/npm ci/g, 'pnpm install --frozen-lockfile')
      .replace(/npm install/g, 'pnpm install')
      .replace(/npm run /g, 'pnpm ')
      .replace(/npm start/g, 'pnpm start');
  }
  return cmd;
}
