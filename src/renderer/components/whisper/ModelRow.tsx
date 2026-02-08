import { useState } from "react";
import type { ModelInfo } from "../../../preload/index";

interface ModelRowProps {
  model: ModelInfo;
  selected: boolean;
  onSelect: (size: string) => void;
}

export function ModelRow({ model, selected, onSelect }: ModelRowProps) {
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(model.downloaded);

  const handleDownload = async () => {
    setDownloading(true);
    await window.voxApi.models.download(model.size);
    setDownloaded(true);
    setDownloading(false);
  };

  return (
    <div className="model-row">
      <label>
        <input
          type="radio"
          name="whisper-model"
          value={model.size}
          checked={selected}
          onChange={() => onSelect(model.size)}
        />
        <span className="model-name">{model.size}</span>
        <span className="model-desc">{model.info.description}</span>
      </label>
      {downloaded ? (
        <span className="downloaded">Downloaded</span>
      ) : (
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="download-btn"
        >
          {downloading ? "Downloading..." : "Download"}
        </button>
      )}
    </div>
  );
}
