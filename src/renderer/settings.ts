const { ipcRenderer } = require("electron");

interface ModelInfo {
  size: string;
  info: { description: string; sizeBytes: number };
  downloaded: boolean;
}

async function init(): Promise<void> {
  const config = await ipcRenderer.invoke("config:load");

  (document.getElementById("llm-endpoint") as HTMLInputElement).value = config.llm.endpoint;
  (document.getElementById("llm-apikey") as HTMLInputElement).value = config.llm.apiKey;
  (document.getElementById("llm-model") as HTMLInputElement).value = config.llm.model;
  (document.getElementById("shortcut-hold") as HTMLInputElement).value = config.shortcuts.hold;
  (document.getElementById("shortcut-toggle") as HTMLInputElement).value = config.shortcuts.toggle;

  await loadModels(config.whisper.model);
}

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
    label.append(` ${model.size} — ${model.info.description}`);
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
      };
      row.appendChild(btn);
    }

    container.appendChild(row);
  }
}

document.getElementById("save-btn")!.addEventListener("click", async () => {
  const selectedModel = (document.querySelector('input[name="whisper-model"]:checked') as HTMLInputElement)?.value || "small";

  const config = {
    llm: {
      provider: "foundry",
      endpoint: (document.getElementById("llm-endpoint") as HTMLInputElement).value,
      apiKey: (document.getElementById("llm-apikey") as HTMLInputElement).value,
      model: (document.getElementById("llm-model") as HTMLInputElement).value,
    },
    whisper: { model: selectedModel },
    shortcuts: {
      hold: (document.getElementById("shortcut-hold") as HTMLInputElement).value,
      toggle: (document.getElementById("shortcut-toggle") as HTMLInputElement).value,
    },
  };

  await ipcRenderer.invoke("config:save", config);
  document.getElementById("status")!.textContent = "Settings saved.";
});

init();
