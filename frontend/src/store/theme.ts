import { create } from 'zustand';

type Theme = 'dark' | 'light';

type ThemeState = {
  theme: Theme;
  toggle: () => void;
};

function applyTheme(t: Theme) {
  document.documentElement.classList.toggle('dark', t === 'dark');
  document.documentElement.style.colorScheme = t;
}

export const useTheme = create<ThemeState>((set, get) => ({
  theme: (() => {
    const saved = localStorage.getItem('mintaz.theme') as Theme | null;
    if (saved) {
      applyTheme(saved);
      return saved;
    }
    // Default to dark
    applyTheme('dark');
    return 'dark';
  })(),
  toggle: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('mintaz.theme', next);
    applyTheme(next);
    set({ theme: next });
  },
}));
