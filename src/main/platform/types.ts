export interface PasteOptions {
  lowercaseStart?: boolean;
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
