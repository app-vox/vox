import { useState, useEffect, useRef } from "react";
import { useT } from "../../i18n-context";
import { TrashIcon, XIcon } from "../../../shared/icons";
import type { ModelInfo } from "../../../preload/index";
import styles from "./ModelSelector.module.scss";
import btn from "../shared/buttons.module.scss";

function formatBytes(bytes: number): string {
  if (bytes < 1_000_000) return `${(bytes / 1_000).toFixed(0)} KB`;
  if (bytes < 1_000_000_000) return `${(bytes / 1_000_000).toFixed(0)} MB`;
  return `${(bytes / 1_000_000_000).toFixed(1)} GB`;
}

interface ModelSelectorProps {
  models: ModelInfo[];
  selectedSize: string;
  downloading: string | null;
  progress: { downloaded: number; total: number };
  onSelect: (size: string) => void;
  onDownload: (size: string) => void;
  onCancel: () => void;
  onDelete: (size: string) => void;
  downloadDisabled?: boolean;
  recommendedSize?: string;
  className?: string;
}

export function ModelSelector({
  models, selectedSize, downloading, progress, onSelect, onDownload, onCancel, onDelete, downloadDisabled, recommendedSize, className,
}: ModelSelectorProps) {
  return (
    <div className={className}>
      {models.map((model) => (
        <ModelSelectorRow
          key={model.size}
          model={model}
          selected={selectedSize === model.size}
          isDownloading={downloading === model.size}
          progress={downloading === model.size ? progress : { downloaded: 0, total: 0 }}
          isRecommended={model.size === recommendedSize}
          onSelect={() => onSelect(model.size)}
          onDownload={() => onDownload(model.size)}
          onCancel={onCancel}
          onDelete={() => onDelete(model.size)}
          downloadDisabled={downloadDisabled}
        />
      ))}
    </div>
  );
}

interface ModelSelectorRowProps {
  model: ModelInfo;
  selected: boolean;
  isDownloading: boolean;
  progress: { downloaded: number; total: number };
  isRecommended: boolean;
  onSelect: () => void;
  onDownload: () => void;
  onCancel: () => void;
  onDelete: () => void;
  downloadDisabled?: boolean;
}

function ModelSelectorRow({
  model, selected, isDownloading, progress, isRecommended, onSelect, onDownload, onCancel, onDelete, downloadDisabled,
}: ModelSelectorRowProps) {
  const t = useT();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    return () => {
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!confirmingDelete) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (confirmBtnRef.current && !confirmBtnRef.current.contains(e.target as Node)) {
        setConfirmingDelete(false);
        if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [confirmingDelete]);

  const handleDeleteClick = () => {
    if (confirmingDelete) {
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
      setConfirmingDelete(false);
      onDelete();
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
        <input type="radio" name="model-selector" value={model.size} checked={selected} onChange={onSelect} disabled={!model.downloaded && !isDownloading} />
        <span className={styles.nameBlock}>
          <span className={styles.name}>
            {t("whisper.model." + model.size + ".label")}
            {isRecommended && (
              <span className={styles.recommendedBadge}>{t("onboarding.model.recommended")}</span>
            )}
            {" "}
            <span className={styles.desc}>{t("whisper.model." + model.size + ".description")}</span>
          </span>
          <span className={styles.technicalName}>{model.size}</span>
        </span>
      </label>
      {isDownloading ? (
        <div className={styles.progress}>
          {/* eslint-disable i18next/no-literal-string */}
          <div className={styles.progressInfo}>
            <span>{percent}%</span>
            <span className={styles.progressSize}>
              {formatBytes(progress.downloaded)} / {formatBytes(progress.total)}
            </span>
          </div>
          {/* eslint-enable i18next/no-literal-string */}
          <div className={styles.progressBarRow}>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${percent}%` }} />
            </div>
            <button onClick={onCancel} className={styles.cancelBtn} title={t("model.cancelDownload")}>
              <XIcon width={14} height={14} />
            </button>
          </div>
        </div>
      ) : model.downloaded ? (
        <div className={styles.actions}>
          <span className={styles.downloaded}>{t("model.downloaded")}</span>
          {confirmingDelete ? (
            <button ref={confirmBtnRef} onClick={handleDeleteClick} className={styles.confirmDeleteBtn}>
              {t("model.confirmDelete")}
            </button>
          ) : (
            <button onClick={handleDeleteClick} className={styles.deleteBtn} title={t("model.deleteModel")}>
              <TrashIcon width={14} height={14} />
            </button>
          )}
        </div>
      ) : (
        <button onClick={onDownload} disabled={downloadDisabled} className={`${btn.btn} ${btn.secondary} ${btn.sm}`}>
          {t("model.download")}
        </button>
      )}
    </div>
  );
}
