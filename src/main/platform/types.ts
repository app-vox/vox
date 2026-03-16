import type { BrowserWindowConstructorOptions, MenuItemConstructorOptions } from "electron";

export interface PasteOptions {
  lowercaseStart?: boolean;
  shiftCapitalize?: boolean;
  finishWithPeriod?: boolean;
}

export interface PasterModule {
  isAccessibilityGranted(): boolean;
  hasFocusedElement(): boolean;
  hasActiveTextField(): boolean;
  pasteText(text: string, copyToClipboard?: boolean, options?: PasteOptions): boolean;
}

export interface PermissionsModule {
  getAccessibilityStatus(): boolean | string;
  getMicrophoneStatus(): string;
  requestMicrophoneAccess(): Promise<boolean>;
  openAccessibilitySettings(): void;
}

export interface WhisperModule {
  /** Binary filename (e.g. "whisper-cli" or "whisper-cli.exe") */
  binaryName: string;
  /** Number of threads for whisper inference */
  threads: number;
  /** CLI process timeout in ms */
  timeout: number;
  /** Resolve the effective language for transcription */
  resolveLanguage(detected: string, speechLanguages: string[]): string;
}

export interface DisplayModule {
  /** Extra BrowserWindow options for the main settings window (titlebar, frame, etc.) */
  homeWindowOptions: Partial<BrowserWindowConstructorOptions>;
  /** Extra BrowserWindow options for the HUD overlay */
  hudWindowOptions: Partial<BrowserWindowConstructorOptions>;
  /** macOS-specific app menu items (services, hide, etc.) */
  appMenuPlatformItems: MenuItemConstructorOptions[];
  /** Whether the app should intercept before-quit to support hide-on-close */
  supportsHideOnClose: boolean;
}

export interface AutostartModule {
  setEnabled(enabled: boolean): void;
  isEnabled(): boolean;
}
