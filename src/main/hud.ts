import { readFileSync } from "fs";
import { getResourcePath } from "./resources";
import { BrowserWindow, screen } from "electron";
import { t } from "../shared/i18n";
import type { WidgetPosition } from "../shared/config";

const CIRCLE_SIZE = 42;
const PILL_WIDTH = 200;
const PILL_HEIGHT = 32;
const WIN_WIDTH = 320;
const WIN_HEIGHT = 100;
const DOCK_MARGIN = 24;
const MIN_SCALE = 0.55;

export type HudState = "idle" | "initializing" | "listening" | "transcribing" | "enhancing" | "error" | "canceled";


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
  :root { --state-color: #888; }
  * { margin: 0; padding: 0; box-sizing: border-box; user-select: none; -webkit-user-select: none; }
  html, body {
    background: transparent;
    overflow: hidden;
    width: ${WIN_WIDTH}px;
    height: ${WIN_HEIGHT}px;
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
    background: rgba(25, 25, 25, 0.92);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 2px 4px rgba(0,0,0,0.15), 0 4px 12px rgba(0,0,0,0.2), 0 8px 24px rgba(0,0,0,0.15);
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
                height 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                border-radius 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                background 0.3s ease,
                border-color 0.3s ease,
                box-shadow 0.25s ease;
  }
  .widget.pill.dragging { cursor: grabbing; }
  .widget.pill.listening {
    min-width: 115px;
    background: rgba(25, 25, 25, 0.92);
    border-color: rgba(255,255,255,0.1);
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
  .widget.pill.listening .pill-stop { order: 10; color: rgba(255,255,255,0.9); }
  .widget.pill.listening:active:not(.dragging) { transform: scale(0.94); }
  .widget.pill.listening:hover .pill-stop { background: rgba(255,255,255,0.15); }
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
    background: rgba(50, 50, 50, 0.95);
    border: 1px solid rgba(255,255,255,0.12);
    color: rgba(255,255,255,0.8);
  }
  .widget.pill.listening .pill-cancel:hover {
    background: rgba(239, 68, 68, 0.8);
    color: white;
  }
  .widget.pill.listening .pill-cancel:active {
    transform: translateY(-50%) scale(0.92);
  }
  .widget.pill.transcribing,
  .widget.pill.enhancing {
    background: rgba(25, 25, 25, 0.92);
    border-color: rgba(255,255,255,0.1);
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
    background: rgba(50, 50, 50, 0.95);
    border: 1px solid rgba(255,255,255,0.12);
    color: rgba(255,255,255,0.8);
  }
  .widget.pill.transcribing .pill-cancel:hover,
  .widget.pill.enhancing .pill-cancel:hover {
    background: rgba(239, 68, 68, 0.8);
    color: white;
  }
  .widget.pill.transcribing .pill-cancel:active,
  .widget.pill.enhancing .pill-cancel:active {
    transform: translateY(-50%) scale(0.92);
  }
  .widget.pill.error, .widget.pill.canceled {
    background: rgba(25, 25, 25, 0.92);
    border-color: rgba(255,255,255,0.1);
    box-shadow: 0 2px 4px rgba(0,0,0,0.15), 0 4px 12px rgba(0,0,0,0.2);
    cursor: pointer;
  }
  .widget.pill.initializing {
    min-width: 115px;
    background: rgba(25, 25, 25, 0.92);
    border-color: rgba(255,255,255,0.1);
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
  .v-logo img { width: 18px; height: 18px; object-fit: contain; }
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
    color: rgba(255,255,255,0.95);
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.1px;
    white-space: nowrap;
  }
  .pill-content.on { opacity: 1; pointer-events: auto; }
  .hidden { display: none !important; }
  .spinner {
    width: 12px; height: 12px;
    border: 2px solid rgba(255,255,255,0.2);
    border-top-color: rgba(255,255,255,0.85);
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
    background: rgba(255,255,255,0.85);
    box-shadow: 0 0 4px rgba(255,255,255,0.5);
    transition: height 0.05s ease;
  }
  .dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .x-icon { flex-shrink: 0; }
  #pill-label { flex-shrink: 0; }
  .pill-cancel {
    pointer-events: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px; height: 18px;
    border-radius: 50%;
    border: none;
    background: transparent;
    color: rgba(255,255,255,0.7);
    cursor: pointer;
    transition: background 0.2s ease, color 0.2s ease;
    flex-shrink: 0;
    margin-left: 2px;
  }
  .pill-cancel:hover { background: rgba(255,255,255,0.2); color: white; }
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

  /* ---- SATELLITE BUTTONS (hover actions) ---- */
  .hover-btn {
    position: absolute;
    width: 18px; height: 18px; border-radius: 50%;
    background: rgba(50, 50, 50, 0.95);
    border: 1px solid rgba(255,255,255,0.12);
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

  /* Positions relative to widget center (top of scale-wrapper) */
  .settings-btn { --tx: 26px; --ty: -24px; top: ${CIRCLE_SIZE / 2}px; left: 50%; margin-top: -9px; margin-left: -9px; }
  .settings-btn.visible { transition-delay: 0ms; }
  .settings-btn:hover { background: rgba(99, 102, 241, 0.8); }

  .transcriptions-btn { --tx: -26px; --ty: 20px; top: ${CIRCLE_SIZE / 2}px; left: 50%; margin-top: -9px; margin-left: -9px; transition-delay: 0ms; }
  .transcriptions-btn.visible { transition-delay: 60ms; }
  .transcriptions-btn:hover { background: rgba(99, 102, 241, 0.8); }

  .close-btn { --tx: 26px; --ty: 20px; top: ${CIRCLE_SIZE / 2}px; left: 50%; margin-top: -9px; margin-left: -9px; }
  .close-btn:hover { background: rgba(239, 68, 68, 0.8); }
  .close-btn.visible { transition-delay: 120ms; }

  /* Cancel button (below widget during idle+listening transition) */
  .circle-cancel {
    width: 22px; height: 22px; border-radius: 50%;
    background: rgba(50, 50, 50, 0.95);
    border: 1px solid rgba(255,255,255,0.12);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; flex-shrink: 0;
    transition: background 0.15s ease, opacity 0.15s ease;
    opacity: 0; pointer-events: none;
    margin-top: 6px;
  }
  .circle-cancel:hover { background: #ff4444; border-color: rgba(239,68,68,0.5); }
  .circle-cancel svg { width: 10px; height: 10px; }
  .circle-cancel.visible { opacity: 1; pointer-events: auto; }

  /* Undo bar (below widget during graceful cancel) */
  .undo-bar {
    display: flex; align-items: center; gap: 0;
    margin-top: 3px;
    opacity: 0; pointer-events: none;
    transition: opacity 0.2s ease;
    flex-shrink: 0;
    background: rgba(25, 25, 25, 0.92);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 10px;
    padding: 3px 3px 3px 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.15), 0 4px 12px rgba(0,0,0,0.2);
  }
  .undo-bar.visible { opacity: 1; pointer-events: auto; }
  .undo-bar .countdown-track {
    width: 64px; height: 2px;
    background: rgba(255,255,255,0.08);
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
    background: rgba(255,255,255,0.08);
    border: none;
    border-radius: 7px;
    color: rgba(255,255,255,0.85);
    font-size: 10px; font-weight: 500;
    padding: 2px 6px 2px 5px;
    margin-left: 6px;
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease;
    line-height: 1;
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif;
    letter-spacing: 0.1px;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .undo-bar .undo-btn:hover { background: rgba(255,255,255,0.16); color: white; }
  .undo-bar .undo-btn:active { transform: scale(0.95); }
  .undo-bar .undo-btn svg { flex-shrink: 0; }
</style></head>
<body>
<div class="scale-wrapper" id="scale-wrapper">
  <div class="widget" id="widget" role="button" tabindex="0">
    <!-- Circle mode icons -->
    <div class="circle-content" id="circle-content">
      <div class="icon v-logo" id="v-logo"><img src="${logoDataUrl}" alt="Vox" draggable="false" /></div>
      <div class="icon mic-icon off" id="mic-icon"><svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg></div>
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
      <button class="pill-cancel" id="pill-cancel" style="display:none" onclick="event.stopPropagation(); window.electronAPI?.cancelRecording()">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M8 2L2 8M2 2L8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
      </button>
    </div>

  </div>
  <!-- Satellite hover buttons (siblings of widget, inside scale-wrapper for z-index) -->
  <div class="hover-btn close-btn" id="close-btn" onclick="event.stopPropagation(); if (recentDragEnd || wasDragged) return; var sw = document.getElementById('scale-wrapper'); sw.classList.add('vanishing'); setTimeout(function() { window.electronAPI?.hudDisable(); }, 350);">
    <svg viewBox="0 0 10 10" fill="none"><path d="M2 3h6M3.5 3V2.2a.5.5 0 01.5-.5h2a.5.5 0 01.5.5V3" stroke="white" stroke-width="1.2" stroke-linecap="round"/><path d="M7.5 3.5l-.3 4.3a.8.8 0 01-.8.7h-2.8a.8.8 0 01-.8-.7L2.5 3.5" stroke="white" stroke-width="1.2" stroke-linecap="round"/></svg>
  </div>
  <div class="hover-btn transcriptions-btn" id="transcriptions-btn" onclick="event.stopPropagation(); if (recentDragEnd || wasDragged) return; window.electronAPI?.hudOpenTranscriptions()">
    <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
  </div>
  <div class="hover-btn settings-btn" id="settings-btn" onclick="event.stopPropagation(); if (recentDragEnd || wasDragged) return; window.electronAPI?.hudOpenSettings()">
    <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
  </div>
  <div class="circle-cancel" id="circle-cancel" onclick="event.stopPropagation(); window.electronAPI?.cancelRecording()">
    <svg viewBox="0 0 10 10" fill="none"><path d="M8 2L2 8M2 2L8 8" stroke="white" stroke-width="1.5" stroke-linecap="round"/></svg>
  </div>
  <div class="undo-bar" id="undo-bar">
    <div class="countdown-track"><div class="countdown-fill" id="countdown-fill"></div></div>
    <button class="undo-btn" id="undo-btn" onclick="event.stopPropagation(); window.electronAPI?.undoCancelRecording()"><svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M2 2l4 4M6 2l-4 4" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/></svg><span id="undo-label">Undo</span></button>
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

/* ---- Click-through toggling ---- */
/* Keep ignoreMouseEvents(true, {forward:true}) by default so transparent
   areas are fully click-through. Only disable ignore when the cursor
   actually enters an interactive element (widget, hover-btn, pill-cancel, circle-cancel). */
var interactiveEls = document.querySelectorAll('.widget, .hover-btn, .pill-cancel, .pill-stop, .circle-cancel, .undo-bar, .undo-btn');
var ignoreDisabled = false;
interactiveEls.forEach(function(el) {
  el.addEventListener('mouseenter', function() {
    ignoreDisabled = true;
    window.electronAPI?.setIgnoreMouseEvents(false);
  });
  el.addEventListener('mouseleave', function() {
    if (currentState !== 'idle') return;
    ignoreDisabled = false;
    window.electronAPI?.setIgnoreMouseEvents(true);
  });
});
/* Safety net: any click on the window body that didn't land on an interactive
   element should re-enable click-through immediately. */
document.addEventListener('click', function(e) {
  if (!e.target.closest('.widget, .hover-btn, .pill-cancel, .pill-stop, .circle-cancel, .undo-bar, .undo-btn')) {
    if (ignoreDisabled) {
      ignoreDisabled = false;
      window.electronAPI?.setIgnoreMouseEvents(true);
    }
  }
}, true);

/* ---- Drag handling ---- */
widget.addEventListener('mousedown', function(e) {
  if (document.getElementById('undo-bar').classList.contains('visible')) return;
  if (e.target.closest('.hover-btn') || e.target.closest('.pill-cancel') || e.target.closest('.pill-stop')) return;
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
  if (e.target.closest('.hover-btn') || e.target.closest('.pill-cancel') || e.target.closest('.pill-stop')) return;
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

  var barColor = cfg.barColor || 'rgba(255,255,255,0.85)';
  var barShadow = cfg.barShadow || '0 0 4px rgba(255,255,255,0.5)';
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
    label.classList.add('hidden');
  }

  var cb = document.getElementById('pill-cancel');
  cb.style.display = cfg.showCancel ? 'flex' : 'none';
}

/* ---- Main state setter (called from main process) ---- */
function setState(newState, cfg) {
  var prevState = currentState;
  currentState = newState;
  clearHoverActions();

  // Hide undo bar on any state change (main process controls showing it)
  stopCountdown();

  var isIdle = newState === 'idle';
  var isPill = !isIdle;
  var wasInPill = prevState !== 'idle';

  if (isIdle && wasInPill) {
    // Fade out pill content first, then morph shape after a delay
    pillContent.classList.remove('on');
    setTimeout(function() {
      if (currentState !== 'idle') return;
      widget.className = 'widget';
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

  if (isPill) {
    ignoreDisabled = true;
    window.electronAPI?.setIgnoreMouseEvents(false);
  } else if (isIdle && !isMouseOver) {
    ignoreDisabled = false;
    window.electronAPI?.setIgnoreMouseEvents(true);
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
function setAudioLevels(levels) {
  var bars = document.querySelectorAll('.bar');
  bars.forEach(function(bar, i) {
    var h = Math.max(3, (levels[i] || 0) * 20);
    bar.style.height = h + 'px';
  });
}
function startCountdown(durationMs) {
  var bar = document.getElementById('undo-bar');
  var fill = document.getElementById('countdown-fill');
  bar.classList.add('visible');
  fill.style.transition = 'none';
  fill.style.width = '100%';
  fill.offsetWidth; // force reflow
  fill.style.transition = 'width ' + (durationMs / 1000) + 's linear';
  fill.style.width = '0%';
}
function stopCountdown() {
  var bar = document.getElementById('undo-bar');
  var fill = document.getElementById('countdown-fill');
  fill.style.transition = 'none';
  fill.style.width = '0%';
  bar.classList.remove('visible');
}

function setPerformanceFlags(reduceAnimations, reduceEffects) {
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
</script>
</body></html>`;
}

interface PillModeConfig {
  color: string;
  icon: "spinner" | "waveform" | "dot" | "x-icon";
  showLabel: boolean;
  showCancel: boolean;
  showStop: boolean;
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
};

const PILL_MODES: Record<string, Omit<PillModeConfig, "labelText">> = {
  initializing: { color: "#888888", icon: "spinner", showLabel: false, showCancel: true, showStop: false, animation: "none" },
  listening:    { color: "#ff4444", icon: "waveform", showLabel: false, showCancel: true, showStop: true, animation: "none", barColor: "rgba(255,68,68,0.85)", barShadow: "0 0 4px rgba(255,68,68,0.5)" },
  transcribing: { color: "#ffaa00", icon: "dot", showLabel: true, showCancel: true, showStop: false, animation: "pulse" },
  enhancing:    { color: "#44aaff", icon: "dot", showLabel: true, showCancel: true, showStop: false, animation: "pulse" },
  error:        { color: "#fbbf24", icon: "x-icon", showLabel: true, showCancel: false, showStop: false, animation: "glow" },
  canceled:     { color: "#fbbf24", icon: "x-icon", showLabel: true, showCancel: false, showStop: false, animation: "glow" },
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

  show(alwaysShow: boolean, showOnHover: boolean, position: WidgetPosition = "bottom-center"): void {
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
      } else {
        this.startHoverTracking();
      }
      return;
    }

    this.contentReady = false;

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
      type: "panel",
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
      this.execJs(`setAlwaysShow(${this.alwaysShow})`);
      this.sendTitles();
      this.execJs(`setPerformanceFlags(${this.reduceAnimations}, ${this.reduceVisualEffects})`);
      if (this.pendingUpdate) {
        this.execSetState(this.pendingUpdate.state);
        this.pendingUpdate = null;
      }
    });

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
    if (this.window && !this.window.isDestroyed()) {
      this.window.destroy();
    }
    this.window = null;
    this.contentReady = false;
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

    if ((state === "error" || state === "canceled") && !suppressFlash) {
      const delay = state === "error" ? 3000 : 1500;
      const ft = setTimeout(() => {
        this.flashTimer = null;
        this.currentState = "idle";
        if (this.contentReady && this.window && !this.window.isDestroyed()) {
          if (!this.alwaysShow) {
            // Hide directly without morphing back to the idle circle
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

  getState(): HudState {
    return this.currentState;
  }

  getAlwaysShow(): boolean {
    return this.alwaysShow;
  }

  private positionWindow(): void {
    if (!this.window) return;
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

  setPerformanceFlags(reduceAnimations: boolean, reduceVisualEffects: boolean): void {
    this.reduceAnimations = reduceAnimations;
    this.reduceVisualEffects = reduceVisualEffects;
    this.execJs(`setPerformanceFlags(${reduceAnimations}, ${reduceVisualEffects})`);
  }
}
