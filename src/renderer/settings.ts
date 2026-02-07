const { ipcRenderer } = require("electron");

interface ModelInfo {
  size: string;
  info: { description: string; sizeBytes: number };
  downloaded: boolean;
}

// ---- Tab navigation ----

document.querySelectorAll<HTMLButtonElement>(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelector(".tab.active")?.classList.remove("active");
    document.querySelector(".tab-panel.active")?.classList.remove("active");
    tab.classList.add("active");
    document.getElementById(`panel-${tab.dataset.tab}`)?.classList.add("active");
  });
});

// ---- Provider field switching ----

function updateProviderFields(): void {
  const provider = (document.getElementById("llm-provider") as HTMLSelectElement).value;
  document.getElementById("fields-foundry")!.style.display = provider === "foundry" ? "" : "none";
  document.getElementById("fields-bedrock")!.style.display = provider === "bedrock" ? "" : "none";
}

document.getElementById("llm-provider")!.addEventListener("change", updateProviderFields);

// ---- Show/hide secret fields ----

function setupToggle(buttonId: string, inputId: string): void {
  document.getElementById(buttonId)?.addEventListener("click", () => {
    const input = document.getElementById(inputId) as HTMLInputElement;
    input.type = input.type === "password" ? "text" : "password";
  });
}

setupToggle("toggle-apikey", "llm-apikey");
setupToggle("toggle-access-key", "llm-access-key");
setupToggle("toggle-secret-key", "llm-secret-key");

// ---- Init ----

async function init(): Promise<void> {
  const config = await ipcRenderer.invoke("config:load");

  (document.getElementById("llm-provider") as HTMLSelectElement).value = config.llm.provider || "foundry";
  (document.getElementById("llm-endpoint") as HTMLInputElement).value = config.llm.endpoint;
  (document.getElementById("llm-apikey") as HTMLInputElement).value = config.llm.apiKey;
  (document.getElementById("llm-model") as HTMLInputElement).value = config.llm.model;
  (document.getElementById("llm-region") as HTMLInputElement).value = config.llm.region || "";
  (document.getElementById("llm-profile") as HTMLInputElement).value = config.llm.profile || "";
  (document.getElementById("llm-access-key") as HTMLInputElement).value = config.llm.accessKeyId || "";
  (document.getElementById("llm-secret-key") as HTMLInputElement).value = config.llm.secretAccessKey || "";
  (document.getElementById("llm-model-id") as HTMLInputElement).value = config.llm.modelId || "";
  (document.getElementById("shortcut-hold") as HTMLInputElement).value = config.shortcuts.hold;
  (document.getElementById("shortcut-toggle") as HTMLInputElement).value = config.shortcuts.toggle;

  // Load logo as data URL from main process (resources are in extraResources, not in the asar)
  const logoDataUrl: string = await ipcRenderer.invoke("resources:data-url", "trayIcon@8x.png");
  const logoEl = document.getElementById("header-logo") as HTMLImageElement;
  if (logoEl) logoEl.src = logoDataUrl;

  updateProviderFields();
  await loadModels(config.whisper.model);
  await refreshPermissions();
}

// ---- Model list ----

async function loadModels(selectedModel: string): Promise<void> {
  const models: ModelInfo[] = await ipcRenderer.invoke("models:list");
  const container = document.getElementById("model-list")!;
  container.innerHTML = "";

  for (const model of models) {
    const row = document.createElement("div");
    row.className = "model-row";

    const label = document.createElement("label");
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "whisper-model";
    radio.value = model.size;
    radio.checked = model.size === selectedModel;
    label.appendChild(radio);

    const nameSpan = document.createElement("span");
    nameSpan.className = "model-name";
    nameSpan.textContent = model.size;
    label.appendChild(nameSpan);

    const descSpan = document.createElement("span");
    descSpan.className = "model-desc";
    descSpan.textContent = ` — ${model.info.description}`;
    label.appendChild(descSpan);

    row.appendChild(label);

    if (model.downloaded) {
      const badge = document.createElement("span");
      badge.className = "downloaded";
      badge.textContent = "Downloaded";
      row.appendChild(badge);
    } else {
      const btn = document.createElement("button");
      btn.className = "download-btn";
      btn.textContent = "Download";
      btn.onclick = async () => {
        btn.disabled = true;
        btn.textContent = "Downloading...";
        await ipcRenderer.invoke("models:download", model.size);
        btn.textContent = "Downloaded";
        btn.className = "downloaded";
      };
      row.appendChild(btn);
    }

    container.appendChild(row);
  }
}

// ---- Save ----

document.getElementById("save-btn")!.addEventListener("click", async () => {
  const selectedModel = (document.querySelector('input[name="whisper-model"]:checked') as HTMLInputElement)?.value || "small";

  const config = {
    llm: {
      provider: (document.getElementById("llm-provider") as HTMLSelectElement).value,
      endpoint: (document.getElementById("llm-endpoint") as HTMLInputElement).value,
      apiKey: (document.getElementById("llm-apikey") as HTMLInputElement).value,
      model: (document.getElementById("llm-model") as HTMLInputElement).value,
      region: (document.getElementById("llm-region") as HTMLInputElement).value,
      profile: (document.getElementById("llm-profile") as HTMLInputElement).value,
      accessKeyId: (document.getElementById("llm-access-key") as HTMLInputElement).value,
      secretAccessKey: (document.getElementById("llm-secret-key") as HTMLInputElement).value,
      modelId: (document.getElementById("llm-model-id") as HTMLInputElement).value,
    },
    whisper: { model: selectedModel },
    shortcuts: {
      hold: (document.getElementById("shortcut-hold") as HTMLInputElement).value,
      toggle: (document.getElementById("shortcut-toggle") as HTMLInputElement).value,
    },
  };

  await ipcRenderer.invoke("config:save", config);

  const saveStatus = document.getElementById("save-status")!;
  saveStatus.textContent = "Settings saved.";
  saveStatus.classList.add("visible");
  setTimeout(() => saveStatus.classList.remove("visible"), 2000);
});

// ---- Permissions ----

async function refreshPermissions(): Promise<void> {
  const status = await ipcRenderer.invoke("permissions:status");

  const micBadge = document.getElementById("perm-mic-badge")!;
  const micBtn = document.getElementById("perm-mic-btn")!;
  if (status.microphone === "granted") {
    micBadge.textContent = "Granted";
    micBadge.className = "permission-badge granted";
    micBadge.style.display = "";
    micBtn.style.display = "none";
  } else {
    micBadge.textContent = status.microphone === "denied" ? "Denied" : "Not Granted";
    micBadge.className = "permission-badge missing";
    micBadge.style.display = "";
    micBtn.style.display = "";
  }

  const accBadge = document.getElementById("perm-acc-badge")!;
  const accBtn = document.getElementById("perm-acc-btn")!;
  if (status.accessibility) {
    accBadge.textContent = "Granted";
    accBadge.className = "permission-badge granted";
    accBadge.style.display = "";
    accBtn.style.display = "none";
  } else {
    accBadge.textContent = "Not Granted";
    accBadge.className = "permission-badge missing";
    accBadge.style.display = "";
    accBtn.style.display = "";
  }
}

document.getElementById("perm-mic-btn")!.addEventListener("click", async () => {
  const btn = document.getElementById("perm-mic-btn") as HTMLButtonElement;
  btn.disabled = true;
  btn.textContent = "Requesting...";
  await ipcRenderer.invoke("permissions:request-microphone");
  await refreshPermissions();
  btn.disabled = false;
  btn.textContent = "Grant Access";
});

document.getElementById("perm-acc-btn")!.addEventListener("click", async () => {
  await ipcRenderer.invoke("permissions:request-accessibility");
});

// Refresh permissions when switching to the permissions tab
document.querySelectorAll<HTMLButtonElement>(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    if (tab.dataset.tab === "permissions") refreshPermissions();
  });
});

// Refresh permissions when the window regains focus (e.g. returning from System Settings)
window.addEventListener("focus", () => {
  const activeTab = document.querySelector(".tab.active") as HTMLButtonElement | null;
  if (activeTab?.dataset.tab === "permissions") refreshPermissions();
});

// ---- Test ----

function setStatus(text: string, type: "info" | "success" | "error" = "info"): void {
  const statusEl = document.getElementById("status")!;
  statusEl.textContent = text;
  statusEl.className = `status-box status-${type}`;
}

document.getElementById("test-btn")!.addEventListener("click", async () => {
  const testBtn = document.getElementById("test-btn") as HTMLButtonElement;

  testBtn.disabled = true;
  setStatus("Recording for 3 seconds...", "info");

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const audioContext = new AudioContext();
    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    const source = audioContext.createMediaStreamSource(stream);
    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    const chunks: Float32Array[] = [];

    processor.onaudioprocess = (e) => {
      chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
    };
    source.connect(processor);
    processor.connect(audioContext.destination);

    await new Promise((resolve) => setTimeout(resolve, 3000));

    processor.disconnect();
    stream.getTracks().forEach((t) => t.stop());

    setStatus("Transcribing...", "info");

    const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
    const merged = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }

    const sampleRate = audioContext.sampleRate;
    audioContext.close();

    const result = await ipcRenderer.invoke("test:transcribe", {
      audioBuffer: Array.from(merged),
      sampleRate,
    });

    let output = `Whisper: ${result.rawText || "(empty)"}`;
    if (result.correctedText) {
      output += `\nLLM:     ${result.correctedText}`;
      setStatus(output, "success");
    } else if (result.llmError) {
      output += `\nLLM error: ${result.llmError}`;
      setStatus(output, "error");
    } else {
      setStatus(output, "success");
    }
  } catch (err: any) {
    setStatus(`Test failed: ${err.message}`, "error");
  } finally {
    testBtn.disabled = false;
  }
});

init();
