import { useState, useEffect, useRef } from "react";
import type { ModelInfo } from "../../../preload/index";
import { TrashIcon, XIcon } from "../ui/icons";
import styles from "./ModelRow.module.scss";

interface ModelRowProps {
  model: ModelInfo;
  selected: boolean;
  onSelect: (size: string) => void;
  onDelete?: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1_000_000) return `${(bytes / 1_000).toFixed(0)} KB`;
  if (bytes < 1_000_000_000) return `${(bytes / 1_000_000).toFixed(0)} MB`;
  return `${(bytes / 1_000_000_000).toFixed(1)} GB`;
}

export function ModelRow({ model, selected, onSelect, onDelete }: ModelRowProps) {
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(model.downloaded);
  const [progress, setProgress] = useState({ downloaded: 0, total: 0 });
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const handler = (p: { size: string; downloaded: number; total: number }) => {
      if (p.size === model.size) {
        setProgress({ downloaded: p.downloaded, total: p.total });
      }
    };
    const cleanup = window.voxApi.models.onDownloadProgress(handler);
    return cleanup;
  }, [model.size]);

  useEffect(() => {
    return () => {
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    };
  }, []);

  const handleDownload = async () => {
    setDownloading(true);
    setProgress({ downloaded: 0, total: model.info.sizeBytes });
    try {
      await window.voxApi.models.download(model.size);
      setDownloaded(true);
    } catch {
      // Download was cancelled or failed
    } finally {
      setDownloading(false);
      setProgress({ downloaded: 0, total: 0 });
    }
  };

  const handleCancel = async () => {
    await window.voxApi.models.cancelDownload(model.size);
  };

  const handleDeleteClick = () => {
    if (confirmingDelete) {
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
      setConfirmingDelete(false);
      window.voxApi.models.delete(model.size).then(() => {
        setDownloaded(false);
        onDelete?.();
      });
    } else {
      setConfirmingDelete(true);
      confirmTimerRef.current = setTimeout(() => setConfirmingDelete(false), 3000);
    }
  };

  const percent = progress.total > 0
    ? Math.min(100, Math.round((progress.downloaded / progress.total) * 100))
    : 0;

  return (
    <div className={styles.row}>
      <label>
        <input
          type="radio"
          name="whisper-model"
          value={model.size}
          checked={selected}
          disabled={!downloaded}
          onChange={() => onSelect(model.size)}
        />
        <span className={styles.name}>{model.size}</span>
        <span className={styles.desc}>{model.info.description}</span>
      </label>
      {downloading ? (
        <div className={styles.progress}>
          <div className={styles.progressInfo}>
            <span>{percent}%</span>
            <span className={styles.progressSize}>
              {formatBytes(progress.downloaded)} / {formatBytes(progress.total)}
            </span>
          </div>
          <div className={styles.progressBarRow}>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${percent}%` }} />
            </div>
            <button
              onClick={handleCancel}
              className={styles.cancelBtn}
              title="Cancel download"
            >
              <XIcon />
            </button>
          </div>
        </div>
      ) : downloaded ? (
        <div className={styles.actions}>
          <span className={styles.downloaded}>Downloaded</span>
          {confirmingDelete ? (
            <button onClick={handleDeleteClick} className={styles.confirmDeleteBtn}>
              Confirm?
            </button>
          ) : (
            <button
              onClick={handleDeleteClick}
              className={styles.deleteBtn}
              title="Delete model"
            >
              <TrashIcon />
            </button>
          )}
        </div>
      ) : (
        <button
          onClick={handleDownload}
          disabled={downloading}
          className={styles.downloadBtn}
        >
          Download
        </button>
      )}
    </div>
  );
}
