'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/stores/appStore';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useAppStore((s) => s.theme);

  useEffect(() => {
    // Appliquer le thème avec data-theme comme dans l'original HTML
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.classList.add('dark');
    }
  }, [theme]);

  return <>{children}</>;
}
