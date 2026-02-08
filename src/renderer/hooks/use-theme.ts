import { useEffect, useRef } from "react";
import type { ThemeMode } from "../../shared/config";

function applyTheme(theme: ThemeMode, systemIsDark: boolean) {
  const root = document.documentElement;
  root.dataset.theme = theme;

  if (theme === "system") {
    root.classList.toggle("system-light", !systemIsDark);
  } else {
    root.classList.remove("system-light");
  }
}

export function useTheme(theme: ThemeMode | undefined) {
  const themeRef = useRef(theme);
  themeRef.current = theme;

  // Apply theme whenever it changes
  useEffect(() => {
    if (!theme) return;
    window.voxApi.theme.getSystemDark().then((isDark) => {
      applyTheme(theme, isDark);
    });
  }, [theme]);

  // Register system theme listener once
  useEffect(() => {
    window.voxApi.theme.onSystemThemeChanged((isDark) => {
      if (themeRef.current) {
        applyTheme(themeRef.current, isDark);
      }
    });
  }, []);
}
