import type { ReactNode } from "react";
import { useConfigStore } from "../../stores/config-store";
import type { ThemeMode } from "../../../shared/config";

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: ReactNode }[] = [
  {
    value: "light",
    label: "Light",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </svg>
    ),
  },
  {
    value: "dark",
    label: "Dark",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    ),
  },
  {
    value: "system",
    label: "System",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
  },
];

export function AppearancePanel() {
  const config = useConfigStore((s) => s.config);
  const updateConfig = useConfigStore((s) => s.updateConfig);
  const saveConfig = useConfigStore((s) => s.saveConfig);

  if (!config) return null;

  const setTheme = (theme: ThemeMode) => {
    updateConfig({ theme });
    saveConfig();
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2>Theme</h2>
        <p className="card-description">Choose your preferred appearance.</p>
      </div>
      <div className="card-body">
        <div className="theme-segmented">
          {THEME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`theme-segment ${config.theme === opt.value ? "active" : ""}`}
              onClick={() => setTheme(opt.value)}
            >
              {opt.icon}
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
