import { readFileSync } from "fs";
import { getResourcePath } from "./resources";
import { BrowserWindow, nativeTheme, screen } from "electron";
import { t } from "../shared/i18n";
import type { WidgetPosition } from "../shared/config";
import { display } from "./platform";

const CIRCLE_SIZE = 42;
const PILL_WIDTH = 360;
const PILL_HEIGHT = 32;
const MAX_PILL_WIDTH = 480;
const WIN_WIDTH = MAX_PILL_WIDTH + 40;
const WIN_HEIGHT = 120;
const DOCK_MARGIN = 24;
const MIN_SCALE = 0.55;
const TEXT_PANEL_GAP = 4;
// 3 lines at 11px/1.5 line-height + 24px vertical padding
const TEXT_PANEL_MAX_HEIGHT = 74;

const MAX_PREVIEW_WIDTH = MAX_PILL_WIDTH;

function getPreviewPanelWidth(): number {
  const display = screen.getPrimaryDisplay();
  return Math.min(Math.round(display.workArea.width * 0.3), MAX_PREVIEW_WIDTH);
}

function getExpandedWinWidth(): number {
  const panelW = getPreviewPanelWidth();
  return Math.max(WIN_WIDTH, panelW + 40);
}

function getExpandedWinHeight(): number {
  return WIN_HEIGHT + TEXT_PANEL_GAP + TEXT_PANEL_MAX_HEIGHT + 20;
}

/** Clamp x so the window (including shadow) stays within the work area */
function clampX(x: number, width: number): number {
  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const workArea = display.workArea;
  const shadowMargin = 16;
  const minX = workArea.x + shadowMargin;
  const maxX = workArea.x + workArea.width - width - shadowMargin;
  return Math.max(minX, Math.min(x, maxX));
}

export type HudState = "idle" | "initializing" | "listening" | "transcribing" | "enhancing" | "error" | "canceled" | "warning";


function getLogoDataUrl(): string {
  try {
    const logoPath = getResourcePath("logo.png");
    const buf = readFileSync(logoPath);
    return "data:image/png;base64," + buf.toString("base64");
  } catch {
    return "";
  }
}


function buildHudHtml(): string {
  const logoDataUrl = getLogoDataUrl();
  const bars = Array.from({ length: 12 }, (_, i) =>
    `<div class="bar" data-index="${i}"></div>`
  ).join("");

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  :root {
    --state-color: #888;
    /* Dark theme (default) */
    --hud-bg: rgba(25, 25, 25, 0.92);
    --hud-border: rgba(255, 255, 255, 0.08);
    --hud-border-md: rgba(255, 255, 255, 0.10);
    --hud-border-subtle: rgba(255, 255, 255, 0.05);
    --hud-text: rgba(255, 255, 255, 0.95);
    --hud-text-secondary: rgba(255, 255, 255, 0.55);
    --hud-cancel-bg: rgba(50, 50, 50, 0.95);
    --hud-cancel-border: rgba(255, 255, 255, 0.12);
    --hud-cancel-hover: rgba(239, 68, 68, 0.8);
    --hud-btn-bg: rgba(255, 255, 255, 0.12);
    --hud-btn-bg-hover: rgba(255, 255, 255, 0.18);
    --hud-hover-btn-bg: rgba(40, 40, 40, 0.95);
    --hud-hover-btn-accent: rgba(99, 102, 241, 0.8);
    --hud-error-hover: rgba(239, 68, 68, 0.8);
    --hud-text-panel-bg: rgba(24, 24, 27, 0.97);
    --hud-text-panel-border: rgba(108, 100, 160, 0.32);
    --hud-text-panel-text: rgba(255, 255, 255, 0.9);
    --hud-shadow: 0 2px 4px rgba(0,0,0,0.15), 0 4px 12px rgba(0,0,0,0.2), 0 8px 24px rgba(0,0,0,0.15);
    --hud-spinner-track: rgba(255,255,255,0.2);
    --hud-spinner-fill: rgba(255,255,255,0.85);
    --hud-bar-bg: rgba(255,255,255,0.85);
    --hud-bar-shadow: 0 0 4px rgba(255,255,255,0.5);
    --hud-cancel-hover-bg: rgba(255,255,255,0.2);
    --hud-countdown-track: rgba(255,255,255,0.08);
    --hud-logo-filter: none;
  }
  :root.light {
    /* Light theme overrides */
    --hud-bg: rgba(252, 252, 252, 0.96);
    --hud-border: rgba(0, 0, 0, 0.08);
    --hud-border-md: rgba(0, 0, 0, 0.10);
    --hud-border-subtle: rgba(0, 0, 0, 0.06);
    --hud-text: rgba(23, 23, 23, 0.95);
    --hud-text-secondary: rgba(82, 82, 82, 0.9);
    --hud-cancel-bg: rgba(245, 245, 245, 0.98);
    --hud-cancel-border: rgba(0, 0, 0, 0.12);
    --hud-cancel-hover: rgba(239, 68, 68, 0.85);
    --hud-btn-bg: rgba(0, 0, 0, 0.07);
    --hud-btn-bg-hover: rgba(0, 0, 0, 0.12);
    --hud-hover-btn-bg: rgba(245, 245, 245, 0.98);
    --hud-hover-btn-accent: rgba(79, 70, 229, 0.85);
    --hud-error-hover: rgba(239, 68, 68, 0.85);
    --hud-text-panel-bg: rgba(252, 252, 254, 0.97);
    --hud-text-panel-border: rgba(148, 142, 218, 0.22);
    --hud-text-panel-text: rgba(23, 23, 23, 0.9);
    --hud-shadow: 0 2px 8px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.04);
    --hud-spinner-track: rgba(0,0,0,0.12);
    --hud-spinner-fill: rgba(0,0,0,0.7);
    --hud-bar-bg: rgba(0,0,0,0.55);
    --hud-bar-shadow: 0 0 2px rgba(0,0,0,0.15);
    --hud-cancel-hover-bg: rgba(0,0,0,0.08);
    --hud-countdown-track: rgba(0,0,0,0.08);
    --hud-logo-filter: invert(1) brightness(0.85);
  }
  * { margin: 0; padding: 0; box-sizing: border-box; user-select: none; -webkit-user-select: none; }
  html, body {
    background: transparent;
    overflow: hidden;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .scale-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    transform-origin: center ${CIRCLE_SIZE / 2}px;
    transition: transform 0.15s ease, opacity 0.15s ease;
    position: relative;
  }

  /* ---- MORPHING WIDGET ---- */
  .widget {
    width: ${CIRCLE_SIZE}px;
    height: ${CIRCLE_SIZE}px;
    border-radius: ${CIRCLE_SIZE / 2}px;
    background: var(--hud-bg);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid var(--hud-border);
    box-shadow: var(--hud-shadow);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                height 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                border-radius 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                background 0.3s ease,
                border-color 0.3s ease,
                box-shadow 0.25s ease;
    position: relative;
    flex-shrink: 0;
    overflow: hidden;
  }
  .widget:hover {
    box-shadow: 0 2px 6px rgba(99,102,241,0.15), 0 4px 16px rgba(99,102,241,0.2);
    border-color: rgba(99,102,241,0.4);
  }
  .widget:active:not(.dragging):not(.pill) { transform: scale(0.95); }
  .widget.pill {
    width: auto;
    min-width: 140px;
    max-width: ${PILL_WIDTH}px;
    height: ${PILL_HEIGHT}px;
    border-radius: 16px;
    cursor: pointer;
    gap: 6px;
    padding: 0 12px;
    transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                min-width 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                max-width 0.2s ease,
                height 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                border-radius 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                background 0.3s ease,
                border-color 0.3s ease,
                box-shadow 0.25s ease;
  }
  .widget.pill.dragging { cursor: grabbing; }
  .widget.pill.listening {
    min-width: 115px;
    background: var(--hud-bg);
    border-color: var(--hud-border-md);
    box-shadow: 0 2px 4px rgba(0,0,0,0.15), 0 4px 12px rgba(0,0,0,0.2);
    cursor: pointer;
    overflow: visible;
    transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                min-width 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                height 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                border-radius 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                background 0.35s ease,
                border-color 0.35s ease,
                box-shadow 0.35s ease;
  }
  .widget.pill.listening:hover {
    background: rgba(220, 50, 50, 0.92);
    border-color: rgba(255,255,255,0.25);
    box-shadow: 0 2px 8px rgba(220,50,50,0.3), 0 4px 20px rgba(220,50,50,0.2);
  }
  .widget.pill.listening .pill-stop { order: 10; color: var(--hud-text); }
  .widget.pill.listening:active:not(.dragging) { transform: scale(0.94); }
  .widget.pill.listening:hover .pill-stop { background: rgba(255,255,255,0.15); color: #fff; }
  .widget.pill.listening .bar {
    background: rgba(255,68,68,0.85) !important;
    box-shadow: 0 0 4px rgba(255,68,68,0.5) !important;
    transition: background 0.35s ease, box-shadow 0.35s ease, height 0.05s ease;
  }
  .widget.pill.listening:hover .bar {
    background: rgba(255,255,255,0.9) !important;
    box-shadow: 0 0 4px rgba(255,255,255,0.4) !important;
  }
  .widget.pill.listening .pill-cancel {
    position: absolute;
    right: -32px;
    top: 50%;
    transform: translateY(-50%);
    margin-left: 0;
    width: 22px; height: 22px;
    background: var(--hud-cancel-bg);
    border: 1px solid var(--hud-cancel-border);
    color: var(--hud-text);
  }
  .widget.pill.listening .pill-cancel:hover {
    background: var(--hud-cancel-hover);
    color: white;
  }
  .widget.pill.listening .pill-cancel:active {
    transform: translateY(-50%) scale(0.92);
  }
  .widget.pill.transcribing,
  .widget.pill.enhancing {
    background: var(--hud-bg);
    border-color: var(--hud-border-md);
    box-shadow: 0 2px 4px rgba(0,0,0,0.15), 0 4px 12px rgba(0,0,0,0.2);
    cursor: pointer;
    overflow: visible;
  }
  .widget.pill.transcribing .pill-cancel,
  .widget.pill.enhancing .pill-cancel {
    position: absolute;
    right: -32px;
    top: 50%;
    transform: translateY(-50%);
    margin-left: 0;
    width: 22px; height: 22px;
    background: var(--hud-cancel-bg);
    border: 1px solid var(--hud-cancel-border);
    color: var(--hud-text);
  }
  .widget.pill.transcribing .pill-cancel:hover,
  .widget.pill.enhancing .pill-cancel:hover {
    background: var(--hud-cancel-hover);
    color: white;
  }
  .widget.pill.transcribing .pill-cancel:active,
  .widget.pill.enhancing .pill-cancel:active {
    transform: translateY(-50%) scale(0.92);
  }
  .widget.pill.error, .widget.pill.canceled {
    background: var(--hud-bg);
    border-color: var(--hud-border-md);
    box-shadow: 0 2px 4px rgba(0,0,0,0.15), 0 4px 12px rgba(0,0,0,0.2);
    cursor: pointer;
  }
  .widget.pill.initializing {
    min-width: 115px;
    background: var(--hud-bg);
    border-color: var(--hud-border-md);
    cursor: pointer;
  }
  .widget.highlight {
    border-color: rgba(99,102,241,0.6);
    box-shadow: 0 0 0 2px rgba(99,102,241,0.3), 0 4px 16px rgba(0,0,0,0.3);
  }

  /* ---- CIRCLE MODE ICONS ---- */
  .circle-content {
    display: flex;
    align-items: center;
    justify-content: center;
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    transition: opacity 0.2s ease;
  }
  .circle-content.off { opacity: 0; pointer-events: none; }
  .icon {
    display: flex; align-items: center; justify-content: center;
    position: absolute; top: 0; left: 0; right: 0; bottom: 0;
    transition: opacity 0.35s ease, filter 0.35s ease, transform 0.35s ease;
    filter: blur(0px);
  }
  .icon.off { opacity: 0; pointer-events: none; filter: blur(3px); transform: scale(0.85); }
  .v-logo img { width: 18px; height: 18px; object-fit: contain; filter: var(--hud-logo-filter); }
  .mic-icon { color: var(--hud-text); }
  .mic-icon svg { width: 16px; height: 16px; }
  .mic-icon.off { filter: blur(3px); transform: scale(1.1); }

  /* ---- PILL MODE CONTENT ---- */
  .pill-content {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    padding: 0 12px;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.15s ease 0.1s;
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif;
    color: var(--hud-text);
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.1px;
    white-space: nowrap;
  }
  .pill-content.on { opacity: 1; pointer-events: auto; }
  .hidden { display: none !important; }
  .shift-icon {
    display: flex;
    align-items: center;
    color: var(--hud-text-secondary);
    flex-shrink: 0;
    width: 0;
    opacity: 0;
    overflow: hidden;
    transition: width 0.2s ease, opacity 0.2s ease, margin 0.2s ease;
    margin-left: 0;
  }
  .shift-icon.visible {
    width: 14px;
    opacity: 1;
    margin-left: 4px;
  }
  .widget.pill.shift-expanded {
    max-width: ${PILL_WIDTH + 20}px;
  }
  .spinner {
    width: 12px; height: 12px;
    border: 2px solid var(--hud-spinner-track);
    border-top-color: var(--hud-spinner-fill);
    border-radius: 50%;
    flex-shrink: 0;
    animation: spin 0.8s linear infinite;
  }
  .waveform {
    display: flex;
    align-items: center;
    gap: 2px;
    height: 16px;
  }
  .bar {
    width: 3px;
    min-height: 3px;
    height: 3px;
    border-radius: 1.5px;
    background: var(--hud-bar-bg);
    box-shadow: var(--hud-bar-shadow);
    transition: height 0.05s ease;
  }
  .dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .x-icon { flex-shrink: 0; }
  #pill-label { flex-shrink: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
  #pill-label.clickable {
    cursor: pointer;
  }
  .pill-cancel {
    pointer-events: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px; height: 18px;
    border-radius: 50%;
    border: none;
    background: transparent;
    color: var(--hud-text-secondary);
    cursor: pointer;
    transition: background 0.2s ease, color 0.2s ease;
    flex-shrink: 0;
    margin-left: 2px;
  }
  .pill-cancel:hover { background: var(--hud-cancel-hover-bg); color: var(--hud-text); }
  .pill-copy {
    pointer-events: auto;
    display: flex;
    align-items: center;
    gap: 4px;
    border: none;
    background: var(--hud-btn-bg);
    color: var(--hud-text);
    cursor: pointer;
    border-radius: 4px;
    padding: 2px 7px;
    font-size: 11px;
    font-weight: 500;
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;
    white-space: nowrap;
    flex-shrink: 0;
    margin-left: 4px;
    transition: background 0.15s ease, color 0.15s ease;
  }
  .pill-copy:hover { background: var(--hud-btn-bg-hover); color: var(--hud-text); }
  .pill-copy:active { transform: scale(0.95); }
  .pill-copy.hidden { display: none; }
  .pill-copy svg { flex-shrink: 0; }
  .pill-stop {
    pointer-events: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px; height: 16px;
    border-radius: 50%;
    border: none;
    background: transparent;
    color: rgba(255,68,68,0.85);
    flex-shrink: 0;
    cursor: pointer;
    transition: background 0.15s ease;
  }
  .pill-stop svg { width: 10px; height: 10px; }
  .anim-pulse { animation: pulse 1s ease-in-out infinite; }
  .anim-glow-icon { animation: glowIcon 1.5s ease-in-out infinite; }
  @keyframes vanish {
    0% { transform: scale(1); opacity: 1; filter: blur(0px); }
    60% { transform: scale(0.8); opacity: 0.5; filter: blur(2px); }
    100% { transform: scale(0.3); opacity: 0; filter: blur(6px); }
  }
  .scale-wrapper.vanishing {
    animation: vanish 0.35s ease-out forwards;
    pointer-events: none;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pulse {
    0%, 100% { transform: scale(1); box-shadow: 0 0 6px var(--state-color); }
    50% { transform: scale(0.6); box-shadow: 0 0 14px var(--state-color), 0 0 24px var(--state-color); }
  }
  @keyframes glowIcon {
    0%, 100% { filter: drop-shadow(0 0 8px var(--state-color)); }
    50% { filter: drop-shadow(0 0 16px var(--state-color)); }
  }

  .attention-overlay {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 42px;
    height: 42px;
    transform: translate(-50%, -50%) scale(1);
    border-radius: 50%;
    background: radial-gradient(circle, rgba(99,102,241,0.8) 0%, rgba(99,102,241,0.35) 40%, transparent 70%);
    pointer-events: none;
    opacity: 0;
    z-index: 0;
  }
  .attention-overlay.active {
    animation: hudAttention 1.2s ease-out forwards;
  }
  @keyframes hudAttention {
    0%   { transform: translate(-50%, -50%) scale(8); opacity: 0.9; }
    80%  { transform: translate(-50%, -50%) scale(1); opacity: 0.6; }
    100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
  }

  /* ---- SATELLITE BUTTONS (hover actions) ---- */
  .hover-btn {
    position: absolute;
    width: 18px; height: 18px; border-radius: 50%;
    background: var(--hud-hover-btn-bg);
    border: 1px solid var(--hud-cancel-border);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    opacity: 0; pointer-events: none;
    transform: translate(0, 0) scale(0.6);
    transition: opacity 0.2s ease, background 0.15s ease, transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
    z-index: 10;
  }
  .hover-btn:active { transform: translate(var(--tx, 0), var(--ty, 0)) scale(0.85) !important; }
  .hover-btn.visible {
    opacity: 1; pointer-events: auto;
    transform: translate(var(--tx, 0), var(--ty, 0)) scale(1);
  }
  .hover-btn svg { width: 10px; height: 10px; }
  .hover-btn { color: var(--hud-text); }

  /* Positions relative to widget center (top of scale-wrapper) */
  .settings-btn { --tx: 26px; --ty: -24px; top: ${CIRCLE_SIZE / 2}px; left: 50%; margin-top: -9px; margin-left: -9px; }
  .settings-btn.visible { transition-delay: 0ms; }
  .settings-btn:hover { background: var(--hud-hover-btn-accent); color: #fff; }

  .transcriptions-btn { --tx: -26px; --ty: 20px; top: ${CIRCLE_SIZE / 2}px; left: 50%; margin-top: -9px; margin-left: -9px; transition-delay: 0ms; }
  .transcriptions-btn.visible { transition-delay: 60ms; }
  .transcriptions-btn:hover { background: var(--hud-hover-btn-accent); color: #fff; }

  .close-btn { --tx: 26px; --ty: 20px; top: ${CIRCLE_SIZE / 2}px; left: 50%; margin-top: -9px; margin-left: -9px; }
  .close-btn:hover { background: var(--hud-error-hover); }
  .close-btn.visible { transition-delay: 120ms; }

  /* Cancel button (below widget during idle+listening transition) */
  .circle-cancel {
    position: absolute;
    top: ${CIRCLE_SIZE + 6}px; left: 50%;
    margin-left: -11px;
    width: 22px; height: 22px; border-radius: 50%;
    background: var(--hud-cancel-bg);
    border: 1px solid var(--hud-cancel-border);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    transition: background 0.15s ease, opacity 0.15s ease;
    opacity: 0; pointer-events: none;
    z-index: 10;
  }
  .circle-cancel:hover { background: #ff4444; border-color: rgba(239,68,68,0.5); }
  .circle-cancel { color: var(--hud-text); }
  .circle-cancel svg { width: 10px; height: 10px; }
  .circle-cancel.visible { opacity: 1; pointer-events: auto; }

  /* Undo bar (below widget during graceful cancel) */
  .undo-bar {
    display: flex; align-items: center; gap: 0;
    margin-top: 0;
    height: 0;
    overflow: hidden;
    opacity: 0; pointer-events: none;
    transition: opacity 0.2s ease, height 0.2s ease, margin-top 0.2s ease;
    flex-shrink: 0;
    background: var(--hud-bg);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid var(--hud-border);
    border-radius: 10px;
    padding: 4px 4px 4px 10px;
    box-shadow: var(--hud-shadow);
  }
  .undo-bar.visible { opacity: 1; pointer-events: auto; height: auto; margin-top: 6px; overflow: visible; }
  .undo-bar .countdown-track {
    width: 96px; height: 3px;
    background: var(--hud-countdown-track);
    border-radius: 1px;
    overflow: hidden;
    flex-shrink: 0;
  }
  .undo-bar .countdown-fill {
    height: 100%; width: 100%;
    background: rgba(251, 191, 36, 0.7);
    border-radius: 1px;
  }
  .undo-bar .undo-btn {
    display: flex; align-items: center; gap: 3px;
    background: var(--hud-btn-bg);
    border: none;
    border-radius: 7px;
    color: var(--hud-text);
    font-size: 11px; font-weight: 500;
    padding: 3px 7px 3px 6px;
    margin-left: 6px;
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease;
    line-height: 1;
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif;
    letter-spacing: 0.1px;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .undo-bar .undo-btn:hover { background: var(--hud-btn-bg-hover); color: var(--hud-text); }
  .undo-bar .undo-btn:active { transform: scale(0.95); }
  .undo-bar .undo-btn svg { flex-shrink: 0; }

  /* Text panel */
  .text-panel {
    display: none;
    margin-top: ${TEXT_PANEL_GAP}px;
    background: var(--hud-text-panel-bg);
    border: 1px solid var(--hud-text-panel-border);
    border-radius: 12px;
    padding: 0;
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.4s cubic-bezier(0.4,0,0.2,1),
                border-color 0.4s ease;
    box-shadow: var(--hud-shadow);
    -webkit-backdrop-filter: blur(20px);
    backdrop-filter: blur(20px);
    position: relative;
  }
  .text-panel.visible {
    display: flex;
    flex-direction: column;
    padding: 8px 0 12px 0;
    max-height: ${TEXT_PANEL_MAX_HEIGHT}px;
    overflow: hidden;
    animation: tpAppear 250ms ease forwards;
  }
  .text-panel.morph-border {
    border-color: rgba(99,102,241,0.4);
  }
  .tp-scroll {
    flex: 1;
    overflow-y: auto;
    padding: 0 38px 0 16px;
  }
  .tp-scroll::-webkit-scrollbar { width: 3px; }
  .tp-scroll::-webkit-scrollbar-thumb { background: var(--hud-btn-bg); border-radius: 2px; }

  .text-content {
    font-size: 11px;
    line-height: 1.5;
    color: var(--hud-text-panel-text);
    font-family: -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
    transition: filter 0.25s ease, opacity 0.25s ease;
  }
  .text-content.swapping {
    filter: blur(3px);
    opacity: 0.3;
  }

  .text-content .word {
    display: inline;
    transition: opacity 0.3s ease, filter 0.3s ease, transform 0.3s ease, color 0.5s ease;
  }
  .text-content .word.appearing {
    animation: wordAppear 0.2s ease forwards;
  }

  @keyframes wordAppear {
    0% { opacity: 0; transform: translateY(4px); }
    100% { opacity: 1; transform: translateY(0); }
  }

  @keyframes tpAppear {
    from { opacity: 0; transform: translateY(4px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  @keyframes tpHide {
    from { opacity: 1; transform: translateY(0); }
    to   { opacity: 0; transform: translateY(-48px); }
  }
  .text-panel.hiding {
    display: flex;
    flex-direction: column;
    padding: 8px 0 12px 0;
    max-height: ${TEXT_PANEL_MAX_HEIGHT}px;
    overflow: hidden;
    animation: tpHide 180ms ease forwards;
    pointer-events: none;
  }

  .tp-mic {
    display: inline-flex;
    align-items: center;
    vertical-align: middle;
    margin-left: 3px;
    opacity: 0.6;
    color: var(--hud-text-panel-text);
    animation: micBreathe 1.6s ease-in-out infinite;
  }
  .tp-mic.hidden { display: none; }
  .tp-mic.no-anim { animation: none; }
  .tp-mic svg { width: 11px; height: 11px; }

  .tp-close {
    position: absolute;
    top: 7px; right: 7px;
    background: none; border: none; padding: 5px 7px;
    font-size: 16px; line-height: 1;
    color: rgba(255,255,255,0.35);
    cursor: pointer;
    border-radius: 6px;
    transition: color 0.15s ease, background 0.15s ease, transform 0.1s ease;
    z-index: 1;
  }
  .tp-close:hover {
    color: rgba(255,255,255,0.9);
    background: rgba(255,255,255,0.12);
    transform: scale(1.12);
  }
  .tp-restore {
    position: absolute;
    left: -32px; top: 50%;
    transform: translateY(-50%);
    width: 22px; height: 22px;
    background: rgba(50, 50, 50, 0.95);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 50%;
    color: rgba(255,255,255,0.7);
    display: none;
    align-items: center; justify-content: center;
    cursor: pointer;
    padding: 0;
    transition: background 0.15s ease, color 0.15s ease, transform 0.15s ease;
    z-index: 10;
  }
  .tp-restore.visible { display: flex; }
  .tp-restore:hover { background: rgba(99,102,241, 0.8); color: white; transform: translateY(-50%) scale(1.1); }
  .tp-restore:active { transform: translateY(-50%) scale(0.96); background: rgba(79,70,229, 0.9); color: white; border-color: rgba(99,102,241, 0.4); }
  .tp-restore.active { background: rgba(79,70,229, 0.9); color: white; border-color: rgba(99,102,241, 0.4); }
  .tp-restore.active:hover { background: rgba(67,56,202, 0.95); border-color: rgba(99,102,241, 0.5); }
  :root.light .tp-restore { background: rgba(240,240,245,0.95); border-color: rgba(0,0,0,0.12); color: rgba(0,0,0,0.6); }
  :root.light .tp-restore:hover { background: rgba(99,102,241, 0.85); color: white; }
  :root.light .tp-restore.active { background: rgba(79,70,229, 0.9); border-color: rgba(99,102,241,0.4); color: white; }
  :root.light .tp-restore.active:hover { background: rgba(67,56,202, 0.95); }

  @keyframes micBreathe {
    0%, 100% { opacity: 0.4; transform: scale(0.92); }
    50% { opacity: 0.75; transform: scale(1.05); }
  }

  .tp-pen {
    display: inline-flex;
    align-items: center;
    vertical-align: middle;
    position: relative;
    top: -3px;
    margin-left: -2px;
    opacity: 0.65;
    color: var(--hud-text-panel-text);
    animation: penWrite 0.55s ease-in-out infinite;
    transform-origin: bottom center;
  }
  .tp-pen.hidden { display: none; }
  .tp-pen.no-anim { animation: none; }
  .tp-pen svg { width: 10px; height: 10px; }
  @keyframes penWrite {
    0%   { transform: rotate(-10deg) translate(0, 1px); }
    40%  { transform: rotate(2deg) translate(1px, -1px); }
    70%  { transform: rotate(-5deg) translate(0px, 0px); }
    100% { transform: rotate(-10deg) translate(0, 1px); }
  }

  .text-content.enhancing {
    filter: blur(4px);
    opacity: 0.5;
    transition: filter 0.4s ease, opacity 0.4s ease;
  }
  .text-content .word.shuffling {
    display: inline-block;
    animation: wordShuffle 1.2s ease-in-out infinite;
  }
  @keyframes wordShuffle {
    0%, 100% { transform: translateY(0) translateX(0); }
    25% { transform: translateY(-2px) translateX(1px); }
    50% { transform: translateY(1px) translateX(-1px); }
    75% { transform: translateY(-1px) translateX(2px); }
  }
</style></head>
<body>
<div class="scale-wrapper" id="scale-wrapper">
  <div class="attention-overlay" id="attention-overlay"></div>
  <div class="widget" id="widget" role="button" tabindex="0">
    <!-- Circle mode icons -->
    <div class="circle-content" id="circle-content">
      <div class="icon v-logo" id="v-logo"><img src="${logoDataUrl}" alt="Vox" draggable="false" /></div>
      <div class="icon mic-icon off" id="mic-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg></div>
    </div>

    <!-- Pill mode content -->
    <div class="pill-content" id="pill-content">
      <div class="pill-stop hidden" id="pill-stop" onclick="event.stopPropagation(); window.electronAPI?.hudStopRecording()">
        <svg viewBox="0 0 10 10" fill="currentColor"><rect x="2" y="2" width="6" height="6" rx="1"/></svg>
      </div>
      <div class="spinner hidden" id="spinner"></div>
      <div class="waveform hidden" id="waveform">${bars}</div>
      <div class="dot hidden" id="dot"></div>
      <svg class="x-icon hidden" id="x-icon" width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path id="x-path" d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span class="hidden" id="pill-label"></span>
      <span class="shift-icon" id="shift-icon"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3L4 13h4v6h8v-6h4L12 3z"/></svg></span>
      <button class="pill-copy hidden" id="pill-copy" onclick="event.stopPropagation(); window.electronAPI?.hudCopyLatest()">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        <span id="copy-label"></span>
      </button>
      <button class="pill-cancel" id="pill-cancel" style="display:none" onclick="event.stopPropagation(); window.electronAPI?.cancelRecording()">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M8 2L2 8M2 2L8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
      </button>
    </div>
    <button class="tp-restore" id="tp-restore" title="${t("hud.restorePreview")}" onclick="event.stopImmediatePropagation(); tpTogglePreview()"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="3" y1="7" x2="21" y2="7"/><line x1="3" y1="12" x2="17" y2="12"/><line x1="3" y1="17" x2="13" y2="17"/></svg></button>
  </div>
  <!-- Satellite hover buttons (siblings of widget, inside scale-wrapper for z-index) -->
  <div class="hover-btn close-btn" id="close-btn" onclick="event.stopPropagation(); if (recentDragEnd || wasDragged) return; var sw = document.getElementById('scale-wrapper'); sw.classList.add('vanishing'); setTimeout(function() { window.electronAPI?.hudDisable(); }, 350);">
    <svg viewBox="0 0 10 10" fill="none"><path d="M2 3h6M3.5 3V2.2a.5.5 0 01.5-.5h2a.5.5 0 01.5.5V3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><path d="M7.5 3.5l-.3 4.3a.8.8 0 01-.8.7h-2.8a.8.8 0 01-.8-.7L2.5 3.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
  </div>
  <div class="hover-btn transcriptions-btn" id="transcriptions-btn" onclick="event.stopPropagation(); if (recentDragEnd || wasDragged) return; window.electronAPI?.hudOpenTranscriptions()">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
  </div>
  <div class="hover-btn settings-btn" id="settings-btn" onclick="event.stopPropagation(); if (recentDragEnd || wasDragged) return; window.electronAPI?.hudOpenSettings()">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
  </div>
  <div class="circle-cancel" id="circle-cancel" onclick="event.stopPropagation(); window.electronAPI?.cancelRecording()">
    <svg viewBox="0 0 10 10" fill="none"><path d="M8 2L2 8M2 2L8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
  </div>
  <div class="undo-bar" id="undo-bar">
    <div class="countdown-track"><div class="countdown-fill" id="countdown-fill"></div></div>
    <button class="undo-btn" id="undo-btn" onclick="event.stopPropagation(); window.electronAPI?.undoCancelRecording()"><svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M2 2l4 4M6 2l-4 4" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/></svg><span id="undo-label">Undo</span></button>
  </div>
  <div class="text-panel" id="text-panel">
    <button class="tp-close" id="tp-close" title="${t("hud.closePreview")}" onclick="event.stopPropagation(); tpDismissForSession()">×</button>
    <div class="tp-scroll" id="tp-scroll">
      <div class="text-content" id="text-content"></div>
      <span class="tp-mic hidden" id="tp-mic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg></span>
      <span class="tp-pen hidden" id="tp-pen"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg></span>
    </div>
  </div>
</div>
<script>
var currentState = 'idle';
var alwaysShow = true;
var showActions = true;
var hoverActionsTimer = null;
var isMouseOver = false;
var isDragging = false;
var wasDragged = false;
var dragStartX = 0;
var dragStartY = 0;

var widget = document.getElementById('widget');
var circleContent = document.getElementById('circle-content');
var pillContent = document.getElementById('pill-content');
var recentDragEnd = false;

var interactiveEls = document.querySelectorAll('.widget, .hover-btn, .pill-cancel, .pill-copy, .pill-stop, .circle-cancel, .undo-bar, .undo-btn, .text-panel, .tp-restore');
var ignoreDisabled = false;
interactiveEls.forEach(function(el) {
  el.addEventListener('mouseenter', function() {
    ignoreDisabled = true;
    window.electronAPI?.setIgnoreMouseEvents(false);
  });
  el.addEventListener('mouseleave', function() {
    if (isDragging) return;
    if (currentState !== 'idle' && currentState !== 'transcribing' && currentState !== 'enhancing') return;
    ignoreDisabled = false;
    window.electronAPI?.setIgnoreMouseEvents(true);
  });
});
document.addEventListener('click', function(e) {
  if (!e.target.closest('.widget, .hover-btn, .pill-cancel, .pill-copy, .pill-stop, .circle-cancel, .undo-bar, .undo-btn')) {
    if (ignoreDisabled) {
      ignoreDisabled = false;
      window.electronAPI?.setIgnoreMouseEvents(true);
    }
  }
}, true);

/* ---- Drag handling ---- */
widget.addEventListener('mousedown', function(e) {
  if (document.getElementById('undo-bar').classList.contains('visible')) return;
  if (e.target.closest('.hover-btn') || e.target.closest('.pill-cancel') || e.target.closest('.pill-copy') || e.target.closest('.pill-stop')) return;
  isDragging = false;
  wasDragged = false;
  dragStartX = e.screenX;
  dragStartY = e.screenY;
  var onMove = function(ev) {
    var dx = ev.screenX - dragStartX;
    var dy = ev.screenY - dragStartY;
    if (!isDragging && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
      isDragging = true;
      wasDragged = true;
      widget.classList.add('dragging');
      clearHoverActions();
    }
    if (isDragging) {
      dragStartX = ev.screenX;
      dragStartY = ev.screenY;
      window.electronAPI?.hudDrag(dx, dy);
    }
  };
  var onUp = function() {
    if (isDragging) {
      isDragging = false;
      widget.classList.remove('dragging');
      window.electronAPI?.hudDragEnd();
      recentDragEnd = true;
      setTimeout(function() { recentDragEnd = false; }, 200);
    }
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  };
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
});

/* ---- Click handling ---- */
widget.addEventListener('click', function(e) {
  if (e.target.closest('.hover-btn') || e.target.closest('.pill-cancel') || e.target.closest('.pill-copy') || e.target.closest('.pill-stop')) return;
  if (wasDragged) { wasDragged = false; return; }
  var isCircle = !widget.classList.contains('pill');
  if (isCircle) {
    if (currentState !== 'idle') return;
    clearHoverActions();
    window.electronAPI?.hudStartRecording();
  }
  if (!isCircle && currentState === 'listening') {
    window.electronAPI?.hudStopRecording();
  }
  if (!isCircle && currentState === 'canceled' && document.getElementById('undo-bar').classList.contains('visible')) {
    window.electronAPI?.cancelRecording();
    return;
  }
  if (!isCircle && (currentState === 'error' || currentState === 'canceled')) {
    window.electronAPI?.hudDismiss();
  }
});

/* ---- Logo <-> mic crossfade on hover (idle circle only) ---- */
widget.addEventListener('mouseenter', function() {
  if (currentState === 'idle' && !widget.classList.contains('pill')) {
    document.getElementById('v-logo').classList.add('off');
    document.getElementById('mic-icon').classList.remove('off');
  }
});
widget.addEventListener('mouseleave', function() {
  if (currentState === 'idle' && !widget.classList.contains('pill')) {
    document.getElementById('v-logo').classList.remove('off');
    document.getElementById('mic-icon').classList.add('off');
  }
});

/* ---- Body-level hover for satellite buttons ---- */
document.body.addEventListener('mouseenter', function() {
  isMouseOver = true;
  if (currentState === 'idle' && alwaysShow && showActions) startHoverActionsTimer();
});
document.body.addEventListener('mouseleave', function() {
  isMouseOver = false;
  clearHoverActions();
  if (currentState === 'idle' && !widget.classList.contains('pill')) {
    document.getElementById('v-logo').classList.remove('off');
    document.getElementById('mic-icon').classList.add('off');
  }
});

function showSideButtons() {
  document.getElementById('transcriptions-btn').classList.add('visible');
  document.getElementById('settings-btn').classList.add('visible');
  document.getElementById('close-btn').classList.add('visible');
}
function hideSideButtons() {
  document.getElementById('transcriptions-btn').classList.remove('visible');
  document.getElementById('settings-btn').classList.remove('visible');
  document.getElementById('close-btn').classList.remove('visible');
}
function startHoverActionsTimer() {
  clearHoverActions();
  hoverActionsTimer = setTimeout(function() {
    if (currentState === 'idle' && isMouseOver && !isDragging && alwaysShow && showActions) showSideButtons();
  }, 1000);
}
function clearHoverActions() {
  if (hoverActionsTimer) { clearTimeout(hoverActionsTimer); hoverActionsTimer = null; }
  hideSideButtons();
}

/* ---- Scale & blur for hover tracking ---- */
function setBlur(px) {
  var img = document.querySelector('#v-logo img');
  if (img) img.style.filter = px > 0 ? 'blur(' + px + 'px)' : 'none';
}
function setScale(factor) {
  var wrapper = document.getElementById('scale-wrapper');
  wrapper.style.transform = 'scale(' + factor + ')';
  wrapper.style.opacity = factor < 0.7 ? 0.4 + (factor - 0.55) / 0.15 * 0.6 : 1;
  var blurPx = factor >= 0.95 ? 0 : Math.round((1.0 - factor) / (1.0 - 0.55) * 4);
  setBlur(blurPx);
}

/* ---- Pill mode helpers ---- */
function setPillMode(cfg) {
  document.documentElement.style.setProperty('--state-color', cfg.color);

  ['spinner','waveform','dot','x-icon','pill-stop'].forEach(function(id) {
    document.getElementById(id).classList.add('hidden');
  });

  var el = document.getElementById(cfg.icon);
  if (el) el.classList.remove('hidden');

  if (cfg.showStop) {
    document.getElementById('pill-stop').classList.remove('hidden');
  }

  var dot = document.getElementById('dot');
  dot.style.background = cfg.color;
  dot.style.boxShadow = '0 0 8px ' + cfg.color;
  dot.className = cfg.icon === 'dot'
    ? 'dot' + (cfg.animation === 'pulse' ? ' anim-pulse' : '')
    : 'dot hidden';

  var xi = document.getElementById('x-icon');
  var xpath = xi.querySelector('path');
  if (xpath) xpath.setAttribute('stroke', cfg.color);
  xi.style.filter = 'drop-shadow(0 0 8px ' + cfg.color + ')';
  if (cfg.icon === 'x-icon') {
    xi.className = 'x-icon' + (cfg.animation === 'glow' ? ' anim-glow-icon' : '');
  } else {
    xi.className = 'x-icon hidden';
  }

  var barColor = cfg.barColor || '';
  var barShadow = cfg.barShadow || '';
  document.querySelectorAll('.bar').forEach(function(bar) {
    bar.style.background = barColor;
    bar.style.boxShadow = barShadow;
    bar.style.height = '3px';
  });

  var label = document.getElementById('pill-label');
  if (cfg.showLabel && cfg.labelText) {
    label.textContent = cfg.labelText;
    label.classList.remove('hidden');
  } else {
    label.textContent = '';
    label.classList.add('hidden');
  }

  var cb = document.getElementById('pill-cancel');
  cb.style.display = cfg.showCancel ? 'flex' : 'none';

  var copyBtn = document.getElementById('pill-copy');
  if (cfg.showCopy && cfg.copyText) {
    document.getElementById('copy-label').textContent = cfg.copyText;
    copyBtn.classList.remove('hidden');
  } else {
    copyBtn.classList.add('hidden');
  }
}

function autoSizePill() {
  var label = document.getElementById('pill-label');
  if (!label || label.classList.contains('hidden')) return;
  var measure = document.createElement('span');
  measure.style.cssText = 'position:fixed;top:-9999px;left:-9999px;white-space:nowrap;font-family:-apple-system,BlinkMacSystemFont,SF Pro Display,sans-serif;font-size:12px;font-weight:500;letter-spacing:0.1px;visibility:hidden;';
  measure.textContent = label.textContent;
  document.body.appendChild(measure);
  var copyBtn = document.getElementById('pill-copy');
  var copyMeasure = null;
  if (copyBtn && !copyBtn.classList.contains('hidden')) {
    copyMeasure = document.createElement('span');
    copyMeasure.style.cssText = measure.style.cssText + 'font-size:11px;';
    copyMeasure.textContent = document.getElementById('copy-label').textContent;
    document.body.appendChild(copyMeasure);
  }
  requestAnimationFrame(function() {
    var textWidth = measure.offsetWidth;
    measure.remove();
    var copyWidth = 0;
    if (copyMeasure) {
      copyWidth = copyMeasure.offsetWidth + 30;
      copyMeasure.remove();
    }
    var needed = textWidth + copyWidth + 64;
    widget.style.minWidth = Math.min(Math.max(needed, 140), ${MAX_PILL_WIDTH}) + 'px';
  });
}

/* ---- Hover-pause for error/warning flash timer ---- */
var flashHoverActive = false;
function onFlashHoverEnter() { window.electronAPI?.pauseFlashTimer(); }
function onFlashHoverLeave() { window.electronAPI?.resumeFlashTimer(); }
function startFlashHoverTracking() {
  if (flashHoverActive) return;
  flashHoverActive = true;
  widget.addEventListener('mouseenter', onFlashHoverEnter);
  widget.addEventListener('mouseleave', onFlashHoverLeave);
}
function stopFlashHoverTracking() {
  if (!flashHoverActive) return;
  flashHoverActive = false;
  widget.removeEventListener('mouseenter', onFlashHoverEnter);
  widget.removeEventListener('mouseleave', onFlashHoverLeave);
}

/* ---- Main state setter (called from main process) ---- */
function setState(newState, cfg) {
  var prevState = currentState;
  currentState = newState;
  clearHoverActions();
  stopCountdown();
  if (newState !== 'transcribing' && newState !== 'enhancing') setShiftHeld(false);

  // Hide restore button and text panel when transitioning out of recording states
  if (newState !== 'listening' && newState !== 'transcribing' && newState !== 'enhancing') {
    hideRestoreBtn();
    if (tpPanel.classList.contains('visible') || tpPanel.classList.contains('hiding')) {
      doHideTextPanel(true);
    }
  } else {
    // During recording states, show toggle button if panel is not visible
    updatePreviewToggleState();
  }

  var isIdle = newState === 'idle';
  var isPill = !isIdle;
  var wasInPill = prevState !== 'idle';

  if (isIdle && wasInPill) {
    pillContent.classList.remove('on');
    setTimeout(function() {
      if (currentState !== 'idle') return;
      widget.className = 'widget';
      widget.style.minWidth = '';
      circleContent.classList.remove('off');
      if (isMouseOver && alwaysShow) {
        document.getElementById('v-logo').classList.add('off');
        document.getElementById('mic-icon').classList.remove('off');
        if (showActions) startHoverActionsTimer();
      } else {
        document.getElementById('v-logo').classList.remove('off');
        document.getElementById('mic-icon').classList.add('off');
      }
    }, 150);
  } else {
    widget.className = 'widget' + (isPill ? ' pill ' + newState : '');
    circleContent.classList.toggle('off', isPill);
    pillContent.classList.toggle('on', isPill);

    if (isPill && cfg.mode) setPillMode(cfg.mode);

    if (isIdle && isMouseOver && alwaysShow) {
      document.getElementById('v-logo').classList.add('off');
      document.getElementById('mic-icon').classList.remove('off');
      if (showActions) startHoverActionsTimer();
    } else if (isIdle) {
      document.getElementById('v-logo').classList.remove('off');
      document.getElementById('mic-icon').classList.add('off');
    }
  }

  var interactivePill = isPill && newState !== 'transcribing' && newState !== 'enhancing';
  if (interactivePill) {
    ignoreDisabled = true;
    window.electronAPI?.setIgnoreMouseEvents(false);
  } else if (isPill) {
    ignoreDisabled = false;
    window.electronAPI?.setIgnoreMouseEvents(true);
  } else if (isIdle && !isMouseOver) {
    ignoreDisabled = false;
    window.electronAPI?.setIgnoreMouseEvents(true);
  }

  // Warning state: click pill to open transcriptions
  var pillLabel = document.getElementById('pill-label');
  if (newState === 'warning') {
    widget.onclick = function(e) {
      if (wasDragged) { wasDragged = false; return; }
      e.stopPropagation();
      window.electronAPI?.hudOpenTranscriptions();
    };
    widget.style.cursor = 'pointer';
    if (pillLabel) pillLabel.classList.add('clickable');
  } else {
    widget.onclick = null;
    widget.style.cursor = '';
    if (pillLabel) pillLabel.classList.remove('clickable');
  }

  // Auto-size pill width and hover-pause only for error/warning states
  if (newState === 'error' || newState === 'warning') {
    autoSizePill();
    startFlashHoverTracking();
  } else {
    if (!widget.classList.contains('shift-expanded')) widget.style.minWidth = '';
    stopFlashHoverTracking();
  }

  var circleCancel = document.getElementById('circle-cancel');
  circleCancel.classList.toggle('visible', false);

  if (cfg.titles) {
    widget.setAttribute('title', cfg.titles.main || '');
    widget.setAttribute('aria-label', cfg.titles.main || '');
  }
}

function setAlwaysShow(val) { alwaysShow = val; }
function setShowActions(val) { showActions = val; if (!val) clearHoverActions(); }
function setShiftHeld(held) {
  var icon = document.getElementById('shift-icon');
  var widget = document.getElementById('widget');
  if (!icon || !widget) return;
  var show = held && (currentState === 'transcribing' || currentState === 'enhancing');
  if (show && !icon.classList.contains('visible')) {
    var currentWidth = widget.offsetWidth;
    widget.style.minWidth = Math.ceil(currentWidth + 18) + 'px';
  } else if (!show) {
    widget.style.minWidth = '';
  }
  icon.classList.toggle('visible', show);
  widget.classList.toggle('shift-expanded', show);
}
function setAudioLevels(levels) {
  var bars = document.querySelectorAll('.bar');
  bars.forEach(function(bar, i) {
    var h = Math.max(3, (levels[i] || 0) * 20);
    bar.style.height = h + 'px';
  });
}
var countdownTotalMs = 0;
var countdownPaused = false;
var countdownStartedAt = 0;

function startCountdown(durationMs) {
  var bar = document.getElementById('undo-bar');
  var fill = document.getElementById('countdown-fill');
  countdownTotalMs = durationMs;
  countdownPaused = false;
  countdownStartedAt = Date.now();
  bar.classList.add('visible');
  fill.style.transition = 'none';
  fill.style.width = '100%';
  fill.offsetWidth;
  fill.style.transition = 'width ' + (durationMs / 1000) + 's linear';
  fill.style.width = '0%';
}
function pauseCountdown() {
  if (countdownPaused) return;
  if (Date.now() - countdownStartedAt < 200) return;
  countdownPaused = true;
  var fill = document.getElementById('countdown-fill');
  var current = parseFloat(getComputedStyle(fill).width);
  var track = parseFloat(getComputedStyle(fill.parentElement).width);
  var pct = track > 0 ? (current / track) * 100 : 0;
  fill.style.transition = 'none';
  fill.style.width = pct + '%';
  window.electronAPI?.pauseCancelTimer();
}
function resumeCountdown() {
  if (!countdownPaused) return;
  countdownPaused = false;
  var fill = document.getElementById('countdown-fill');
  var current = parseFloat(getComputedStyle(fill).width);
  var track = parseFloat(getComputedStyle(fill.parentElement).width);
  var pct = track > 0 ? current / track : 0;
  var remainMs = Math.max(pct * countdownTotalMs, 300);
  fill.offsetWidth;
  fill.style.transition = 'width ' + (remainMs / 1000) + 's linear';
  fill.style.width = '0%';
  window.electronAPI?.resumeCancelTimer(remainMs);
}
function stopCountdown() {
  var bar = document.getElementById('undo-bar');
  var fill = document.getElementById('countdown-fill');
  countdownPaused = false;
  countdownStartedAt = 0;
  fill.style.transition = 'none';
  fill.style.width = '0%';
  bar.classList.remove('visible');
}

document.getElementById('undo-bar').addEventListener('mouseenter', function() { pauseCountdown(); });
document.getElementById('undo-bar').addEventListener('mouseleave', function() { resumeCountdown(); });

function playAttention() {
  var overlay = document.getElementById('attention-overlay');
  if (!overlay) return;
  overlay.classList.remove('active');
  void overlay.offsetWidth;
  overlay.classList.add('active');
  overlay.addEventListener('animationend', function() {
    overlay.classList.remove('active');
  }, { once: true });
}

function setPerformanceFlags(reduceAnimations, reduceEffects) {
  tpReduceAnim = reduceAnimations;
  var id = 'perf-overrides';
  var existing = document.getElementById(id);
  if (existing) existing.remove();
  var rules = [];
  if (reduceAnimations) {
    rules.push('*, *::before, *::after { animation-duration: 0s !important; animation-delay: 0s !important; transition-duration: 0s !important; transition-delay: 0s !important; }');
  }
  if (reduceEffects) {
    rules.push('*, *::before, *::after { box-shadow: none !important; text-shadow: none !important; backdrop-filter: none !important; -webkit-backdrop-filter: none !important; filter: none !important; }');
    rules.push('.bar { box-shadow: none !important; }');
    rules.push('.dot { box-shadow: none !important; }');
  }
  if (rules.length > 0) {
    var style = document.createElement('style');
    style.id = id;
    style.textContent = rules.join(' ');
    document.head.appendChild(style);
  }
}

// --- Text Panel ---
var tpPanel = document.getElementById('text-panel');
var tpScroll = document.getElementById('tp-scroll');
var tpContent = document.getElementById('text-content');
var tpMic = document.getElementById('tp-mic');
var tpPen = document.getElementById('tp-pen');
var tpRestore = document.getElementById('tp-restore');
var tpTypingTimer = null;
var tpLastText = '';
var tpReduceAnim = false;
var tpUserScrolled = false;
var tpSessionDismissed = false;
var tpFlyingOut = false;
var tpSavedText = '';

tpScroll.addEventListener('scroll', function() {
  var atBottom = tpScroll.scrollHeight - tpScroll.scrollTop - tpScroll.clientHeight < 12;
  tpUserScrolled = !atBottom;
});

var tpScrollPending = false;
function tpScrollToBottom() {
  if (tpUserScrolled) return;
  if (tpScrollPending) return;
  tpScrollPending = true;
  requestAnimationFrame(function() {
    tpScrollPending = false;
    tpScroll.scrollTop = tpScroll.scrollHeight;
  });
}

function showTextPanel(text) {
  clearTextPanelTimers();
  tpLastText = text;
  tpUserScrolled = false;
  tpContent.innerHTML = '';
  tpContent.classList.remove('enhancing');
  tpMic.className = 'tp-mic hidden';
  tpPen.className = tpReduceAnim ? 'tp-pen no-anim' : 'tp-pen';
  tpContent.appendChild(tpPen);
  document.documentElement.style.height = '${getExpandedWinHeight()}px';
  document.body.style.height = '${getExpandedWinHeight()}px';
  document.body.style.overflow = 'visible';
  document.body.style.alignItems = 'flex-start';
  document.body.style.paddingTop = '${(WIN_HEIGHT - CIRCLE_SIZE) / 2}px';
  tpPanel.style.animation = '';
  tpPanel.className = 'text-panel visible';
  var words = text.split(/\\s+/).filter(function(w) { return w.length > 0; });
  function addWordCC(idx) {
    if (idx >= words.length) return;
    var span = document.createElement('span');
    span.className = tpReduceAnim ? 'word' : 'word appearing';
    span.textContent = words[idx] + ' ';
    tpContent.insertBefore(span, tpPen);
    tpScrollToBottom();
    tpTypingTimer = setTimeout(function() { addWordCC(idx + 1); }, 60);
  }
  addWordCC(0);
  updatePreviewToggleState();
}

var tpSwapTimer = null;

function updateTextPanel(text) {
  if (text === tpLastText) return;
  if (tpTypingTimer) { clearTimeout(tpTypingTimer); tpTypingTimer = null; }
  if (tpSwapTimer) { clearTimeout(tpSwapTimer); tpSwapTimer = null; }
  var prevWordCount = tpLastText.split(/\\s+/).filter(function(w) { return w.length > 0; }).length;
  tpLastText = text;
  var newWords = text.split(/\\s+/).filter(function(w) { return w.length > 0; });
  var wordsToAdd = newWords.slice(prevWordCount);
  if (wordsToAdd.length === 0) return;
  function addNextCC(idx) {
    if (idx >= wordsToAdd.length) return;
    var span = document.createElement('span');
    span.className = tpReduceAnim ? 'word' : 'word appearing';
    span.textContent = wordsToAdd[idx] + ' ';
    tpContent.insertBefore(span, tpPen);
    tpScrollToBottom();
    tpTypingTimer = setTimeout(function() { addNextCC(idx + 1); }, 60);
  }
  addNextCC(0);
}

var tpShuffleTimer = null;

function startEnhancingEffect() {
  tpMic.className = 'tp-mic hidden';
  tpPen.className = 'tp-pen hidden';
  tpPanel.classList.add('morph-border');
  tpContent.classList.add('enhancing');
  if (!tpReduceAnim) {
    var wordEls = tpContent.querySelectorAll('.word');
    var idx = 0;
    function addShuffleNext() {
      if (idx >= wordEls.length) return;
      wordEls[idx].classList.add('shuffling');
      wordEls[idx].style.animationDelay = (Math.random() * 0.6).toFixed(2) + 's';
      idx++;
      tpShuffleTimer = setTimeout(addShuffleNext, 30);
    }
    addShuffleNext();
  }
}

function stopEnhancingEffect() {
  if (tpShuffleTimer) { clearTimeout(tpShuffleTimer); tpShuffleTimer = null; }
  tpContent.classList.remove('enhancing');
  tpContent.querySelectorAll('.word.shuffling').forEach(function(w) {
    w.classList.remove('shuffling');
    w.style.animationDelay = '';
  });
  tpPanel.classList.remove('morph-border');
}

function hideTextPanel() {
  var flyingOut = tpFlyingOut;
  tpFlyingOut = false;
  tpPanel.style.animation = '';
  tpPanel.style.transition = '';
  tpPanel.style.pointerEvents = '';
  if (!flyingOut) {
    tpPanel.style.opacity = '';
    tpPanel.style.transform = '';
  }
  if (tpTypingTimer) { clearTimeout(tpTypingTimer); tpTypingTimer = null; }
  tpSavedText = tpLastText;
  tpLastText = '';
  tpUserScrolled = false;
  if (!tpSessionDismissed) {
    hideRestoreBtn();
  }
  doHideTextPanel(flyingOut);
}

function showTextPanelImmediate(text) {
  if (tpTypingTimer) { clearTimeout(tpTypingTimer); tpTypingTimer = null; }
  tpLastText = text;
  tpUserScrolled = false;
  tpPanel.style.animation = '';
  tpPanel.style.transition = '';
  tpPanel.style.opacity = '';
  tpPanel.style.transform = '';
  tpPanel.style.pointerEvents = '';
  tpPanel.className = 'text-panel visible';
  tpContent.innerHTML = '';
  tpContent.classList.remove('enhancing');
  tpMic.className = 'tp-mic hidden';
  tpPen.className = tpReduceAnim ? 'tp-pen no-anim' : 'tp-pen';
  tpContent.appendChild(tpPen);
  // Show all words instantly without animation
  var words = text.split(/\\s+/).filter(function(w) { return w.length > 0; });
  for (var i = 0; i < words.length; i++) {
    var span = document.createElement('span');
    span.className = 'word';
    span.textContent = words[i] + ' ';
    tpContent.insertBefore(span, tpPen);
  }
  document.documentElement.style.height = '${getExpandedWinHeight()}px';
  document.body.style.height = '${getExpandedWinHeight()}px';
  document.body.style.overflow = 'visible';
  document.body.style.alignItems = 'flex-start';
  document.body.style.paddingTop = '${(WIN_HEIGHT - CIRCLE_SIZE) / 2}px';
  requestAnimationFrame(function() { tpScroll.scrollTop = tpScroll.scrollHeight; });
  updatePreviewToggleState();
}

function showRestoreBtn() {
  tpRestore.classList.add('visible');
  widget.style.overflow = 'visible';
}
function hideRestoreBtn() {
  tpRestore.classList.remove('visible');
  widget.style.overflow = '';
}
function updatePreviewToggleState() {
  // Toggle button is always visible during recording states
  var isRecordingState = currentState === 'listening' || currentState === 'transcribing' || currentState === 'enhancing';
  var panelVisible = tpPanel.classList.contains('visible');

  if (isRecordingState) {
    tpRestore.classList.add('visible');
    widget.style.overflow = 'visible';
    // Active state when panel is visible, inactive when hidden
    if (panelVisible) {
      tpRestore.classList.add('active');
    } else {
      tpRestore.classList.remove('active');
    }
  } else {
    hideRestoreBtn();
  }
}
function hideRestoreBtn() {
  tpRestore.classList.remove('visible');
  widget.style.overflow = '';
}
function resetSessionState() {
  tpSessionDismissed = false;
  hideRestoreBtn();
}
function tpDismissForSession() {
  if (!tpPanel.classList.contains('visible') || tpPanel.classList.contains('hiding')) return;
  tpSessionDismissed = true;
  tpPanel.classList.remove('visible');
  tpPanel.classList.add('hiding');
  updatePreviewToggleState();
  setTimeout(function() { window.electronAPI?.closePreview(); }, 180);
}
function tpRestoreForSession() {
  tpSessionDismissed = false;
  window.electronAPI?.restorePreview();
}
function tpTogglePreview() {
  var panelVisible = tpPanel.classList.contains('visible');
  if (panelVisible) {
    // Hide preview
    tpDismissForSession();
  } else {
    // Show preview
    tpRestoreForSession();
  }
}
// Called by main process when restoring with existing text
function restoreTextPanel(text) {
  if (tpTypingTimer) { clearTimeout(tpTypingTimer); tpTypingTimer = null; }
  tpLastText = text || '';
  tpUserScrolled = false;
  tpPanel.style.animation = '';
  tpPanel.style.transition = '';
  tpPanel.style.opacity = '';
  tpPanel.style.transform = '';
  tpPanel.style.pointerEvents = '';
  tpPanel.className = 'text-panel visible';
  tpContent.innerHTML = '';
  tpContent.classList.remove('enhancing');
  tpMic.className = 'tp-mic hidden';
  tpPen.className = tpReduceAnim ? 'tp-pen no-anim' : 'tp-pen';
  tpContent.appendChild(tpPen);
  if (text && text.length > 0) {
    var words = text.split(/\\s+/).filter(function(w) { return w.length > 0; });
    for (var i = 0; i < words.length; i++) {
      var span = document.createElement('span');
      span.className = 'word';
      span.textContent = words[i] + ' ';
      tpContent.insertBefore(span, tpPen);
    }
  }
  document.documentElement.style.height = '${getExpandedWinHeight()}px';
  document.body.style.height = '${getExpandedWinHeight()}px';
  document.body.style.overflow = 'visible';
  document.body.style.alignItems = 'flex-start';
  document.body.style.paddingTop = '${(WIN_HEIGHT - CIRCLE_SIZE) / 2}px';
  requestAnimationFrame(function() { tpScroll.scrollTop = tpScroll.scrollHeight; });
  updatePreviewToggleState();
}

function doHideTextPanel(skipAnim) {
  clearTextPanelTimers();
  stopEnhancingEffect();
  var wasHiding = skipAnim || tpPanel.classList.contains('hiding');
  tpPanel.classList.remove('visible', 'morph-border');
  if (!wasHiding) {
    tpPanel.classList.add('hiding');
  }
  setTimeout(function() {
    tpPanel.className = 'text-panel';
    tpPanel.style.opacity = '';
    tpPanel.style.transform = '';
    tpContent.innerHTML = '';
    tpContent.classList.remove('enhancing');
    tpMic.className = 'tp-mic hidden';
    tpPen.className = 'tp-pen hidden';
    tpContent.appendChild(tpPen);
    document.documentElement.style.height = '${WIN_HEIGHT}px';
    document.body.style.height = '${WIN_HEIGHT}px';
    document.body.style.overflow = 'hidden';
    document.body.style.alignItems = 'center';
    document.body.style.paddingTop = '0';
  }, wasHiding ? 0 : 200);
}

// Drag-to-dismiss on text panel
tpPanel.addEventListener('mousedown', function(e) {
  if (e.target.closest('.tp-close')) return;
  if (!tpPanel.classList.contains('visible') || tpPanel.classList.contains('hiding')) return;
  var startY = e.clientY;
  var panelDragging = false;
  // Lock current animated state so we can cancel tpAppear without a visual jump
  var cs = getComputedStyle(tpPanel);
  tpPanel.style.opacity = cs.opacity;
  tpPanel.style.transform = cs.transform;
  tpPanel.style.animation = 'none';

  function onPanelMove(ev) {
    var dy = ev.clientY - startY;
    if (!panelDragging && Math.abs(dy) > 3) {
      panelDragging = true;
      tpPanel.style.cursor = 'grabbing';
    }
    if (!panelDragging) return;
    var rawDy = Math.min(0, dy);
    var panelH = tpPanel.offsetHeight || 74;
    var progress = Math.min(1, Math.abs(rawDy) / panelH);
    // Stronger fade - cubic easing for more dramatic effect
    var fadeOpacity = Math.max(0, 1 - Math.pow(progress, 1.5));
    tpPanel.style.transition = 'none';
    tpPanel.style.transform = 'translateY(' + rawDy + 'px) scale(' + (1 - progress * 0.1) + ')';
    tpPanel.style.opacity = String(fadeOpacity.toFixed(3));
  }

  function onPanelUp(ev) {
    document.removeEventListener('mousemove', onPanelMove);
    document.removeEventListener('mouseup', onPanelUp);
    tpPanel.style.cursor = '';
    if (!panelDragging) {
      tpPanel.style.opacity = '';
      tpPanel.style.transform = '';
      tpPanel.style.animation = '';
      return;
    }
    panelDragging = false;
    var dy = ev.clientY - startY;
    var panelH = tpPanel.offsetHeight || 74;
    if (dy < -(panelH * 0.9)) {
      tpFlyingOut = true;
      tpSessionDismissed = true;
      showRestoreBtn();
      updatePreviewToggleState();
      tpPanel.style.transition = 'opacity 0.25s cubic-bezier(0.4, 0, 1, 1), transform 0.25s cubic-bezier(0.4, 0, 1, 1)';
      tpPanel.style.opacity = '0';
      tpPanel.style.transform = 'translateY(-' + (panelH + 20) + 'px)';
      setTimeout(function() { window.electronAPI?.closePreview(); }, 280);
    } else {
      tpPanel.style.transition = 'opacity 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)';
      tpPanel.style.opacity = '1';
      tpPanel.style.transform = 'translateY(0)';
      setTimeout(function() {
        tpPanel.style.transition = '';
        tpPanel.style.opacity = '';
        tpPanel.style.transform = '';
        tpPanel.style.animation = '';
      }, 220);
    }
  }

  document.addEventListener('mousemove', onPanelMove);
  document.addEventListener('mouseup', onPanelUp);
});

function clearTextPanelTimers() {
  if (tpTypingTimer) { clearTimeout(tpTypingTimer); tpTypingTimer = null; }
  if (tpShuffleTimer) { clearTimeout(tpShuffleTimer); tpShuffleTimer = null; }
  if (tpSwapTimer) { clearTimeout(tpSwapTimer); tpSwapTimer = null; }
}
</script>
</body></html>`;
}


interface PillModeConfig {
  color: string;
  icon: "spinner" | "waveform" | "dot" | "x-icon";
  showLabel: boolean;
  showCancel: boolean;
  showStop: boolean;
  showCopy?: boolean;
  copyText?: string;
  animation: "none" | "pulse" | "glow";
  labelText: string;
  barColor?: string;
  barShadow?: string;
}

const INDICATOR_KEYS: Record<string, string> = {
  initializing: "indicator.initializing",
  listening: "indicator.listening",
  transcribing: "indicator.transcribing",
  enhancing: "indicator.enhancing",
  error: "indicator.nothingHeard",
  canceled: "indicator.canceled",
  warning: "notification.insertFailed",
};

const PILL_MODES: Record<string, Omit<PillModeConfig, "labelText">> = {
  initializing: { color: "#888888", icon: "spinner", showLabel: false, showCancel: true, showStop: false, animation: "none" },
  listening:    { color: "#ff4444", icon: "waveform", showLabel: false, showCancel: true, showStop: true, animation: "none", barColor: "rgba(255,68,68,0.85)", barShadow: "0 0 4px rgba(255,68,68,0.5)" },
  transcribing: { color: "#ffaa00", icon: "dot", showLabel: true, showCancel: true, showStop: false, animation: "pulse" },
  enhancing:    { color: "#44aaff", icon: "dot", showLabel: true, showCancel: true, showStop: false, animation: "pulse" },
  error:        { color: "#fbbf24", icon: "x-icon", showLabel: true, showCancel: false, showStop: false, animation: "glow" },
  canceled:     { color: "#fbbf24", icon: "x-icon", showLabel: true, showCancel: false, showStop: false, animation: "glow" },
  warning:      { color: "#fbbf24", icon: "x-icon", showLabel: true, showCancel: false, showStop: false, animation: "glow" },
};

export class HudWindow {
  private window: BrowserWindow | null = null;
  private contentReady = false;
  private pendingUpdate: { state: HudState } | null = null;
  private currentState: HudState = "idle";
  private alwaysShow = false;
  private showOnHover = false;
  private position: WidgetPosition = "bottom-center";
  private customX = 0.5;
  private customY = 0.9;
  private targetDisplayId: number | null = null;
  private hoverTimer: ReturnType<typeof setInterval> | null = null;
  private flashTimer: ReturnType<typeof setTimeout> | null = null;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  private reduceAnimations = false;
  private reduceVisualEffects = false;
  private flashStartedAt = 0;
  private flashDurationMs = 0;
  private flashPausedAt: number | null = null;
  private flashRemainingMs = 0;
  private pendingAttention = false;
  private textPanelVisible = false;
  private textPanelResizeTimer: ReturnType<typeof setTimeout> | null = null;
  private isLight = false;
  private invertColors = false;
  private themeListener: (() => void) | null = null;

  show(alwaysShow: boolean, showOnHover: boolean, position: WidgetPosition = "bottom-center"): void {
    const wasOff = !this.alwaysShow;
    const positionChanged = this.position !== position;
    this.alwaysShow = alwaysShow;
    this.showOnHover = showOnHover;
    this.position = position;

    if (this.window && !this.window.isDestroyed()) {
      if (positionChanged) this.positionWindow();
      this.execJs(`setAlwaysShow(${alwaysShow})`);
      if (!alwaysShow) {
        this.stopHoverTracking();
        if (this.currentState === "idle") {
          this.window.hide();
        }
      } else if (!showOnHover) {
        this.stopHoverTracking();
        this.execSetScale(1.0);
        this.resetIconCrossfade();
        this.window.showInactive();
        if (wasOff) this.playAttentionAnimation();
      } else {
        this.startHoverTracking();
        if (wasOff) this.playAttentionAnimation();
      }
      return;
    }

    this.contentReady = false;
    if (alwaysShow) {
      this.pendingAttention = true;
    }

    this.window = new BrowserWindow({
      width: WIN_WIDTH,
      height: WIN_HEIGHT,
      frame: false,
      transparent: true,
      hasShadow: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      focusable: false,
      ...display.hudWindowOptions,
      acceptFirstMouse: true,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: require.resolve("../preload/index.js"),
      },
    });

    this.window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    this.window.setIgnoreMouseEvents(true, { forward: true });

    this.positionWindow();

    this.window.on("focus", () => {
      if (this.window) this.window.blur();
    });

    this.window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(buildHudHtml())}`);

    this.window.webContents.on("did-finish-load", () => {
      this.contentReady = true;
      this.applyTheme();
      this.execJs(`setAlwaysShow(${this.alwaysShow})`);
      this.sendTitles();
      this.execJs(`setPerformanceFlags(${this.reduceAnimations}, ${this.reduceVisualEffects})`);
      if (this.pendingAttention) {
        this.pendingAttention = false;
        this.playAttentionAnimation();
      }
      if (this.pendingUpdate) {
        this.execSetState(this.pendingUpdate.state);
        this.pendingUpdate = null;
      }
    });

    this.themeListener = () => { this.applyTheme(); };
    nativeTheme.on("updated", this.themeListener);

    this.window.once("ready-to-show", () => {
      if (!alwaysShow) {
        // Recording-only mode: stay hidden until recording starts
        return;
      }
      if (!showOnHover) {
        this.window?.showInactive();
      } else {
        this.startHoverTracking();
      }
    });
  }

  hide(): void {
    this.stopHoverTracking();
    this.clearFlashTimer();
    this.clearHideTimer();
    if (this.textPanelResizeTimer) {
      clearTimeout(this.textPanelResizeTimer);
      this.textPanelResizeTimer = null;
    }
    this.textPanelVisible = false;
    if (this.themeListener) {
      nativeTheme.off("updated", this.themeListener);
      this.themeListener = null;
    }
    if (this.window && !this.window.isDestroyed()) {
      this.window.destroy();
    }
    this.window = null;
    this.contentReady = false;
    this.pendingAttention = false;
    this.pendingUpdate = null;
    this.currentState = "idle";
  }

  setState(state: HudState, customLabel?: string, suppressFlash = false): void {
    this.clearFlashTimer();
    this.clearHideTimer();
    this.currentState = state;

    if (!this.window || this.window.isDestroyed()) {
      if (state !== "idle") {
        // Create window for recording states regardless of alwaysShow
        this.show(false, false, this.position);
      }
      if (!this.window || this.window.isDestroyed()) return;
    }

    // Show window if hidden (recording-only mode starts recording)
    if (state !== "idle") {
      this.window.showInactive();
      this.execSetScale(1.0);
    }

    if ((state === "error" || state === "canceled" || state === "warning") && !suppressFlash) {
      const delay = state === "warning" ? 5000 : state === "error" ? 3000 : 1500;
      this.flashStartedAt = Date.now();
      this.flashDurationMs = delay;
      this.flashRemainingMs = delay;
      this.flashPausedAt = null;
      const ft = setTimeout(() => {
        this.flashTimer = null;
        this.currentState = "idle";
        if (this.contentReady && this.window && !this.window.isDestroyed()) {
          if (!this.alwaysShow) {
            this.execSetState("idle");
            this.window.hide();
          } else {
            this.execSetState("idle");
            if (this.showOnHover) {
              this.startHoverTracking();
            }
          }
        }
      }, delay);
      ft.unref();
      this.flashTimer = ft;
    }

    if (state === "idle" && !this.alwaysShow) {
      if (this.contentReady) this.execSetState("idle");
      this.window.hide();
      return;
    }

    if (this.contentReady) {
      this.execSetState(state, customLabel);
    } else {
      this.pendingUpdate = { state };
    }

    if (this.showOnHover && state !== "idle") {
      this.stopHoverTracking();
      this.window.showInactive();
      this.execSetScale(1.0);
    }

    if (this.showOnHover && state === "idle" && this.alwaysShow) {
      this.startHoverTracking();
    }
  }

  sendAudioLevels(levels: number[]): void {
    if (!this.window || this.window.isDestroyed() || !this.contentReady) return;
    this.execJs(`setAudioLevels(${JSON.stringify(levels)})`);
  }

  showError(_durationMs = 3000, customText?: string): void {
    this.setState("error", customText);
  }

  showCanceled(): void {
    this.setState("canceled");
  }

  showWarning(customText?: string): void {
    this.setState("warning", customText);
  }

  showTextPanelEmpty(): void {
    if (!this.window || this.window.isDestroyed() || !this.contentReady) return;
    if (this.textPanelResizeTimer) {
      clearTimeout(this.textPanelResizeTimer);
      this.textPanelResizeTimer = null;
    }
    this.textPanelVisible = true;
    const expandedW = getExpandedWinWidth();
    const panelW = getPreviewPanelWidth();
    const bounds = this.window.getBounds();
    const centerX = bounds.x + bounds.width / 2;
    this.window.setBounds({
      x: clampX(Math.round(centerX - expandedW / 2), expandedW),
      y: bounds.y,
      width: expandedW,
      height: getExpandedWinHeight(),
    });
    this.execJs(`showTextPanel(''); tpPanel.style.width = '${panelW}px'`);
  }

  updateTextPanel(text: string): void {
    if (!this.window || this.window.isDestroyed() || !this.contentReady) return;
    const escaped = JSON.stringify(text);
    this.execJs(`updateTextPanel(${escaped})`);
  }

  showTextPanel(text: string): void {
    if (!this.window || this.window.isDestroyed() || !this.contentReady) return;
    if (this.textPanelResizeTimer) {
      clearTimeout(this.textPanelResizeTimer);
      this.textPanelResizeTimer = null;
    }
    this.textPanelVisible = true;
    const expandedW = getExpandedWinWidth();
    const panelW = getPreviewPanelWidth();
    const bounds = this.window.getBounds();
    const centerX = bounds.x + bounds.width / 2;
    this.window.setBounds({
      x: clampX(Math.round(centerX - expandedW / 2), expandedW),
      y: bounds.y,
      width: expandedW,
      height: getExpandedWinHeight(),
    });
    const escaped = JSON.stringify(text);
    this.execJs(`tpPanel.style.width = '${panelW}px'; showTextPanel(${escaped})`);
  }

  startEnhancingEffect(): void {
    this.execJs("startEnhancingEffect()");
  }

  stopEnhancingEffect(): void {
    this.execJs("stopEnhancingEffect()");
  }

  resetPreviewSession(): void {
    if (!this.window || this.window.isDestroyed() || !this.contentReady) return;
    this.execJs(`resetSessionState()`);
  }

  restoreTextPanel(text: string): void {
    if (!this.window || this.window.isDestroyed() || !this.contentReady) return;
    this.textPanelVisible = true;
    const expandedW = getExpandedWinWidth();
    const panelW = getPreviewPanelWidth();
    const bounds = this.window.getBounds();
    const centerX = bounds.x + bounds.width / 2;
    this.window.setBounds({
      x: clampX(Math.round(centerX - expandedW / 2), expandedW),
      y: bounds.y,
      width: expandedW,
      height: getExpandedWinHeight(),
    });
    const escaped = JSON.stringify(text);
    this.execJs(`tpPanel.style.width = '${panelW}px'; restoreTextPanel(${escaped})`);
  }

  hideTextPanel(): void {
    if (!this.window || this.window.isDestroyed() || !this.contentReady) return;
    if (!this.textPanelVisible) return;
    this.textPanelVisible = false;
    this.execJs(`hideTextPanel()`);
    if (this.textPanelResizeTimer) {
      clearTimeout(this.textPanelResizeTimer);
    }
    this.textPanelResizeTimer = setTimeout(() => {
      this.textPanelResizeTimer = null;
      if (!this.window || this.window.isDestroyed()) return;
      const bounds = this.window.getBounds();
      const centerX = bounds.x + bounds.width / 2;
      this.window.setBounds({
        x: Math.round(centerX - WIN_WIDTH / 2),
        y: bounds.y,
        width: WIN_WIDTH,
        height: WIN_HEIGHT,
      });
    }, 220);
  }

  pauseFlashTimer(): void {
    if (!this.flashTimer) return;
    clearTimeout(this.flashTimer);
    this.flashTimer = null;
    const elapsed = Date.now() - this.flashStartedAt;
    this.flashRemainingMs = Math.max(this.flashDurationMs - elapsed, 300);
    this.flashPausedAt = Date.now();
  }

  resumeFlashTimer(): void {
    if (!this.flashPausedAt || this.flashRemainingMs <= 0) return;
    const remain = this.flashRemainingMs;
    this.flashPausedAt = null;
    this.flashStartedAt = Date.now();
    this.flashDurationMs = remain;
    this.flashRemainingMs = remain;
    const ft = setTimeout(() => {
      this.flashTimer = null;
      this.currentState = "idle";
      if (this.contentReady && this.window && !this.window.isDestroyed()) {
        if (!this.alwaysShow) {
          this.execSetState("idle");
          this.window.hide();
        } else {
          this.execSetState("idle");
          if (this.showOnHover) {
            this.startHoverTracking();
          }
        }
      }
    }, remain);
    ft.unref();
    this.flashTimer = ft;
  }

  showUndoBar(durationMs = 3000): void {
    const undoLabel = t("indicator.undo");
    this.execJs(`document.getElementById('undo-label').textContent = ${JSON.stringify(undoLabel)}`);
    this.execJs(`startCountdown(${durationMs})`);
  }

  hideUndoBar(): void {
    this.execJs(`stopCountdown()`);
  }

  isVisible(): boolean {
    return this.window !== null && !this.window.isDestroyed() && this.window.isVisible();
  }

  isTextPanelVisible(): boolean {
    return this.textPanelVisible;
  }

  getState(): HudState {
    return this.currentState;
  }

  getAlwaysShow(): boolean {
    return this.alwaysShow;
  }

  private positionWindow(): void {
    if (!this.window || this.window.isDestroyed()) return;
    const display = this.targetDisplayId !== null
      ? screen.getAllDisplays().find(d => d.id === this.targetDisplayId) ?? screen.getPrimaryDisplay()
      : screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
    const workArea = display.workArea;

    if (this.position === "custom") {
      const x = Math.round(display.bounds.x + display.bounds.width * this.customX - WIN_WIDTH / 2);
      const y = Math.round(display.bounds.y + display.bounds.height * this.customY - WIN_HEIGHT / 2);
      this.window.setPosition(x, y);
      return;
    }

    const parts = this.position.split("-");
    const vPos = parts[0] || "bottom";
    const hPos = parts[1] || "center";

    let x: number;
    if (hPos === "left") {
      x = workArea.x + DOCK_MARGIN;
    } else if (hPos === "right") {
      x = workArea.x + workArea.width - WIN_WIDTH - DOCK_MARGIN;
    } else {
      x = Math.round(workArea.x + workArea.width / 2 - WIN_WIDTH / 2);
    }
    const y = vPos === "top"
      ? workArea.y + DOCK_MARGIN * 2
      : vPos === "center"
      ? Math.round(workArea.y + workArea.height / 2 - WIN_HEIGHT / 2)
      : workArea.y + workArea.height - WIN_HEIGHT - DOCK_MARGIN * 2;
    this.window.setPosition(x, y);
  }

  private sendTitles(): void {
    if (!this.window || this.window.isDestroyed() || !this.contentReady) return;
    this.execSetState(this.currentState);
  }

  private execSetState(state: HudState, customLabel?: string): void {
    if (!this.window || this.window.isDestroyed()) return;

    const titleKey = state === "idle" ? "hud.startRecording"
      : state === "listening" ? "hud.stopRecording"
      : INDICATOR_KEYS[state] || "indicator.transcribing";
    const titles = {
      main: t(titleKey),
      cancel: t("hud.cancelRecording"),
    };

    let mode: PillModeConfig | null = null;
    if (state !== "idle") {
      const base = PILL_MODES[state] || PILL_MODES.initializing;
      const labelText = customLabel ?? t(INDICATOR_KEYS[state] || "indicator.transcribing");
      mode = { ...base, labelText };
      if (state === "warning") {
        mode = { ...mode, showCopy: true, copyText: t("notification.copyLatest") };
      }
      if (this.reduceAnimations && state === "listening") {
        mode = { ...mode, icon: "dot", showLabel: true, animation: "none" };
      }
    }

    const cfg = JSON.stringify({ titles, mode });
    this.execJs(`setState("${state}", ${cfg})`);
  }

  private clearFlashTimer(): void {
    if (this.flashTimer) {
      clearTimeout(this.flashTimer);
      this.flashTimer = null;
    }
  }

  private clearHideTimer(): void {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  }

  private execSetScale(factor: number): void {
    if (!this.window || this.window.isDestroyed() || !this.contentReady) return;
    this.execJs(`setScale(${factor})`);
  }

  private execJs(code: string): void {
    if (!this.window || this.window.isDestroyed() || !this.contentReady) return;
    this.window.webContents.executeJavaScript(code).catch(() => {});
  }

  private startHoverTracking(): void {
    this.stopHoverTracking();
    if (!this.window || this.window.isDestroyed()) return;
    this.window.showInactive();
    this.execSetScale(MIN_SCALE);
    const timer = setInterval(() => {
      if (!this.window || this.window.isDestroyed()) return;
      if (this.currentState !== "idle") {
        this.execSetScale(1.0);
        return;
      }
      const cursor = screen.getCursorScreenPoint();
      const [wx, wy] = this.window!.getPosition();
      const hudCenterX = wx + WIN_WIDTH / 2;
      const hudCenterY = wy + WIN_HEIGHT / 2;
      const dist = Math.hypot(cursor.x - hudCenterX, cursor.y - hudCenterY);
      let scale: number;
      if (dist < 40) {
        scale = 1.0;
      } else if (dist > 200) {
        scale = MIN_SCALE;
      } else {
        scale = 1.0 - (dist - 40) / 160 * (1.0 - MIN_SCALE);
      }
      this.execSetScale(scale);
    }, 50);
    timer.unref();
    this.hoverTimer = timer;
  }

  private stopHoverTracking(): void {
    if (this.hoverTimer) {
      clearInterval(this.hoverTimer);
      this.hoverTimer = null;
    }
  }

  private resetIconCrossfade(): void {
    this.execJs(
      `document.getElementById('v-logo').classList.remove('off');` +
      `document.getElementById('mic-icon').classList.add('off');` +
      `setBlur(0)`
    );
  }

  setCustomPosition(x: number, y: number): void {
    this.customX = x;
    this.customY = y;
    this.position = "custom";
    this.positionWindow();
  }

  setTargetDisplay(id: number | null): void {
    const changed = this.targetDisplayId !== id;
    this.targetDisplayId = id;
    if (changed) this.positionWindow();
  }

  getTargetDisplay(): number | null {
    return this.targetDisplayId;
  }

  setPosition(nx: number, ny: number): void {
    this.customX = nx;
    this.customY = ny;
    this.position = "custom";
    this.positionWindow();
  }

  drag(dx: number, dy: number): void {
    if (!this.window || this.window.isDestroyed()) return;
    const [x, y] = this.window.getPosition();
    this.window.setPosition(x + dx, y + dy);
  }

  dragEnd(): { nx: number; ny: number; displayId: number | null } | null {
    if (!this.window || this.window.isDestroyed()) return null;
    const [x, y] = this.window.getPosition();
    const centerX = x + WIN_WIDTH / 2;
    const centerY = y + WIN_HEIGHT / 2;
    const display = screen.getDisplayNearestPoint({ x: centerX, y: centerY });
    this.targetDisplayId = display.id;
    const nx = (centerX - display.bounds.x) / display.bounds.width;
    const ny = (centerY - display.bounds.y) / display.bounds.height;
    this.customX = nx;
    this.customY = ny;
    this.position = "custom";
    return { nx, ny, displayId: display.id };
  }

  private applyTheme(): void {
    const systemIsLight = !nativeTheme.shouldUseDarkColors;
    this.isLight = this.invertColors ? !systemIsLight : systemIsLight;
    if (this.window && !this.window.isDestroyed()) {
      this.execJs(`document.documentElement.classList.toggle('light', ${this.isLight})`);
    }
  }

  showHighlight(): void {
    this.execJs(`document.getElementById('widget').classList.add('highlight')`);
  }

  hideHighlight(): void {
    this.execJs(`document.getElementById('widget').classList.remove('highlight')`);
  }

  reposition(): void {
    this.positionWindow();
  }

  setIgnoreMouseEvents(ignore: boolean): void {
    if (!this.window || this.window.isDestroyed()) return;
    if (ignore) {
      this.window.setIgnoreMouseEvents(true, { forward: true });
    } else {
      this.window.setIgnoreMouseEvents(false);
    }
  }

  setShowActions(show: boolean): void {
    this.execJs(`setShowActions(${show})`);
  }

  setShiftHeld(held: boolean): void {
    this.execJs(`setShiftHeld(${held})`);
  }

  setPerformanceFlags(reduceAnimations: boolean, reduceVisualEffects: boolean): void {
    this.reduceAnimations = reduceAnimations;
    this.reduceVisualEffects = reduceVisualEffects;
    this.execJs(`setPerformanceFlags(${reduceAnimations}, ${reduceVisualEffects})`);
  }

  setInvertColors(invert: boolean): void {
    this.invertColors = invert;
    this.applyTheme();
  }

  playAttentionAnimation(): void {
    if (this.showOnHover) {
      this.stopHoverTracking();
      this.execSetScale(1.0);
    }
    this.execJs("playAttention()");
    if (this.showOnHover) {
      setTimeout(() => {
        if (this.window && !this.window.isDestroyed()) {
          this.startHoverTracking();
        }
      }, 1300);
    }
  }
}
