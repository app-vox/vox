import { app, Tray, Menu, nativeImage, Notification } from "electron";
import * as path from "path";
import { GlobalKeyboardListener } from "node-global-key-listener";
import { ConfigManager } from "./config/manager";
import { ModelManager } from "./models/manager";
import { AudioRecorder } from "./audio/recorder";
import { transcribe } from "./audio/whisper";
import { FoundryProvider } from "./llm/foundry";
import { pasteText } from "./input/paster";
import { Pipeline } from "./pipeline";
import { ShortcutStateMachine } from "./shortcuts/listener";
import { IndicatorWindow } from "./indicator";

let tray: Tray | null = null;
let pipeline: Pipeline | null = null;
let indicator: IndicatorWindow | null = null;

const configDir = path.join(app.getPath("userData"));
const modelsDir = path.join(configDir, "models");
const configManager = new ConfigManager(configDir);
const modelManager = new ModelManager(modelsDir);

function setupPipeline(): void {
  const config = configManager.load();
  const modelPath = modelManager.getModelPath(config.whisper.model);

  const llmProvider = new FoundryProvider({
    endpoint: config.llm.endpoint,
    apiKey: config.llm.apiKey,
    model: config.llm.model,
  });

  pipeline = new Pipeline({
    recorder: new AudioRecorder(),
    transcribe,
    llmProvider,
    paste: pasteText,
    modelPath,
  });
}

function setupTray(): void {
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  tray.setTitle("Vox");

  const contextMenu = Menu.buildFromTemplate([
    { label: "Settings", click: () => { /* TODO: open settings window */ } },
    { type: "separator" },
    { label: "Quit", click: () => app.quit() },
  ]);

  tray.setContextMenu(contextMenu);
}

function setupShortcuts(): void {
  indicator = new IndicatorWindow();

  const stateMachine = new ShortcutStateMachine({
    onStart: () => {
      indicator!.show("listening");
      pipeline!.startRecording().catch((err) => {
        indicator!.hide();
        new Notification({ title: "Vox", body: `Recording failed: ${err.message}` }).show();
      });
    },
    onStop: () => {
      indicator!.show("processing");
      pipeline!.stopAndProcess()
        .catch((err) => {
          new Notification({ title: "Vox", body: `Transcription failed: ${err.message}` }).show();
        })
        .finally(() => {
          indicator!.hide();
        });
    },
  });

  const keyListener = new GlobalKeyboardListener();

  keyListener.addListener((event, down) => {
    // Hold mode: Option + Space
    if (down["LEFT ALT"] && event.name === "SPACE") {
      if (event.state === "DOWN") {
        stateMachine.handleHoldKeyDown();
      } else if (event.state === "UP") {
        stateMachine.handleHoldKeyUp();
      }
    }

    // Toggle mode: Option + Shift + Space
    if (down["LEFT ALT"] && down["LEFT SHIFT"] && event.name === "SPACE" && event.state === "DOWN") {
      stateMachine.handleTogglePress();
    }
  });
}

app.whenReady().then(() => {
  app.dock?.hide(); // Hide dock icon — tray-only app

  setupPipeline();
  setupTray();
  setupShortcuts();
});

app.on("window-all-closed", () => {
  // Do nothing — keep app running as tray app
});
